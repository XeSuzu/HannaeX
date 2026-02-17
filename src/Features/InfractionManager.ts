import {
  GuildMember,
  EmbedBuilder,
  PermissionFlagsBits,
  Message,
  CommandInteraction,
} from "discord.js";
// Cambiamos SettingsManager por el Modelo Directo para tener acceso a .save() y .markModified()
import ServerConfig, { IServerConfig } from "../Models/serverConfig";
import { HoshikoLogger } from "../Security/Logger/HoshikoLogger";

// 👇 PARCHE 1: Mantenemos esto para compatibilidad
export const userPoints = new Map<string, number>();

export class InfractionManager {
  // 📜 REGLAS POR DEFECTO
  private static readonly DEFAULT_RULES = [
    { threshold: 100, action: "BAN", duration: 0 },
    { threshold: 60, action: "KICK", duration: 0 },
    { threshold: 30, action: "MUTE", duration: 60 * 60 * 1000 }, // 1h
    { threshold: 20, action: "MUTE", duration: 10 * 60 * 1000 }, // 10m
    { threshold: 10, action: "WARN", duration: 0 },
  ];

  /**
   * 👮‍♂️ MOTOR PRINCIPAL: AUTO-MOD
   */
  static async addPoints(
    member: GuildMember | null,
    reason: string,
    context: Message | CommandInteraction,
  ) {
    if (!member || member.user.bot) return;

    // Puntos por defecto (gravedad)
    const severity = 10;

    // 1. 🛡️ INMUNIDAD
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      return;
    }

    const guildId = member.guild.id;
    const userId = member.id;

    try {
      // 🛠️ FIX CRÍTICO: Usamos findOne directamente para obtener un Documento Mongoose real
      let settings = await ServerConfig.findOne({ guildId });

      if (!settings) {
        // Si no existe configuración, creamos una nueva al vuelo
        settings = new ServerConfig({ guildId });
      }

      // 2. ➕ SUMAR PUNTOS
      // Aseguramos que el mapa exista
      if (!settings.infractionsMap) {
        settings.infractionsMap = new Map<string, number>();
      }

      // Obtenemos puntos actuales (usando .get porque es un Map de Mongoose)
      const currentPoints = settings.infractionsMap.get(userId) || 0;
      const newTotal = currentPoints + severity;

      // Guardamos el nuevo valor
      settings.infractionsMap.set(userId, newTotal);

      // Actualizamos también el mapa en memoria (Parche)
      userPoints.set(`${guildId}-${userId}`, newTotal);

      // 🛠️ FIX: Ahora sí existe markModified porque 'settings' es un Documento
      settings.markModified("infractionsMap");
      await settings.save();

      // Log visual (sin await para no bloquear)
      HoshikoLogger.logAction(member.guild, "AUTOMOD", {
        user: member.user,
        reason: reason,
        extra: `Sanción: +${severity} pts | Acumulado Total: ${newTotal} pts`,
      });

      // 4. ⚖️ JUZGAR
      // Convertimos a 'unknown' temporalmente si hay problemas de tipado estricto con Rules
      const rulesData = settings.autoModRules as any[];
      let activeRules =
        rulesData && rulesData.length > 0 ? rulesData : this.DEFAULT_RULES;

      // Ordenar reglas (Mayor a Menor)
      activeRules = activeRules.sort(
        (a: any, b: any) => b.threshold - a.threshold,
      );

      const punishment = activeRules.find(
        (rule: any) => newTotal >= rule.threshold,
      );

      if (punishment) {
        await this.executePunishment(member, punishment, reason, newTotal);

        // Resetear puntos si es expulsión o baneo
        if (punishment.action === "BAN" || punishment.action === "KICK") {
          settings.infractionsMap.set(userId, 0); // Reiniciar a 0
          settings.markModified("infractionsMap");
          await settings.save();
        }
      }
    } catch (error) {
      console.error(
        `❌ Error Crítico en InfractionManager (${guildId}):`,
        error,
      );
    }
  }

  // --- 🔨 EJECUTOR DE CASTIGOS ---
  private static async executePunishment(
    member: GuildMember,
    rule: any,
    reason: string,
    totalPts: number,
  ) {
    if (!member.manageable) return; // Si el bot no tiene jerarquía, abortar

    const embed = new EmbedBuilder().setTimestamp();

    try {
      switch (rule.action) {
        case "BAN":
          embed
            .setTitle("⛔ BANEADO POR AUTOMOD")
            .setColor(0xff0000)
            .setDescription(
              `Has acumulado **${totalPts} puntos** de infracción.\n**Detonante:** ${reason}`,
            );
          await member.send({ embeds: [embed] }).catch(() => null);
          await member.ban({ reason: `[AutoMod] ${totalPts} pts: ${reason}` });
          break;

        case "KICK":
          embed
            .setTitle("👢 EXPULSADO POR AUTOMOD")
            .setColor(0xff5500)
            .setDescription(
              `Has acumulado **${totalPts} puntos**.\n**Detonante:** ${reason}`,
            );
          await member.send({ embeds: [embed] }).catch(() => null);
          await member.kick(`[AutoMod] ${totalPts} pts: ${reason}`);
          break;

        case "MUTE":
          if (!member.isCommunicationDisabled()) {
            const mins = Math.floor(rule.duration / 60000);
            embed
              .setTitle("😶 SILENCIADO POR AUTOMOD")
              .setColor(0xffa500)
              .setDescription(
                `Has sido silenciado temporalmente.\n**Acumulado:** ${totalPts} pts\n**Tiempo:** ${mins} minutos\n**Razón:** ${reason}`,
              );

            // Timeout
            await member.timeout(
              rule.duration,
              `[AutoMod] ${totalPts} pts: ${reason}`,
            );
            await member.send({ embeds: [embed] }).catch(() => null);
          }
          break;

        case "WARN":
          embed
            .setTitle("⚠️ ADVERTENCIA AUTOMÁTICA")
            .setColor(0xffff00)
            .setDescription(
              `Tu comportamiento está sumando puntos negativos (${totalPts}).\n**Razón:** ${reason}`,
            );
          await member.send({ embeds: [embed] }).catch(() => null);
          break;
      }
    } catch (e) {
      console.error(`Error AutoMod Castigo en ${member.guild.name}:`, e);
    }
  }
}
