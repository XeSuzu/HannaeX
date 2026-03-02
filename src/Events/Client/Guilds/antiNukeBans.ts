import { Events, GuildBan, AuditLogEvent, User } from "discord.js";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";
import { SettingsManager } from "../../../Database/SettingsManager";
import { Logger } from "../../../Utils/SystemLogger";

const banTracker = new Map<string, { count: number; lastBan: number }>();
const LIMIT = 4; // Un poco más permisivo que canales, pero aún estricto
const TIME_WINDOW = 10000; // 10 segundos

export default {
  name: Events.GuildBanAdd,
  async execute(ban: GuildBan): Promise<void> {
    const guild = ban.guild;
    const settings = await SettingsManager.getSettings(guild.id);

    if (!settings?.securityModules?.antiNuke) return;

    try {
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd,
      });

      const banLog = fetchedLogs.entries.first();
      if (!banLog) return;

      const { executor } = banLog;
      if (!executor || executor.bot || executor.id === guild.ownerId) return;

      const now = Date.now();
      const userData = banTracker.get(executor!.id) || { count: 0, lastBan: 0 };

      if (now - userData.lastBan > TIME_WINDOW) {
        userData.count = 1;
      } else {
        userData.count++;
      }

      userData.lastBan = now;
      banTracker.set(executor.id, userData);

      if (userData.count >= LIMIT) {
        const executorMember = await guild.members.fetch(executor!.id);

        // 🛡️ Acción inmediata: Quitar roles administrativos
        const rolesToRemove = executorMember.roles.cache.filter(
          (r) => !r.managed && r.id !== guild.id,
        );
        await executorMember.roles.remove(
          rolesToRemove,
          "Anti-Nuke: Baneos masivos detectados.",
        );

        HoshikoLogger.log({
          level: LogLevel.FATAL,
          context: "Security/AntiNuke",
          message: `¡ALERTA DE BANEOS! ${executor!.tag || "Usuario desconocido"} baneó a ${userData.count} personas rápidamente.`,
          guildId: guild.id,
        });

        await HoshikoLogger.sendLog(
          guild,
          "ANTI_NUKE",
          `El usuario **${executor!.tag || "Usuario desconocido"}** ha sido degradado por realizar baneos masivos de forma sospechosa.`,
          executor as User,
        );

        // 📊 Log al webhook #alertas
        await Logger.logAntiNuke(
          [executor!.tag || "Usuario desconocido"],
          guild.name
        );

        banTracker.delete(executor!.id);
      }
    } catch (err) {
      console.error("❌ Error en Anti-Nuke Bans:", err);
    }
  },
};
