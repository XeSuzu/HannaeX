import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { getWarnings } from "../../../Models/Warning";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Muestra el historial de advertencias de un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Usuario a consultar.")
        .setRequired(true),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild) return;

    // ❌ ELIMINADO: await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
      const target = interaction.options.getMember("usuario") as GuildMember;
      if (!target) {
        await interaction.editReply("❌ No pude encontrar a ese usuario.");
        return;
      }

      const warnings = await getWarnings(interaction.guild.id, target.id);

      if (warnings.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle("📋 Historial de Advertencias")
          .setDescription(
            `**${target.user.tag}** no tiene advertencias registradas. ✨`,
          )
          .setColor(0x00ff7f)
          .setThumbnail(target.displayAvatarURL())
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 Historial de Advertencias")
        .setDescription(
          `**${target.user.tag}** tiene **${warnings.length}** advertencia(s).`,
        )
        .setColor(0xffa500)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID de usuario: ${target.id}` });

      // Mostrar máximo 10 warns para no explotar el embed
      const slice = warnings.slice(0, 10);
      for (const w of slice) {
        const date = new Date(w.createdAt).toLocaleDateString("es-ES");
        embed.addFields({
          name: `⚠️ ${date} — ID: \`${(w as any)._id.toString().slice(-6)}\``,
          value: `**Motivo:** ${w.reason}\n**Mod:** <@${w.moderatorId}>`,
          inline: false,
        });
      }

      if (warnings.length > 10) {
        embed.setFooter({
          text: `Mostrando 10 de ${warnings.length} advertencias. ID: ${target.id}`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en /warnings:", error);
      await interaction.editReply(
        "😿 Hubo un error al consultar las advertencias.",
      );
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply("❌ No tienes permisos para ver advertencias.");

    const target = message.mentions.members?.first();
    if (!target)
      return message.reply(
        "❌ Menciona a un usuario. Ej: `x warnings @usuario`",
      );

    const warnings = await getWarnings(message.guild.id, target.id);

    if (warnings.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📋 Historial de Advertencias")
            .setDescription(`**${target.user.tag}** no tiene advertencias. ✨`)
            .setColor(0x00ff7f)
            .setTimestamp(),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Historial de Advertencias")
      .setDescription(
        `**${target.user.tag}** tiene **${warnings.length}** advertencia(s).`,
      )
      .setColor(0xffa500)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    for (const w of warnings.slice(0, 10)) {
      const date = new Date(w.createdAt).toLocaleDateString("es-ES");
      embed.addFields({
        name: `⚠️ ${date}`,
        value: `**Motivo:** ${w.reason}\n**Mod:** <@${w.moderatorId}>`,
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};

export default command;
