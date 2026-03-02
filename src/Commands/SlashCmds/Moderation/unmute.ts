import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  TextChannel,
} from "discord.js";
import { AutomodManager } from "../../../Features/AutomodManager";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Quita el silencio a un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("El usuario al que quitar el silencio.").setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    // ✅ Defer al inicio para evitar 10062
    // ❌ ELIMINADO: await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember("usuario");

    if (!target || !(target instanceof GuildMember)) {
      await interaction.editReply({ content: "🌸 No pude encontrar a ese usuario." });
      return;
    }

    try {
      if (target.communicationDisabledUntilTimestamp) {
        await target.timeout(null, `Perdonado por ${interaction.user.tag}`);
      } else {
        await interaction.editReply({ content: "ℹ️ Ese usuario no tiene un silencio activo." });
        return;
      }

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "unmute",
        `Perdonado manualmente por ${interaction.user.tag}`,
      );

      const embed = new EmbedBuilder()
        .setTitle("✨ Silencio Quitado")
        .setDescription(`Se ha quitado el silencio a **${target.user.tag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
        )
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x00ff7f)
        .setTimestamp();

      await interaction.editReply({ content: "✅ Silencio quitado con éxito." });

      if (interaction.channel && interaction.channel.isTextBased() && "send" in interaction.channel) {
        await (interaction.channel as TextChannel).send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Error en comando unmute:", err);
      await interaction.editReply({
        content: "🌸 Hubo un error al quitar el silencio. Revisa mis permisos.",
      }).catch(() => {});
    }
  },
};

export default command;