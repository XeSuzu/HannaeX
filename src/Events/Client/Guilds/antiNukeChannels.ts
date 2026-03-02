import {
  Events,
  GuildChannel,
  AuditLogEvent,
  PermissionFlagsBits,
} from "discord.js";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";
import { SettingsManager } from "../../../Database/SettingsManager";

// Estructura para rastrear quién borra qué y cuándo
const deletionTracker = new Map<
  string,
  { count: number; lastDeletion: number }
>();
const LIMIT = 3; // Máximo 3 canales en...
const TIME_WINDOW = 10000; // ...10 segundos

export default {
  name: Events.ChannelDelete,
  async execute(channel: GuildChannel) {
    const guild = channel.guild;
    const settings = await SettingsManager.getSettings(guild.id);

    // Si el módulo anti-nuke está desactivado, no hacer nada
    if (!settings?.securityModules?.antiNuke) return;

    try {
      // Obtener autor del borrado desde audit logs
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
      });

      const deletionLog = fetchedLogs.entries.first();
      if (!deletionLog) return;

      const { executor, target } = deletionLog;
      if (!executor || executor.bot) return; // Ignoramos si fue un bot o no hay ejecutor

      const executorMember = await guild.members.fetch(executor.id);

      // Si el ejecutor es el dueño del servidor, lo ignoramos (él manda 👑)
      if (executor.id === guild.ownerId) return;

      const now = Date.now();
      const userData = deletionTracker.get(executor.id) || {
        count: 0,
        lastDeletion: 0,
      };

      // Si pasó mucho tiempo, reseteamos el contador
      if (now - userData.lastDeletion > TIME_WINDOW) {
        userData.count = 1;
      } else {
        userData.count++;
      }

      userData.lastDeletion = now;
      deletionTracker.set(executor.id, userData);

      // Si supera el límite: revocar roles y registrar evento de seguridad
      if (userData.count >= LIMIT) {
        // Revocar roles del ejecutor (cuarentena)
        const roles = executorMember.roles.cache.filter(
          (r) => r.managed === false && r.id !== guild.id,
        );
        await executorMember.roles.remove(
          roles,
          "Anti-Nuke: Borrado masivo de canales detectado.",
        );

        // 2. Log de seguridad interno
        HoshikoLogger.log({
          level: LogLevel.FATAL,
          context: "Security/AntiNuke",
          message: `¡NUKE DETECTADO! ${executor.tag} ha borrado ${userData.count} canales. Se le han quitado los roles.`,
          guildId: guild.id,
        });

        // 3. Aviso estético al canal de logs del servidor
        await HoshikoLogger.sendLog(
          guild,
          "ANTI_NUKE",
          `El usuario **${executor.tag}** ha sido puesto en cuarentena por intentar borrar múltiples canales rápidamente.\nSe le han retirado todos sus roles administrativos.`,
          executor as any,
        );

        deletionTracker.delete(executor.id); // Limpiamos rastreo tras sanción
      }
    } catch (err) {
      console.error("❌ Error en Anti-Nuke Channels:", err);
    }
  },
};
