import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Desbanea a un usuario del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("ID del usuario a desbanear.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("razon")
        .setDescription("Razón del desban.")
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild) return;

    const userInput = interaction.options.getString("usuario", true);
    const reason =
      interaction.options.getString("razon") || "No se especificó un motivo.";

    let userId = userInput;

    if (/^\d{17,20}$/.test(userInput)) {
      userId = userInput;
    } else {
      await interaction.followUp({
        content: "❌ Proporciona una ID de usuario válida.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const ban = await interaction.guild.bans.fetch(userId);

      if (!ban) {
        await interaction.followUp({
          content: "❌ Ese usuario no está baneado.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const userTag = ban.user.tag;
      const user = ban.user;

      await interaction.guild.bans.remove(
        userId,
        `${interaction.user.tag}: ${reason}`,
      );

      await HoshikoLogger.logAction(interaction.guild, "UNWARN", {
        user: user,
        moderator: interaction.user,
        reason: reason,
        extra: "Usuario desbaneado manualmente",
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Usuario Desbaneado")
        .setDescription(`**${userTag}** ha sido desbaneado.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${userId}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          { name: "📝 Razón", value: reason, inline: false },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${userId}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0x00ff7f)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Usuario desbaneado del servidor" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando unban:", error);
      await interaction.followUp({
        content: "🌸 Hubo un error al desbanear. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply("❌ No tienes permisos para desbanear usuarios.");

    const userId = args[0];
    const reason = args.slice(1).join(" ") || "No se especificó un motivo.";

    if (!userId || !/^\d{17,20}$/.test(userId))
      return message.reply(
        "❌ Proporciona una ID válida. Ej: `x unban 123456789012345678`",
      );

    const ban = await message.guild.bans.fetch(userId).catch(() => null);
    if (!ban) return message.reply("❌ Ese usuario no está baneado.");

    await message.guild.bans.remove(userId, `${message.author.tag}: ${reason}`);
    await HoshikoLogger.logAction(message.guild, "UNWARN", {
      user: ban.user,
      moderator: message.author,
      reason,
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ Usuario Desbaneado")
      .setDescription(`**${ban.user.tag}** ha sido desbaneado.`)
      .addFields(
        { name: "👤 Usuario", value: `<@${userId}>`, inline: true },
        {
          name: "👮 Moderador",
          value: `<@${message.author.id}>`,
          inline: true,
        },
        { name: "📝 Razón", value: reason },
      )
      .setColor(0x00ff7f)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};

export default command;
