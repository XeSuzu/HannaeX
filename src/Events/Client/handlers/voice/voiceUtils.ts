import { VoiceState } from "discord.js";
import ActiveVoiceSession from "../../../../Database/leveling/activeVoiceSession.model";

export function sessionKey(userId: string, guildId: string): string {
  return `${userId}:${guildId}`;
}

export function isValidSession(state: VoiceState): boolean {
  if (!state.channel || !state.member) return false;
  if (state.member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (state.guild.afkChannelId === state.channelId) return false;
  return state.channel.members.filter((m) => !m.user.bot).size >= 2;
}

export function isValidVoiceStateNow(member: any): boolean {
  const state = member?.voice;
  if (!state?.channel || !member) return false;
  if (member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (member.guild.afkChannelId === state.channelId) return false;
  return state.channel.members.filter((m: any) => !m.user.bot).size >= 2;
}

export async function persistSession(
  userId: string,
  guildId: string,
  channelId: string,
  start: number,
  token: string,
  originalStart: number,
): Promise<void> {
  await ActiveVoiceSession.findOneAndUpdate(
    { userId, guildId },
    {
      channelId,
      start: new Date(start),
      token,
      originalStart: new Date(originalStart),
    },
    { upsert: true },
  ).catch(() => null);
}

export async function removePersistedSession(
  userId: string,
  guildId: string,
): Promise<void> {
  await ActiveVoiceSession.deleteOne({ userId, guildId }).catch(() => null);
}
