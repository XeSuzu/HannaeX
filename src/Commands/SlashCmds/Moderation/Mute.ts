import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  TextChannel,
} from "discord.js";
import ms from "ms";
import { AutomodManager } from "../../../Features/AutomodManager";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Silencia a un usuario por un tiempo determinado.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("El usuario a silenciar.").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("tiempo").setDescription("Duración (ej: 10m, 1h, 1d).").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("motivo").setDescription("Razón del silencio.").setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    // ✅ Defer al inicio para evitar 10062
    // ❌ ELIMINADO: await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember("usuario");
    const timeInput = interaction.options.getString("tiempo", true);
    const reason = interaction.options.getString("motivo") || "No se especificó un motivo.";

    if (!target || !(target instanceof GuildMember)) {
      await interaction.editReply({ content: "❌ No pude encontrar a ese usuario." });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: "🌸 No puedes silenciarte a ti mismo." });
      return;
    }
    if (target.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({ content: "❌ No puedo silenciar a un miembro del staff." });
      return;
    }

    const duration = ms(timeInput as any);
    if (!duration || typeof duration !== "number" || duration < 5000 || duration > 2419200000) {
      await interaction.editReply({
        content: "❌ Tiempo no válido (ej: 10m, 1h) o fuera de rango (máximo 28 días).",
      });
      return;
    }

    try {
      await target.timeout(duration, reason);

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "mute",
        `Mute manual por ${interaction.user.tag}: ${reason}`,
      );

      const embed = new EmbedBuilder()
        .setTitle("🔇 Usuario Silenciado")
        .setDescription(`Se ha aplicado un silencio a **${target.user.tag}**.`)
        .addFields(
          { name: "⏳ Duración", value: `\`${timeInput}\``, inline: true },
          { name: "📝 Motivo", value: reason, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
        )
        .setColor(0xffb6c1)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Acción registrada en el historial" });

      await interaction.editReply({ content: "✅ Silencio aplicado con éxito." });

      if (interaction.channel && interaction.channel.isTextBased() && "send" in interaction.channel) {
        await (interaction.channel as TextChannel).send({ embeds: [embed] });
      }
    } catch (error) {
      console.error("💥 Error en comando mute:", error);
      await interaction.editReply({
        content: "🌸 Hubo un error al silenciar al usuario. Revisa mis permisos.",
      });
    }
  },
};

export default command;