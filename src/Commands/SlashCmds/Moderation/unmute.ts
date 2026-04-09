import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { AutomodManager } from "../../../Features/AutomodManager";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Quita el silencio a un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("El usuario al que quitar el silencio.")
        .setRequired(true),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario");

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({
        content: "🌸 No pude encontrar a ese usuario.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      if (target.communicationDisabledUntilTimestamp) {
        await target.timeout(null, `Perdonado por ${interaction.user.tag}`);
      } else {
        await interaction.followUp({
          content: "ℹ️ Ese usuario no tiene un silencio activo.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "unmute",
        `Perdonado manualmente por ${interaction.user.tag}`,
      );

      await HoshikoLogger.logAction(interaction.guild, "UNWARN", {
        user: target.user,
        moderator: interaction.user,
        reason: "Silencio perdonado",
        extra: `Originalmente silenciado por timeout`,
      });

      const embed = new EmbedBuilder()
        .setTitle("✨ Silencio Quitado")
        .setDescription(`Se ha quitado el silencio a **${target.user.tag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${target.id}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x00ff7f)
        .setTimestamp();

      await interaction.editReply({
        content: "✅ Silencio quitado con éxito.",
        embeds: [embed],
      });

      if (
        interaction.channel &&
        interaction.channel.isTextBased() &&
        "send" in interaction.channel
      ) {
        await (interaction.channel as TextChannel).send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Error en comando unmute:", err);
      await interaction
        .followUp({
          content:
            "🌸 Hubo un error al quitar el silencio. Revisa mis permisos.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply("❌ No tienes permisos para quitar silencios.");

    const target = message.mentions.members?.first();
    if (!target)
      return message.reply("❌ Menciona a un usuario. Ej: `x unmute @usuario`");

    if (!target.communicationDisabledUntilTimestamp)
      return message.reply("ℹ️ Ese usuario no tiene un silencio activo.");

    await target.timeout(null, `Perdonado por ${message.author.tag}`);
    await AutomodManager.recordManualAction(
      message.guild,
      target,
      message.author,
      "unmute",
      `Perdonado por ${message.author.tag}`,
    );
    await HoshikoLogger.logAction(message.guild, "UNWARN", {
      user: target.user,
      moderator: message.author,
      reason: "Silencio perdonado",
    });

    const embed = new EmbedBuilder()
      .setTitle("✨ Silencio Quitado")
      .setDescription(`Se ha quitado el silencio a **${target.user.tag}**.`)
      .addFields(
        { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
        {
          name: "👮 Moderador",
          value: `<@${message.author.id}>`,
          inline: true,
        },
      )
      .setColor(0x00ff7f)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};

export default command;
