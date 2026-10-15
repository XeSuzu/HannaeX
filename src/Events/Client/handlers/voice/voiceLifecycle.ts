import { VoiceState } from "discord.js";
import crypto from "node:crypto";
import { activeSessions, closeSession } from "./voiceManager";
import { isValidSession, persistSession, sessionKey } from "./voiceUtils";

export async function handleVoiceStateChange(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  const member = newState.member ?? oldState.member;
  const userId = member?.id;
  const guildId = newState.guild.id;
  if (!userId || member?.user.bot) return;

  const key = sessionKey(userId, guildId);
  const now = Date.now();
  const wasOk = oldState.channelId ? isValidSession(oldState) : false;
  const isOk = newState.channelId ? isValidSession(newState) : false;

  const session = activeSessions.get(key);
  const mutedNow =
    newState.selfMute ||
    newState.selfDeaf ||
    newState.serverMute ||
    newState.serverDeaf;
  const wasMuted =
    oldState.selfMute ||
    oldState.selfDeaf ||
    oldState.serverMute ||
    oldState.serverDeaf;

  if (session && newState.channelId === session.channelId) {
    if ((!wasMuted && mutedNow) || (wasMuted && !mutedNow)) {
      activeSessions.set(key, { ...session, start: now });
      await persistSession(
        userId,
        guildId,
        session.channelId,
        now,
        session.token,
        session.originalStart,
      );
      return;
    }
  }

  if (!wasOk && isOk) {
    const token = crypto.randomUUID();
    activeSessions.set(key, {
      start: now,
      originalStart: now,
      userId,
      guildId,
      channelId: newState.channelId!,
      token,
    });
    await persistSession(userId, guildId, newState.channelId!, now, token, now);
  } else if (wasOk && !isOk) {
    await closeSession(userId, guildId, now);
  } else if (wasOk && isOk && oldState.channelId !== newState.channelId) {
    await closeSession(userId, guildId, now);
    const token = crypto.randomUUID();
    activeSessions.set(key, {
      start: now,
      originalStart: now,
      userId,
      guildId,
      channelId: newState.channelId!,
      token,
    });
    await persistSession(userId, guildId, newState.channelId!, now, token, now);
  } else if (wasOk && newState.channelId && !isValidSession(newState)) {
    await closeSession(userId, guildId, now);
  }
}
