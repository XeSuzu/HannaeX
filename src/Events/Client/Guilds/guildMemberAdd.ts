import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  GuildMember,
} from "discord.js";
import { SettingsManager } from "../../../Database/SettingsManager";
import { SentinelNetwork } from "../../../Features/sentinelNetwork";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember, client: any): Promise<void> {
    if (member.user.bot) return;

    await SentinelNetwork.checkMember(member);

    const settings = await SettingsManager.getSettings(member.guild.id);
    if (!settings) return;

    // ─── 1. ANTI-ALT ────────────────────────────────────────────────────────
    if (settings.securityModules?.antiAlt) {
      const MIN_AGE = 1000 * 60 * 60 * 24 * 2; // 2 días
      const accountAge = Date.now() - member.user.createdTimestamp;

      if (accountAge < MIN_AGE) {
        try {
          const ageInHours = (accountAge / (1000 * 60 * 60)).toFixed(1);

          const verifyEmbed = new EmbedBuilder()
            .setTitle("🌸 Verificación de Seguridad")
            .setDescription(
              `¡Hola! Tu cuenta es muy reciente (${ageInHours}h). Para evitar ataques, necesitamos que confirmes que eres humano.`,
            )
            .setColor(0xffa500)
            .setFooter({ text: "Hoshiko Sentinel • Seguridad Activa" });

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`verify_alt_${member.id}`)
              .setLabel("¡Soy Humano! ✨")
              .setStyle(ButtonStyle.Success),
          );

          const dm = await member
            .send({ embeds: [verifyEmbed], components: [row] })
            .catch(() => null);

          if (!dm) {
            HoshikoLogger.log({
              level: LogLevel.WARN,
              context: "Security/AntiAlt",
              message: `No pude enviar verificación a ${member.user.tag} (DM cerrado).`,
              guildId: member.guild.id,
            });
          }

          // Log al canal joinlog via sendLog (ANTI_ALT ya mapea a joinlog en LOG_TYPE_CHANNEL)
          await HoshikoLogger.sendLog(
            member.guild,
            "ANTI_ALT",
            `El usuario **${member.user.tag}** tiene una cuenta de solo **${ageInHours}h**. Se solicitó verificación.`,
            member.user,
          );
        } catch (err) {
          console.error("❌ Error en Anti-Alt:", err);
        }
      }
    }

    // ─── 2. AUTO-JOIN ────────────────────────────────────────────────────────
    if (!settings.autoJoin?.enabled || settings.autoJoin.roles.length === 0)
      return;

    const rolesToGive: string[] = [];
    const rolesGivenNames: string[] = [];
    let errorOccurred: string | null = null;

    try {
      const botMember = member.guild.members.me;
      if (!botMember) throw new Error("No puedo encontrarme en el servidor.");

      const botHighestRole = botMember.roles.highest.position;

      for (const roleId of settings.autoJoin.roles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role && role.position < botHighestRole) {
          rolesToGive.push(roleId);
          rolesGivenNames.push(role.name);
        } else if (role) {
          console.warn(`[AutoJoin] Rol "${role.name}" omitido por jerarquía.`);
        }
      }

      if (rolesToGive.length > 0) {
        await member.roles.add(rolesToGive, "🤖 Hoshiko Auto-Join");
      } else {
        errorOccurred =
          "No pude dar ningún rol. Verifica que mi rol esté por encima de los roles a asignar.";
      }
    } catch (error: any) {
      console.error(`❌ Error en Auto-Join (${member.guild.name}):`, error);
      errorOccurred = error.message || "Error desconocido.";
    }

    // Log Auto-Join al canal joinlog
    if (rolesGivenNames.length > 0 || errorOccurred) {
      const logEmbed = new EmbedBuilder().setTimestamp().setFooter({
        text: "Auto-Join • Hoshiko",
        iconURL: member.user.displayAvatarURL(),
      });

      if (errorOccurred) {
        logEmbed
          .setTitle("⚠️ Error en Auto-Join")
          .setColor(0xff0000)
          .setDescription(`No pude asignar roles a **${member.user.tag}**.`)
          .addFields({ name: "Error", value: `\`${errorOccurred}\`` });
      } else {
        logEmbed
          .setTitle("✅ Roles Asignados")
          .setColor(0x00ff00)
          .setDescription(
            `**${member.user.tag}** recibió roles automáticamente.`,
          )
          .addFields({
            name: "Roles",
            value: rolesGivenNames.map((r) => `\`@${r}\``).join(", "),
          });
      }

      // ✅ Usa joinlog en lugar de modLogChannel deprecado
      await HoshikoLogger.sendToChannel(member.guild, "joinlog", logEmbed);
    }
  },
};
