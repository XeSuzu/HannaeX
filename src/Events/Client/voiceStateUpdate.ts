import { Events, VoiceState } from "discord.js";
import { handleVoiceXp } from "../../Features/levelHandler";
import LevelConfig from "../../Models/LevelConfig";

// userId:guildId → timestamp de entrada válida
const activeSessions = new Map<string, number>();

function sessionKey(userId: string, guildId: string): string {
  return `${userId}:${guildId}`;
}

function isValidSession(state: VoiceState): boolean {
  if (!state.channel || !state.member) return false;
  if (state.member.user.bot) return false;
  if (state.selfDeaf || state.selfMute) return false;
  if (state.serverDeaf || state.serverMute) return false;
  if (state.guild.afkChannelId === state.channelId) return false;

  const humans = state.channel.members.filter((m) => !m.user.bot).size;
  return humans >= 2;
}

async function closeSession(
  userId: string,
  guildId: string,
  member: any,
  now: number,
): Promise<void> {
  const key = sessionKey(userId, guildId);
  const start = activeSessions.get(key);
  if (!start) return;

  activeSessions.delete(key);

  const minutes = Math.floor((now - start) / 60_000);
  if (minutes < 1) return;

  const config = await LevelConfig.findOne({ guildId });
  if (!config?.enabled || !config.xpVoiceEnabled) return;

  await handleVoiceXp(member, config, minutes);
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
      activeSessions.set(key, now);
    } else if (wasOk && !isOk) {
      await closeSession(userId, guildId, member, now);
    } else if (wasOk && isOk && oldState.channelId !== newState.channelId) {
      await closeSession(userId, guildId, member, now);
      activeSessions.set(key, now);
    } else if (wasOk && !isValidSession(newState) && newState.channelId) {
      await closeSession(userId, guildId, member, now);
    }
  },
};
