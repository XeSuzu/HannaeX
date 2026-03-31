import { Events, VoiceState } from "discord.js";
import { totalXpForLevel } from "../../Features/levelHandler";
import LevelConfig from "../../Models/LevelConfig";
import LocalLevel from "../../Models/LocalLevels";

// userId → timestamp de cuando entró al canal de voz
const voiceSessions = new Map<string, number>();

// Cada 5 minutos revisamos quién sigue en voz y damos XP
setInterval(
  async () => {
    const now = Date.now();

    for (const [key, joinedAt] of voiceSessions.entries()) {
      const [userId, guildId] = key.split(":");
      const minutesInVoice = (now - joinedAt) / 60000;
      if (minutesInVoice < 1) continue;

      const config = await LevelConfig.findOne({ guildId });
      if (!config?.enabled) continue;

      const xpGain = Math.floor(
        (config?.xpPerMinuteVoice ?? 10) * minutesInVoice,
      );

      // Resetear timer
      voiceSessions.set(key, now);

      const profile = await LocalLevel.findOneAndUpdate(
        { userId, guildId },
        {
          $setOnInsert: {
            xp: 0,
            level: 0,
            messagesSent: 0,
            lastXpGain: new Date(0),
          },
        },
        { upsert: true, new: true },
      );

      const newXp = profile.xp + xpGain;
      let newLevel = profile.level;

      while (newXp >= totalXpForLevel(newLevel + 1)) {
        newLevel++;
      }

      await LocalLevel.updateOne(
        { userId, guildId },
        { xp: newXp, level: newLevel },
      );
    }
  },
  5 * 60 * 1000,
);

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const userId = newState.member?.user.id ?? oldState.member?.user.id;
    if (!userId) return;
    if (newState.member?.user.bot) return;

    const guildId = newState.guild.id;
    const key = `${userId}:${guildId}`;

    const joinedChannel = !oldState.channel && newState.channel;
    const leftChannel = oldState.channel && !newState.channel;
    const isMuted = newState.selfMute || newState.selfDeaf;

    if (joinedChannel && !isMuted) {
      voiceSessions.set(key, Date.now());
    } else if (leftChannel) {
      voiceSessions.delete(key);
    } else if (isMuted) {
      // Si se mutea, pausamos (no damos XP mientras está muted/deaf)
      voiceSessions.delete(key);
    } else if (!isMuted && oldState.selfMute && newState.channel) {
      // Se desmutea → volvemos a trackear
      voiceSessions.set(key, Date.now());
    }
  },
};
