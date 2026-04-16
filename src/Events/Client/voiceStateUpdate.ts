import { Client, Events, VoiceState } from "discord.js";
import crypto from "node:crypto";
import { handleVoiceXp } from "../../Features/levelHandler";
import ActiveVoiceSession from "../../Models/ActiveVoiceSession";
import LevelConfig from "../../Models/LevelConfig";

const activeSessions = new Map<
  string,
  {
    start: number;
    userId: string;
    guildId: string;
    channelId: string;
    token: string;
  }
>();

let client: Client;
export function initVoiceSessionClient(c: Client): void {
  client = c;
}

// ─── Rehidratación al arrancar ────────────────────────────────────────────────
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

      const member = await guild.members.fetch(s.userId).catch(() => null);
      if (!member?.voice?.channelId || member.voice.channelId !== s.channelId) {
        await ActiveVoiceSession.deleteOne({ _id: s._id });
        cleaned++;
        continue;
      }

      activeSessions.set(sessionKey(s.userId, s.guildId), {
        start: s.start.getTime(), // Preserva start original — no pierde minutos
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

function sessionKey(userId: string, guildId: string): string {
  return `${userId}:${guildId}`;
}

function isValidSession(state: VoiceState): boolean {
  if (!state.channel || !state.member) return false;
  if (state.member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (state.guild.afkChannelId === state.channelId) return false;
  return state.channel.members.filter((m) => !m.user.bot).size >= 2;
}

function isValidVoiceStateNow(member: any): boolean {
  const state = member?.voice;
  if (!state?.channel || !member) return false;
  if (member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (member.guild.afkChannelId === state.channelId) return false;
  return state.channel.members.filter((m: any) => !m.user.bot).size >= 2;
}

async function persistSession(
  userId: string,
  guildId: string,
  channelId: string,
  start: number,
  token: string,
): Promise<void> {
  await ActiveVoiceSession.findOneAndUpdate(
    { userId, guildId },
    { channelId, start: new Date(start), token },
    { upsert: true },
  ).catch(() => null);
}

async function removePersistedSession(
  userId: string,
  guildId: string,
): Promise<void> {
  await ActiveVoiceSession.deleteOne({ userId, guildId }).catch(() => null);
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
        activeSessions.set(key, { ...session, start: now });
        await persistSession(
          session.userId,
          session.guildId,
          session.channelId,
          now,
          session.token,
        );
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
        );
        continue;
      }

      await handleVoiceXp(member, config, minutes, session.channelId);

      const after = activeSessions.get(key);
      if (!after || after.token !== session.token) continue;

      activeSessions.set(key, { ...session, start: now });
      await persistSession(
        session.userId,
        session.guildId,
        session.channelId,
        now,
        session.token,
      );
    } catch (err) {
      console.error("[voiceXp] error guardando xp por intervalo:", err);
    }
  }
}, 60 * 60_000);

async function closeSession(
  userId: string,
  guildId: string,
  now: number,
): Promise<void> {
  const key = sessionKey(userId, guildId);
  const session = activeSessions.get(key);
  if (!session) return;

  activeSessions.delete(key);
  await removePersistedSession(userId, guildId); // Borrar en DB también

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
      const token = crypto.randomUUID();
      activeSessions.set(key, {
        start: now,
        userId,
        guildId,
        channelId: newState.channelId!,
        token,
      });
      await persistSession(userId, guildId, newState.channelId!, now, token);
    } else if (wasOk && !isOk) {
      await closeSession(userId, guildId, now);
    } else if (wasOk && isOk && oldState.channelId !== newState.channelId) {
      await closeSession(userId, guildId, now);
      const token = crypto.randomUUID();
      activeSessions.set(key, {
        start: now,
        userId,
        guildId,
        channelId: newState.channelId!,
        token,
      });
      await persistSession(userId, guildId, newState.channelId!, now, token);
    } else if (wasOk && newState.channelId && !isValidSession(newState)) {
      await closeSession(userId, guildId, now);
    }
  },
};
