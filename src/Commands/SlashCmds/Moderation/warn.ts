import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { AutomodManager } from "../../../Features/AutomodManager";
import { HoshikoClient } from "../../../index";
import { Logger } from "../../../Utils/SystemLogger";
import { addWarning } from "../../../Models/Warning";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Envía una advertencia a un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("El usuario a advertir.").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("motivo").setDescription("Razón de la advertencia.").setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    if (!interaction.guild) return;

    try {
      const target = interaction.options.getMember("usuario") as GuildMember;
      const reason = interaction.options.getString("motivo") || "Sin motivo especificado.";

      if (!target) {
        await interaction.followUp({ content: "❌ No pude encontrar a ese usuario.", flags: MessageFlags.Ephemeral });
        return;
      }
      if (target.id === interaction.user.id) {
        await interaction.followUp({ content: "🌸 No puedes advertirte a ti mismo.", flags: MessageFlags.Ephemeral });
        return;
      }
      if (target.permissions.has(PermissionFlagsBits.ModerateMembers) || target.user.bot) {
        await interaction.followUp({ content: "❌ No puedo advertir a miembros del staff o a otros bots.", flags: MessageFlags.Ephemeral });
        return;
      }

      await addWarning(interaction.guild.id, target.id, interaction.user.id, reason);

      await AutomodManager.executeAction(
        interaction.guild,
        target,
        { type: "warn", reason: `[${interaction.user.tag}] ${reason}` },
        "ManualWarn"
      );

      await HoshikoLogger.logAction(interaction.guild, "WARN", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
      });

      const { getWarnings } = await import("../../../Models/Warning.js");
      const total = (await getWarnings(interaction.guild.id, target.id)).length;

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Advertencia Enviada")
        .setDescription(`Se ha advertido a **${target.user.tag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📊 Total de warns", value: `${total}`, inline: true },
          { name: "📝 Motivo", value: reason },
          { name: "🆔 IDs", value: `\`User:\` ${target.id}\n\`Mod:\` ${interaction.user.id}`, inline: false },
        )
        .setColor(0xffa500)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en /warn:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      await Logger.logCriticalError("WarnCommand", errorMsg);
      await interaction.followUp({ content: "😿 Hubo un error al procesar la advertencia.", flags: MessageFlags.Ephemeral });
    }
  },
};

export default command;
