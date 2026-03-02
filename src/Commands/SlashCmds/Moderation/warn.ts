import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { AutomodManager } from "../../../Features/AutomodManager";
import { HoshikoClient } from "../../../index";
import { Logger } from "../../../Utils/SystemLogger";
import { addWarning } from "../../../Models/Warning";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
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

    // ❌ ELIMINADO: await interaction.deferReply({ ephemeral: true });

    try {
      const target = interaction.options.getMember("usuario") as GuildMember;
      const reason = interaction.options.getString("motivo") || "Sin motivo especificado.";

      if (!target) {
        await interaction.editReply("❌ No pude encontrar a ese usuario.");
        return;
      }
      if (target.id === interaction.user.id) {
        await interaction.editReply("🌸 No puedes advertirte a ti mismo.");
        return;
      }
      if (target.permissions.has(PermissionFlagsBits.ModerateMembers) || target.user.bot) {
        await interaction.editReply("❌ No puedo advertir a miembros del staff o a otros bots.");
        return;
      }

      // 1. Guardar en DB
      await addWarning(interaction.guild.id, target.id, interaction.user.id, reason);

      // 2. Ejecutar acción de warn (DM al usuario)
      await AutomodManager.executeAction(
        interaction.guild,
        target,
        { type: "warn", reason: `[${interaction.user.tag}] ${reason}` },
        "ManualWarn"
      );

      // 3. Contar warns totales para mostrar en el embed
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
        )
        .setColor(0xffa500)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en /warn:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      await Logger.logCriticalError("WarnCommand", errorMsg);
      await interaction.editReply("😿 Hubo un error al procesar la advertencia.");
    }
  },
};

export default command;