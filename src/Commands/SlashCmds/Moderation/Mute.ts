import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { InfractionManager } from "../../../Features/InfractionManager";
import ms from "ms";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Silencia a un usuario por un tiempo determinado.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario que deseas silenciar.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("tiempo")
        .setDescription("Duración del silencio (ej: 10m, 1h, 1d).")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("motivo")
        .setDescription("Razón del silencio.")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario") as GuildMember;
    const timeInput = interaction.options.getString("tiempo");
    const reason =
      interaction.options.getString("motivo") || "No se especificó un motivo.";

    // 1. Validaciones de Seguridad 🛡️
    if (!target) {
      await interaction.reply({
        content: "❌ No pude encontrar a ese usuario.",
        ephemeral: true,
      });
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.reply({
        content: "🌸 No puedes silenciarte a ti mismo, tontito.",
        ephemeral: true,
      });
      return;
    }

    if (target.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: "❌ No puedo silenciar a un miembro del staff.",
        ephemeral: true,
      });
      return;
    }

    // 2. Cálculo del tiempo ⏳
    if (!timeInput) {
      await interaction.reply({
        content: "❌ Debes especificar un tiempo válido.",
        ephemeral: true,
      });
      return;
    }

    // ✨ TRUCO: Usamos (ms as any) para saltar el error de Overload de TypeScript
    const duration = (ms as any)(timeInput);

    if (
      !duration ||
      typeof duration !== "number" ||
      duration < 5000 ||
      duration > 2419200000
    ) {
      await interaction.reply({
        content:
          "❌ Tiempo no válido (ej: 10m, 1h) o fuera de rango (máximo 28 días).",
        ephemeral: true,
      });
      return;
    }

    try {
      // 3. Aplicar el timeout en Discord
      await target.timeout(duration, reason);

      // 4. Sumar puntos de infracción 📊
      // Quitamos el número fijo (20) que daba error en el build
      await InfractionManager.addPoints(
        target,
        `Mute manual: ${reason}`,
        interaction as any,
      );

      const embed = new EmbedBuilder()
        .setTitle("🔇 Usuario Silenciado")
        .setDescription(`Se ha aplicado un silencio a **${target.user.tag}**.`)
        .addFields(
          { name: "⏳ Duración", value: `\`${timeInput}\``, inline: true },
          { name: "📝 Motivo", value: reason, inline: true },
        )
        .setColor(0xffb6c1)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Hoshiko Sentinel 📡" });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando mute:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "🌸 Hubo un error al intentar silenciar al usuario.",
        });
      } else {
        await interaction.reply({
          content: "🌸 Hubo un error al intentar silenciar al usuario.",
          ephemeral: true,
        });
      }
    }
  },
};
