import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
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
    .setName("ban")
    .setDescription("Banea a un usuario del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("El usuario a banear.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("razon").setDescription("Razón del ban.").setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("eliminar-mensajes")
        .setDescription("Eliminar mensajes de los últimos 7 días.")
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario");
    const reason =
      interaction.options.getString("razon") || "No se especificó un motivo.";
    const deleteMessages =
      interaction.options.getBoolean("eliminar-mensajes") ?? false;

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({
        content: "❌ No pude encontrar a ese usuario.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.followUp({
        content: "🌸 No puedes banearte a ti mismo.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.followUp({
        content: "❌ No puedo banear a un miembro del staff.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;

      await target.ban({
        reason: `${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteMessages ? 604800 : 0,
      });

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "ban",
        `Ban manual por ${interaction.user.tag}: ${reason}`,
      );

      await HoshikoLogger.logAction(interaction.guild, "BAN", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        extra: deleteMessages
          ? "Mensajes de 7 días eliminados"
          : "Mensajes preservados",
      });

      const embed = new EmbedBuilder()
        .setTitle("⛔ Usuario Baneado")
        .setDescription(`Se ha baneado a **${targetTag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          { name: "📝 Razón", value: reason, inline: false },
          {
            name: "🗑️ Mensajes",
            value: deleteMessages ? "Eliminados (7 días)" : "Preservados",
            inline: true,
          },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0xff0000)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Usuario baneado del servidor" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando ban:", error);
      await interaction.followUp({
        content: "🌸 Hubo un error al banear al usuario. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply("❌ No tienes permisos para banear usuarios.");

    const target = message.mentions.members?.first();
    const reason = args.slice(1).join(" ") || "No se especificó un motivo.";

    if (!target)
      return message.reply(
        "❌ Menciona a un usuario. Ej: `x ban @usuario razón`",
      );
    if (target.id === message.author.id)
      return message.reply("🌸 No puedes banearte a ti mismo.");
    if (target.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply("❌ No puedo banear a un miembro del staff.");

    const targetTag = target.user.tag;
    const targetId = target.id;

    await target.ban({ reason: `${message.author.tag}: ${reason}` });
    await AutomodManager.recordManualAction(
      message.guild,
      target,
      message.author,
      "ban",
      `Ban manual por ${message.author.tag}: ${reason}`,
    );
    await HoshikoLogger.logAction(message.guild, "BAN", {
      user: target.user,
      moderator: message.author,
      reason,
    });

    const embed = new EmbedBuilder()
      .setTitle("⛔ Usuario Baneado")
      .setDescription(`Se ha baneado a **${targetTag}**.`)
      .addFields(
        { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
        {
          name: "👮 Moderador",
          value: `<@${message.author.id}>`,
          inline: true,
        },
        { name: "📝 Razón", value: reason },
      )
      .setColor(0xff0000)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};

export default command;
