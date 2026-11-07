import { Client } from "discord.js";
import {
  handleVoiceXp,
  deriveContinuousCreditId,
  deriveDiscontinuousCreditId,
} from "../../../../Features/levelHandler";
import ActiveVoiceSession from "../../../../Database/leveling/activeVoiceSession.model";
import { LevelConfigCache } from "../../../../Database/leveling/LevelConfigCache";
import { HoshikoLogger, LogLevel } from "../../../../Security/Logger/HoshikoLogger";
import {
  isValidSession,
  isValidVoiceStateNow,
  persistSession,
  removePersistedSession,
  sessionKey,
  withMaxTime,
} from "./voiceUtils";

export interface VoiceSessionData {
  start: number;
  originalStart: number;
  userId: string;
  guildId: string;
  channelId: string;
  token: string;
}

export interface PartialVoiceSeconds {
  seconds: number;
  seq: number;
}

export const activeSessions = new Map<string, VoiceSessionData>();
export const partialSeconds = new Map<string, PartialVoiceSeconds>();

export const SHORT_DOWNTIME_GRACE_MS = 60_000;
export const UNVERIFIED_CHECKPOINT_MAX_MS = 2 * 60 * 60_000;

let client: Client;
export function initVoiceSessionClient(c: Client): void {
  client = c;
}

/**
 * Registra el timestamp de apagado ordenado en las sesiones de voz activas (V05).
 */
export async function markVoiceSessionsShutdown(
  shutdownTime: number = Date.now(),
): Promise<void> {
  if (activeSessions.size === 0) return;
  try {
    if (typeof ActiveVoiceSession.updateMany === "function") {
      await withMaxTime(
        ActiveVoiceSession.updateMany(
          {},
          { $set: { lastShutdownAt: new Date(shutdownTime) } },
        ),
      );
    }
  } catch (error: any) {
    void HoshikoLogger.log({
      level: LogLevel.WARN,
      context: "VoiceXP/Shutdown",
      message: `No se pudo registrar lastShutdownAt en sesiones activas: ${error?.message || String(error)}`,
    });
  }
}

export interface RehydrateOptions {
  now?: number;
  lastShutdownAt?: number | Date | null;
  strictNoShutdownTimestamp?: boolean;
}

export async function rehydrateVoiceSessions(
  options: RehydrateOptions = {},
): Promise<void> {
  if (!client) return;
  const now = options.now ?? Date.now();
  const saved = (await withMaxTime<any[]>(ActiveVoiceSession.find())) || [];
  let restored = 0,
    cleaned = 0;

  for (const s of saved) {
    try {
      const guild = client.guilds.cache.get(s.guildId);
      if (!guild) {
        await withMaxTime(ActiveVoiceSession.deleteOne({ _id: s._id }));
        cleaned++;
        continue;
      }

      const voiceState = guild.voiceStates.cache.get(s.userId);
      if (
        !voiceState?.channelId ||
        voiceState.channelId !== s.channelId ||
        !isValidSession(voiceState)
      ) {
        await withMaxTime(ActiveVoiceSession.deleteOne({ _id: s._id }));
        cleaned++;
        continue;
      }

      const savedStartMs =
        s.start instanceof Date ? s.start.getTime() : Number(s.start) || now;
      const savedOriginalStartMs =
        s.originalStart instanceof Date
          ? s.originalStart.getTime()
          : Number(s.originalStart) || savedStartMs;

      const rawShutdown =
        options.lastShutdownAt !== undefined
          ? options.lastShutdownAt
          : (s as any).lastShutdownAt;
      const lastShutdownMs =
        rawShutdown instanceof Date
          ? rawShutdown.getTime()
          : typeof rawShutdown === "number"
            ? rawShutdown
            : null;

      let isShortPlannedRestart = false;
      if (lastShutdownMs !== null) {
        const downtimeMs = Math.max(0, now - lastShutdownMs);
        isShortPlannedRestart = downtimeMs <= SHORT_DOWNTIME_GRACE_MS;
      } else if (!options.strictNoShutdownTimestamp) {
        // Compatibilidad con reinicios donde no hubo marca de shutdown pero el checkpoint es reciente
        isShortPlannedRestart =
          now - savedStartMs <= UNVERIFIED_CHECKPOINT_MAX_MS;
      }

      const effectiveStart = isShortPlannedRestart ? savedStartMs : now;
      const effectiveOriginalStart = isShortPlannedRestart
        ? savedOriginalStartMs
        : now;

      activeSessions.set(sessionKey(s.userId, s.guildId), {
        start: effectiveStart,
        originalStart: effectiveOriginalStart,
        userId: s.userId,
        guildId: s.guildId,
        channelId: s.channelId,
        token: s.token,
      });

      if (!isShortPlannedRestart) {
        await persistSession(
          s.userId,
          s.guildId,
          s.channelId,
          effectiveStart,
          s.token,
          effectiveOriginalStart,
        );
      }

      restored++;
    } catch (error: any) {
      void HoshikoLogger.log({
        level: LogLevel.WARN,
        context: "VoiceXP/Rehydrate",
        message: `Fallo al rehidratar sesión de ${s?.userId}: ${error?.message || String(error)}`,
        guildId: s?.guildId,
      });
      await withMaxTime(ActiveVoiceSession.deleteOne({ _id: s._id })).catch(
        () => null,
      );
      cleaned++;
    }
  }
  console.log(
    `   🎤 Sesiones de voz rehidratadas: ${restored} restauradas, ${cleaned} limpiadas`,
  );
}

