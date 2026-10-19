import { VoiceBasedChannel, VoiceState } from "discord.js";
import crypto from "node:crypto";
import { activeSessions, closeSession } from "./voiceManager";
import {
  isValidVoiceStateNow,
  persistSession,
  sessionKey,
} from "./voiceUtils";

async function syncChannelSessions(
  channel: VoiceBasedChannel | null | undefined,
  guildId: string,
  now: number,
  previousStarts: Map<string, number>,
): Promise<void> {
  if (!channel) return;

  for (const [, member] of channel.members) {
    if (member.user.bot) continue;

    const userId = member.id;
    const key = sessionKey(userId, guildId);
    const existing = activeSessions.get(key);
    const eligible = isValidVoiceStateNow(member);

    if (eligible) {
      if (!existing || existing.channelId !== channel.id) {
        if (existing && existing.channelId !== channel.id) {
          await closeSession(userId, guildId, now);
        }
        const token = crypto.randomUUID();
        const originalStart =
          previousStarts.get(userId) ?? existing?.originalStart ?? now;
        activeSessions.set(key, {
          start: now,
          originalStart,
          userId,
          guildId,
          channelId: channel.id,
          token,
        });
        await persistSession(
          userId,
          guildId,
          channel.id,
          now,
          token,
          originalStart,
        );
      }
    } else if (existing && existing.channelId === channel.id) {
      await closeSession(userId, guildId, now);
    }
  }
}

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
  const previousStarts = new Map<string, number>();

  const existing = activeSessions.get(key);
  if (existing) {
    previousStarts.set(userId, existing.originalStart);
  }

  // Si el usuario salió o cambió de canal, liquidar primero su sesión en el canal anterior
  if (
    existing &&
    (!newState.channelId || newState.channelId !== existing.channelId)
  ) {
    await closeSession(userId, guildId, now);
  }

  // Sincronizar el canal anterior (ej. si el acompañante quedó solo en el canal)
  if (oldState.channel && oldState.channelId !== newState.channelId) {
    await syncChannelSessions(oldState.channel, guildId, now, previousStarts);
  }

  // Sincronizar el canal actual (inicia o cierra sesiones de todos los miembros según elegibilidad)
  if (newState.channel) {
    await syncChannelSessions(newState.channel, guildId, now, previousStarts);
  }
}
