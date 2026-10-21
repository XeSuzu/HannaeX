import { GuildMember } from "discord.js";
import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import {
  triggerRaidAlert,
  RaidSuspectInfo,
} from "../../Features/automod/raidAlertManager";

const joinCache = new LocalCacheService<
  Array<RaidSuspectInfo & { timestamp: number }>
>("antiraid_joins", { max: 1000, ttlMs: 30_000 });

export class AntiRaid {
  private static JOIN_LIMIT = 5; // Máximo 5 usuarios
  private static TIME_WINDOW = 15_000; // En un lapso de 15 segundos

  static async handleJoin(member: GuildMember): Promise<void> {
    const settings = await SettingsManager.getSettings(member.guild.id);
    if (!settings || !settings.securityModules.antiRaid) return;

    const now = Date.now();
    const guildId = member.guild.id;

    const accountAgeMs = now - member.user.createdTimestamp;
    const suspectInfo: RaidSuspectInfo & { timestamp: number } = {
      id: member.id,
      username: member.user.username,
      accountAgeDays: accountAgeMs / 86_400_000,
      joinedSecondsAgo: 0,
      timestamp: now,
    };

    const joins = (joinCache.get(guildId) || []).filter(
      (j) => now - j.timestamp < this.TIME_WINDOW,
    );
    joins.push(suspectInfo);
    joinCache.set(guildId, joins);

    if (joins.length >= this.JOIN_LIMIT) {
      await triggerRaidAlert({
        guild: member.guild,
        suspects: joins,
      });
    }
  }
}