export async function closeSession(
  userId: string,
  guildId: string,
  now: number,
): Promise<void> {
  const key = sessionKey(userId, guildId);
  const session = activeSessions.get(key);
  if (!session) return;

  // Eliminación síncrona inmediata para evitar cierres duplicados concurrentes (V03 - Escenario 07)
  activeSessions.delete(key);

  const elapsedSeconds = Math.max(0, Math.floor((now - session.start) / 1000));
  const prevPartial = partialSeconds.get(key) ?? { seconds: 0, seq: 0 };
  const totalSeconds = prevPartial.seconds + elapsedSeconds;
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;
  const nextSeq = minutes > 0 ? prevPartial.seq + 1 : prevPartial.seq;

  if (remainderSeconds > 0) {
    partialSeconds.set(key, { seconds: remainderSeconds, seq: nextSeq });
  } else {
    partialSeconds.delete(key);
  }

  await removePersistedSession(userId, guildId);

  if (minutes < 1) return;

  const totalSessionMinutes = Math.max(
    0,
    Math.floor((now - session.originalStart) / 60_000),
  );

  const guild = client?.guilds.cache.get(guildId);
  if (!guild) return;

  const member =
    guild.members.cache.get(userId) ??
    (await guild.members.fetch(userId).catch(() => null));
  if (!member) return;

  const config = await LevelConfigCache.getLite(guildId);
  if (!config?.enabled || !config.xpVoiceEnabled) return;
  if (config.ignoredChannels.includes(session.channelId)) return;
  if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r)))
    return;

  const creditId = deriveDiscontinuousCreditId(
    session.token,
    session.start,
    nextSeq,
  );

  try {
    await handleVoiceXp(
      member,
      config,
      minutes,
      session.channelId,
      totalSessionMinutes,
      creditId,
    );
  } catch (error: any) {
    // Escenario 23: Restaurar los segundos acumulados en memoria si MongoDB falla antes de persistir
    const currentPartial = partialSeconds.get(key)?.seconds ?? 0;
    partialSeconds.set(key, {
      seconds: currentPartial + minutes * 60,
      seq: prevPartial.seq,
    });
    void HoshikoLogger.log({
      level: LogLevel.ERROR,
      context: "VoiceXP/closeSession",
      message: `Error acreditando XP de cierre para ${userId}; segundos preservados en memoria: ${error?.message || String(error)}`,
      guildId,
    });
  }
}

export async function processActiveVoiceInterval(
  now: number = Date.now(),
): Promise<void> {
  for (const [key, session] of activeSessions.entries()) {
    const current = activeSessions.get(key);
    if (!current || current.token !== session.token) continue;

    const minutes = Math.floor((now - session.start) / 60_000);
    if (minutes < 5) continue;

    const prevStart = session.start;
    // V01: Avanzar exactamente los minutos acreditados para no perder segundos residuales
    const nextStart = prevStart + minutes * 60_000;
    const creditId = deriveContinuousCreditId(session.token, prevStart);

    try {
      if (!client) continue;
      const guild = client.guilds.cache.get(session.guildId);
      if (!guild) {
        activeSessions.delete(key);
        await removePersistedSession(session.userId, session.guildId);
        continue;
      }

      const member =
        guild.members.cache.get(session.userId) ??
        (await guild.members.fetch(session.userId).catch(() => null));
      if (!member) {
        activeSessions.delete(key);
        await removePersistedSession(session.userId, session.guildId);
        continue;
      }

      const latest = activeSessions.get(key);
      if (!latest || latest.token !== session.token) continue;

      if (!isValidVoiceStateNow(member)) {
        await closeSession(session.userId, session.guildId, now);
        continue;
      }

      const config = await LevelConfigCache.getLite(session.guildId);
      if (!config?.enabled || !config.xpVoiceEnabled) continue;
      if (config.ignoredChannels.includes(session.channelId)) continue;
      if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r))) {
        activeSessions.set(key, { ...session, start: nextStart });
        await persistSession(
          session.userId,
          session.guildId,
          session.channelId,
          nextStart,
          session.token,
          session.originalStart,
        );
        continue;
      }

      const totalSessionMinutes = Math.floor(
        (now - session.originalStart) / 60_000,
      );

      // Avanzar checkpoint en memoria antes del await para evitar doble cobro si ocurre desconexión concurrente (V03 - Escenario 06)
      activeSessions.set(key, { ...session, start: nextStart });

      await handleVoiceXp(
        member,
        config,
        minutes,
        session.channelId,
        totalSessionMinutes,
        creditId,
      );

      const after = activeSessions.get(key);
      if (!after || after.token !== session.token) continue;

      await persistSession(
        session.userId,
        session.guildId,
        session.channelId,
        nextStart,
        session.token,
        session.originalStart,
      );
    } catch (err: any) {
      // Escenario 17: Rollback del checkpoint en memoria si la escritura de XP falló
      const afterErr = activeSessions.get(key);
      if (afterErr && afterErr.token === session.token) {
        activeSessions.set(key, { ...afterErr, start: prevStart });
      }
      void HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "VoiceXP/Interval",
        message: `Error guardando XP por intervalo para ${session.userId}: ${err?.message || String(err)}`,
        guildId: session.guildId,
      });
    }
  }
}

setInterval(() => {
  void processActiveVoiceInterval();
}, 5 * 60_000).unref();
