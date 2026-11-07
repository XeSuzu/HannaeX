import { Events, GuildBan, AuditLogEvent, User } from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildBanAdd,
  async execute(ban: GuildBan): Promise<void> {
    const guild = ban.guild;

    if (HoshikoLogger.wasRecentBotModerationAction(guild.id, "BAN", ban.user.id)) {
      return;
    }

    try {
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberBanAdd,
      });

      const now = Date.now();
      const banLog = fetchedLogs.entries.find((e) => {
        const isRecent = !e.createdTimestamp || now - e.createdTimestamp < 6000;
        const matchesTarget = !e.targetId || e.targetId === ban.user.id;
        return isRecent && matchesTarget;
      });
      const executor = banLog?.executor;

      // Si el baneo fue manual desde Discord (humano, no el bot), registrarlo en modlog
      if (executor && !executor.bot) {
        await HoshikoLogger.logAction(guild, "BAN", {
          user: ban.user,
          moderator: executor as User,
          reason:
            banLog?.reason ||
            "Baneo manual aplicado directamente desde Discord",
          source: "Evento externo (Discord)",
        });
      }
    } catch (err) {
      console.error("❌ Error en GuildBanAdd:", err);
    }
  },
};
