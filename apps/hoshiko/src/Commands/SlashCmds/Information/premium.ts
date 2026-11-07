import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { PremiumManager } from "../../../Database/guild/PremiumManager";
import { buildSupportButton } from "../../../Utils/inviteUtils";

const SEPARATOR = "╌".repeat(34);

const command: SlashCommand = {
  category: "Information",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("premium")
    .setDescription("🌸 Conoce los beneficios y el estado del servicio Premium en este servidor"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.editReply({
        content: "Este comando solo puede consultarse dentro de un servidor ✨",
      });
      return;
    }

    const guildId = interaction.guild.id;
    const isPremium = await PremiumManager.isPremium(guildId);

    const embed = new EmbedBuilder()
      .setColor(isPremium ? 0xf1c40f : 0xff9eb5)
      .setAuthor({
        name: `Hoshiko • Membresía y Beneficios Premium`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTitle(
        isPremium
          ? "✨ Este servidor cuenta con Licencia Premium Activa"
          : "🌸 Conoce las ventajas de Hoshiko Premium",
      )
      .setDescription(
        `> *Potencia la experiencia y convivencia de tu comunidad con beneficios exclusivos y sin límites.*\n\n` +
          `Hoshiko ofrece todas sus funciones esenciales de forma libre y gratuita. La suscripción **Premium** amplía capacidades clave para comunidades en pleno crecimiento.\n\n` +
          `${SEPARATOR}`,
      )
      .addFields(
        {
          name: "💌 Confesiones Ilimitadas",
          value:
            "• **Estándar:** Hasta 3 canales simultáneos de confesiones.\n" +
            "• **Premium:** Canales de confesiones ilimitados y personalización extendida.",
          inline: false,
        },
        {
          name: "🛡️ Auditoría y Mod-Logs Avanzados",
          value:
            "• Acceso a canales de registro dedicados adicionales en `</setup-logs:0>`.\n" +
            "• Mayor granularidad en el seguimiento de eventos y seguridad comunitaria.",
          inline: false,
        },
        {
          name: "🧠 Cuotas y Capacidades de IA",
          value:
            "• Prioridad de cómputo en el gateway seguro de Gemini Relay.\n" +
            "• Soporte y atención preferencial para solicitudes de asistencia técnica.",
          inline: false,
        },
        {
          name: "💎 Estado en este servidor",
          value: isPremium
            ? `🟢 **¡Suscripción Activa!** Tu servidor disfruta de todos los beneficios desbloqueados.`
            : `⚪ **Plan Estándar Activo.** Todas las funciones básicas operativas sin costo.`,
          inline: false,
        },
      )
      .setFooter({
        text: `Hoshiko v2.0.0 • Hecho con cariño para tu comunidad ✨`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    const supportServer =
      process.env.SUPPORT_SERVER_INVITE || "https://discord.gg/hoshiko";
    const supportBtn = buildSupportButton(supportServer);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(supportBtn);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  },
};

export default command;
