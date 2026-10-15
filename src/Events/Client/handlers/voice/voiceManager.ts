import { Client } from "discord.js";
import { handleVoiceXp } from "../../../../Features/levelHandler";
import ActiveVoiceSession from "../../../../Models/ActiveVoiceSession";
import LevelConfig from "../../../../Models/LevelConfig";
import {
  isValidVoiceStateNow,
  persistSession,
  removePersistedSession,
  sessionKey,
} from "./voiceUtils";

export interface VoiceSessionData {
  start: number;
  originalStart: number;
  userId: string;
  guildId: string;
  channelId: string;
  token: string;
}

export const activeSessions = new Map<string, VoiceSessionData>();

let client: Client;
export function initVoiceSessionClient(c: Client): void {
  client = c;
}

export async function rehydrateVoiceSessions(): Promise<void> {
  if (!client) return;
  const saved = await ActiveVoiceSession.find();
  let restored = 0,
    cleaned = 0;

  for (const s of saved) {
    try {
      const guild = client.guilds.cache.get(s.guildId);
      if (!guild) {
        await ActiveVoiceSession.deleteOne({ _id: s._id });
        cleaned++;
        continue;
      }

      const voiceState = guild.voiceStates.cache.get(s.userId);
      if (!voiceState?.channelId || voiceState.channelId !== s.channelId) {
        await ActiveVoiceSession.deleteOne({ _id: s._id });
        cleaned++;
        continue;
      }

      const restoredAt = Date.now();
      activeSessions.set(sessionKey(s.userId, s.guildId), {
        start: restoredAt,
        originalStart: restoredAt,
        userId: s.userId,
        guildId: s.guildId,
        channelId: s.channelId,
        token: s.token,
      });
      restored++;
    } catch {
      await ActiveVoiceSession.deleteOne({ _id: s._id }).catch(() => null);
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

  const minutes = Math.floor((now - session.start) / 60_000);
  const totalSessionMinutes = Math.floor(
    (now - session.originalStart) / 60_000,
  );

  activeSessions.delete(key);
  await removePersistedSession(userId, guildId);

  if (minutes < 1) return;

  const guild = client?.guilds.cache.get(guildId);
  if (!guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const config = await LevelConfig.findOne({ guildId });
  if (!config?.enabled || !config.xpVoiceEnabled) return;
  if (config.ignoredChannels.includes(session.channelId)) return;
  if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r)))
    return;

  await handleVoiceXp(
    member,
    config,
    minutes,
    session.channelId,
    totalSessionMinutes,
  );
}

setInterval(async () => {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    const current = activeSessions.get(key);
    if (!current || current.token !== session.token) continue;

    const minutes = Math.floor((now - session.start) / 60_000);
    if (minutes < 5) continue;

    try {
      if (!client) continue;
      const guild = client.guilds.cache.get(session.guildId);
      if (!guild) {
        activeSessions.delete(key);
        await removePersistedSession(session.userId, session.guildId);
        continue;
      }

      const member = await guild.members
        .fetch(session.userId)
        .catch(() => null);
      if (!member) {
        activeSessions.delete(key);
        await removePersistedSession(session.userId, session.guildId);
        continue;
      }

      const latest = activeSessions.get(key);
      if (!latest || latest.token !== session.token) continue;

      if (!isValidVoiceStateNow(member)) {
        activeSessions.delete(key);
        await removePersistedSession(session.userId, session.guildId);
        continue;
      }

      const config = await LevelConfig.findOne({ guildId: session.guildId });
      if (!config?.enabled || !config.xpVoiceEnabled) continue;
      if (config.ignoredChannels.includes(session.channelId)) continue;
      if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r))) {
        activeSessions.set(key, { ...session, start: now });
        await persistSession(
          session.userId,
          session.guildId,
          session.channelId,
          now,
          session.token,
          session.originalStart,
        );
        continue;
      }

      const totalSessionMinutes = Math.floor(
        (now - session.originalStart) / 60_000,
      );
      await handleVoiceXp(
        member,
        config,
        minutes,
        session.channelId,
        totalSessionMinutes,
      );

      const after = activeSessions.get(key);
      if (!after || after.token !== session.token) continue;

      activeSessions.set(key, { ...session, start: now });
      await persistSession(
        session.userId,
        session.guildId,
        session.channelId,
        now,
        session.token,
        session.originalStart,
      );
    } catch (err) {
      console.error("[voiceXp] error guardando xp por intervalo:", err);
    }
  }
}, 5 * 60_000);
