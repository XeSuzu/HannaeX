import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { createCase } from "../../../Database/moderation/case.model";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Moderation",
  options: {
    ephemeral: true,
  },
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("🧹 Elimina mensajes masivamente en el canal actual (hasta 100).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName("cantidad")
        .setDescription("Número de mensajes a eliminar (1 - 100).")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Filtrar solo los mensajes de este usuario.")
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) return;

    const cantidad = interaction.options.getInteger("cantidad", true);
    const targetUser = interaction.options.getUser("usuario");
    const channel = interaction.channel as TextChannel;

    try {
      const fetched = await channel.messages.fetch({ limit: cantidad });
      const now = Date.now();
      const fourteenDaysAgo = now - 14 * 86_400_000;

      const eligible = fetched.filter(
        (m) =>
          m.createdTimestamp > fourteenDaysAgo &&
          (!targetUser || m.author.id === targetUser.id)
      );

      if (eligible.size === 0) {
        await interaction.editReply(
          "⚠️ No se encontraron mensajes eliminables (los mensajes mayores a 14 días no pueden borrarse masivamente).",
        );
        return;
      }

      const deleted = await channel.bulkDelete(eligible, true);
      const deletedCount = deleted.size;

      // Registrar caso de moderación
      await createCase({
        guildId: interaction.guild.id,
        userId: targetUser ? targetUser.id : interaction.user.id,
        modId: interaction.user.id,
        action: "purge",
        reason: `Purga de ${deletedCount} mensajes en #${channel.name}${targetUser ? ` (solo de @${targetUser.tag})` : ""}`,
        source: "manual",
      });

      await HoshikoLogger.sendLog(
        interaction.guild,
        "SECURITY",
        `🧹 **Purga ejecutada:** <@${interaction.user.id}> eliminó ${deletedCount} mensajes en <#${channel.id}>${targetUser ? ` de <@${targetUser.id}>` : ""}.`,
        interaction.user,
      );

      await interaction.editReply(`✅ Se eliminaron **${deletedCount}** mensajes con éxito.`);
    } catch (error: any) {
      console.error("Error en comando /purge:", error);
      await interaction.editReply("❌ Ocurrió un error al intentar eliminar los mensajes.");
    }
  },
};

export default command;
