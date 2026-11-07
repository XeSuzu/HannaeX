import { VoiceState } from "discord.js";
import ActiveVoiceSession from "../../../../Database/leveling/activeVoiceSession.model";
import { HoshikoLogger, LogLevel } from "../../../../Security/Logger/HoshikoLogger";

export const MONGO_VOICE_MAX_TIME_MS = 3000;

export function withMaxTime<T>(op: any, ms = MONGO_VOICE_MAX_TIME_MS): Promise<T> {
  if (op && typeof op.maxTimeMS === "function") {
    return op.maxTimeMS(ms);
  }
  return Promise.resolve(op);
}

export function sessionKey(userId: string, guildId: string): string {
  return `${userId}:${guildId}`;
}

/**
 * Un acompañante es válido para el quórum si es humano y NO está ensordecido (V06).
 * Un usuario silenciado pero no ensordecido sí escucha activamente y cuenta como acompañante.
 */
export function isEligibleCompanion(member: any): boolean {
  if (!member || member.user?.bot) return false;
  if (member.voice?.selfDeaf || member.voice?.serverDeaf) return false;
  return true;
}

export function isValidSession(state: VoiceState): boolean {
  if (!state.channel || !state.member) return false;
  if (state.member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (state.guild.afkChannelId === state.channelId) return false;
  return state.channel.members.filter((m) => isEligibleCompanion(m)).size >= 2;
}

export function isValidVoiceStateNow(member: any): boolean {
  const state = member?.voice;
  if (!state?.channel || !member) return false;
  if (member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (member.guild.afkChannelId === state.channelId) return false;
  return state.channel.members.filter((m: any) => isEligibleCompanion(m)).size >= 2;
}

export async function persistSession(
  userId: string,
  guildId: string,
  channelId: string,
  start: number,
  token: string,
  originalStart: number,
): Promise<void> {
  try {
    await withMaxTime(
      ActiveVoiceSession.findOneAndUpdate(
        { userId, guildId },
        {
          channelId,
          start: new Date(start),
          token,
          originalStart: new Date(originalStart),
          lastShutdownAt: null,
        },
        { upsert: true },
      ),
    );
  } catch (error: any) {
    void HoshikoLogger.log({
      level: LogLevel.ERROR,
      context: "VoiceXP/persistSession",
      message: `Fallo al persistir sesión activa para ${userId}: ${error?.message || String(error)}`,
      guildId,
    });
  }
}

export async function removePersistedSession(
  userId: string,
  guildId: string,
): Promise<void> {
  try {
    await withMaxTime(ActiveVoiceSession.deleteOne({ userId, guildId }));
  } catch (error: any) {
    void HoshikoLogger.log({
      level: LogLevel.ERROR,
      context: "VoiceXP/removePersistedSession",
      message: `Fallo al eliminar sesión persistida para ${userId}: ${error?.message || String(error)}`,
      guildId,
    });
  }
}
