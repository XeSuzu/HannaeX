import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { AutomodManager } from "../../../Features/AutomodManager";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import {
  canModerateTarget,
  checkBotPermissions,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";
import TempModeration from "../../../Database/moderation/tempModeration.model";
import { createCase } from "../../../Database/moderation/case.model";

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
    if (!interaction.guild || !interaction.member) return;

    const modPermCheck = checkModeratorPermissions(
      interaction,
      PermissionFlagsBits.ModerateMembers,
    );
    if (!modPermCheck.ok) {
      await interaction.editReply({
        content: modPermCheck.reason!,
      });
      return;
    }

    const botPermCheck = checkBotPermissions(
      interaction,
      PermissionFlagsBits.ModerateMembers,
    );
    if (!botPermCheck.ok) {
      await interaction.editReply({
        content: botPermCheck.reason!,
      });
      return;
    }

    const target = interaction.options.getMember("usuario");

    if (!target || !(target instanceof GuildMember)) {
      await interaction.editReply({
        content: "🌸 No pude encontrar a ese usuario en este servidor.",
      });
      return;
    }

    const check = canModerateTarget(interaction.member as GuildMember, target);
    if (!check.canModerate) {
      await interaction.editReply({
        content: check.reason || "❌ No tienes jerarquía suficiente para moderar a este usuario.",
      });
      return;
    }

    try {
      if (target.moderatable === false) {
        await interaction.editReply({
          content: "❌ No puedo quitar el silencio a este usuario (su rol es superior al mío o no es moderable).",
        });
        return;
      }
    } catch {
      // Fallback seguro si target es un mock o no tiene cache de roles cargada
    }

    try {
      if (!target.communicationDisabledUntilTimestamp || target.communicationDisabledUntilTimestamp <= Date.now()) {
        await interaction.editReply({
          content: "ℹ️ Ese usuario no tiene un silencio activo.",
        });
        return;
      }

      await target.timeout(null, `Perdonado por ${interaction.user.tag}`);

      await TempModeration.deleteOne({
        guildId: interaction.guild.id,
        userId: target.id,
        tipo: "mute",
      }).catch((err) => {
        console.error("Error al limpiar TempModeration en unmute:", err);
      });

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "unmute",
        `Perdonado manualmente por ${interaction.user.tag}`,
      );

      let caseNumber: number | null = null;
      try {
        const newCase = await createCase({
          guildId: interaction.guild.id,
          userId: target.id,
          modId: interaction.user.id,
          action: "unmute",
          reason: "Silencio retirado manualmente",
          source: "manual",
        });
        caseNumber = newCase.caseId;
      } catch (err) {
        console.error("Error al registrar caso en unmute:", err);
      }

      await HoshikoLogger.logAction(interaction.guild, "UNMUTE", {
        user: target.user,
        moderator: interaction.user,
        reason: "Silencio retirado manualmente",
        caseId: caseNumber,
        source: "Comando",
      });

      const embed = new EmbedBuilder()
        .setTitle(`✨ Silencio Quitado${caseNumber ? ` (Caso #${caseNumber})` : ""}`)
        .setDescription(`Se ha quitado el silencio a **${target.user.tag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          ...(caseNumber ? [{ name: "📋 Caso", value: `#${caseNumber}`, inline: true }] : []),
          {
            name: "🆔 IDs",
            value: `\`User:\` ${target.id}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x00ff7f)
        .setTimestamp()
        .setFooter({ text: caseNumber ? `Caso #${caseNumber} • Silencio retirado` : "Silencio retirado" });

      await interaction.editReply({
        content: "✅ Silencio quitado con éxito.",
        embeds: [embed],
      });
    } catch (err) {
      console.error("❌ Error en comando unmute:", err);
      await interaction.editReply({
        content:
          "🌸 Hubo un error al quitar el silencio. Revisa mis permisos.",
      });
    }
  },
};

export default command;
