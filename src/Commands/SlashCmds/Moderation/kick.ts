import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import {
  canModerateTarget,
  checkBotPermissions,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";
import { AutomodManager } from "../../../Features/AutomodManager";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa a un usuario del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("El usuario a expulsar.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("razon")
        .setDescription("Razón de la expulsión.")
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild || !interaction.member) return;

    const modPermCheck = checkModeratorPermissions(
      interaction,
      PermissionFlagsBits.KickMembers,
    );
    if (!modPermCheck.ok) {
      await interaction.followUp({
        content: modPermCheck.reason!,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const botPermCheck = checkBotPermissions(
      interaction,
      PermissionFlagsBits.KickMembers,
    );
    if (!botPermCheck.ok) {
      await interaction.followUp({
        content: botPermCheck.reason!,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = interaction.options.getMember("usuario");
    const reason =
      interaction.options.getString("razon") || "No se especificó un motivo.";

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({
        content: "❌ No pude encontrar a ese usuario en este servidor.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetCheck = canModerateTarget(
      interaction.member as GuildMember,
      target,
    );
    if (!targetCheck.canModerate) {
      await interaction.followUp({
        content: targetCheck.reason!,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;

      await target.kick(`${interaction.user.tag}: ${reason}`);

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "kick",
        `Kick manual por ${interaction.user.tag}: ${reason}`,
      );

      await HoshikoLogger.logAction(interaction.guild, "KICK", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
      });

      const embed = new EmbedBuilder()
        .setTitle("👢 Usuario Expulsado")
        .setDescription(`Se ha expulsado a **${targetTag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          { name: "📝 Razón", value: reason, inline: false },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0xff5500)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Usuario expulsado del servidor" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando kick:", error);
      await interaction.followUp({
        content:
          "🌸 Hubo un error al expulsar al usuario. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply("❌ No tienes permisos para expulsar usuarios.");

    const target = message.mentions.members?.first();
    const reason = args.slice(1).join(" ") || "No se especificó un motivo.";

    if (!target)
      return message.reply(
        "❌ Menciona a un usuario. Ej: `x kick @usuario razón`",
      );
    if (target.id === message.author.id)
      return message.reply("🌸 No puedes expulsarte a ti mismo.");
    if (target.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply("❌ No puedo expulsar a un miembro del staff.");

    await target.kick(`${message.author.tag}: ${reason}`);
    await AutomodManager.recordManualAction(
      message.guild,
      target,
      message.author,
      "kick",
      `Kick manual por ${message.author.tag}: ${reason}`,
    );
    await HoshikoLogger.logAction(message.guild, "KICK", {
      user: target.user,
      moderator: message.author,
      reason,
    });

    const embed = new EmbedBuilder()
      .setTitle("👢 Usuario Expulsado")
      .setDescription(`Se ha expulsado a **${target.user.tag}**.`)
      .addFields(
        { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
        {
          name: "👮 Moderador",
          value: `<@${message.author.id}>`,
          inline: true,
        },
        { name: "📝 Razón", value: reason },
      )
      .setColor(0xff5500)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};

export default command;
