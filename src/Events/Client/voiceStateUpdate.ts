import { Client, Events, VoiceState } from "discord.js";
import crypto from "node:crypto";
import { handleVoiceXp } from "../../Features/levelHandler";
import LevelConfig from "../../Models/LevelConfig";

// ─── Mapa de sesiones activas ────────────────────────────────────────────────
// Solo guarda datos primitivos; el member se fetchea fresco en cada operación
const activeSessions = new Map<
  string,
  {
    start: number;
    userId: string;
    guildId: string;
    channelId: string;
    token: string; // versión de sesión — evita zombies y race conditions
  }
>();

// Necesitamos el client para fetchear members frescos desde el intervalo
let client: Client;
export function initVoiceSessionClient(c: Client): void {
  client = c;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sessionKey(userId: string, guildId: string): string {
  return `${userId}:${guildId}`;
}

/** Valida el estado VC desde el evento (al entrar/salir) */
function isValidSession(state: VoiceState): boolean {
  if (!state.channel || !state.member) return false;
  if (state.member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (state.guild.afkChannelId === state.channelId) return false;

  const humans = state.channel.members.filter((m) => !m.user.bot).size;
  return humans >= 2;
}

/** Valida el estado VC usando el member fresco (usado por el intervalo) */
function isValidVoiceStateNow(member: any): boolean {
  const state = member?.voice;
  if (!state?.channel || !member) return false;
  if (member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (member.guild.afkChannelId === state.channelId) return false;

  const humans = state.channel.members.filter((m: any) => !m.user.bot).size;
  return humans >= 2;
}

// ─── Intervalo cada hora ──────────────────────────────────────────────────────
// Paga XP VC local acumulada, revalidando el estado real del miembro
setInterval(async () => {
  const now = Date.now();

  for (const [key, session] of activeSessions.entries()) {
    // Verificar que la sesión no fue reemplazada o borrada mientras iteramos
    const current = activeSessions.get(key);
    if (!current || current.token !== session.token) continue;

    const minutes = Math.floor((now - session.start) / 60_000);
    if (minutes < 5) continue;

    try {
      if (!client) continue;

      const guild = client.guilds.cache.get(session.guildId);
      if (!guild) {
        activeSessions.delete(key);
        continue;
      }

      // Fetch member fresco — valida roles y estado actual
      const member = await guild.members
        .fetch(session.userId)
        .catch(() => null);
      if (!member) {
        activeSessions.delete(key);
        continue;
      }

      // Re-verificar token después del await (puede haber cambiado)
      const latest = activeSessions.get(key);
      if (!latest || latest.token !== session.token) continue;

      // Si el estado dejó de ser válido, resetear timer sin dar XP
      if (!isValidVoiceStateNow(member)) {
        activeSessions.set(key, { ...session, start: now });
        continue;
      }

      const config = await LevelConfig.findOne({ guildId: session.guildId });
      if (!config?.enabled || !config.xpVoiceEnabled) continue;

      // Validar canal y roles ignorados con datos frescos
      if (config.ignoredChannels.includes(session.channelId)) continue;
      if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r))) {
        activeSessions.set(key, { ...session, start: now });
        continue;
      }

      await handleVoiceXp(member, config, minutes, session.channelId);

      // Verificar token una última vez antes de resetear
      const after = activeSessions.get(key);
      if (!after || after.token !== session.token) continue;

      // Resetear contador para la siguiente hora
      activeSessions.set(key, { ...session, start: now });
    } catch (err) {
      console.error("[voiceXp] error guardando xp por intervalo:", err);
    }
  }
}, 60 * 60_000);

// ─── closeSession ─────────────────────────────────────────────────────────────
// Token-safe: si el intervalo reemplazó la sesión justo antes, no duplicamos XP
async function closeSession(
  userId: string,
  guildId: string,
  now: number,
): Promise<void> {
  const key = sessionKey(userId, guildId);
  const session = activeSessions.get(key);
  if (!session) return;

  // Borrar primero — evita que el intervalo la procese en paralelo
  activeSessions.delete(key);

  const minutes = Math.floor((now - session.start) / 60_000);
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

  await handleVoiceXp(member, config, minutes, session.channelId);
}

// ─── Evento principal ─────────────────────────────────────────────────────────
export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const member = newState.member ?? oldState.member;
    const userId = member?.id;
    const guildId = newState.guild.id;

    if (!userId || member?.user.bot) return;

    const key = sessionKey(userId, guildId);
    const now = Date.now();
    const wasOk = oldState.channelId ? isValidSession(oldState) : false;
    const isOk = newState.channelId ? isValidSession(newState) : false;

    if (!wasOk && isOk) {
      // Entró a un canal válido
      activeSessions.set(key, {
        start: now,
        userId,
        guildId,
        channelId: newState.channelId!,
        token: crypto.randomUUID(),
      });
    } else if (wasOk && !isOk) {
      // Salió del canal o dejó de ser válido
      await closeSession(userId, guildId, now);
    } else if (wasOk && isOk && oldState.channelId !== newState.channelId) {
      // Cambió de canal: cerrar sesión anterior y abrir nueva
      await closeSession(userId, guildId, now);
      activeSessions.set(key, {
        start: now,
        userId,
        guildId,
        channelId: newState.channelId!,
        token: crypto.randomUUID(),
      });
    } else if (wasOk && newState.channelId && !isValidSession(newState)) {
      // Sigue en canal pero pasó a estado inválido (se muteó, etc.)
      await closeSession(userId, guildId, now);
    }
  },
};
