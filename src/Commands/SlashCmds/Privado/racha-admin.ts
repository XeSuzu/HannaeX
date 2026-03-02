// src/Commands/SlashCmds/Privado/racha-admin.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { StreakGroup } from "../../../Models/StreakGroup";
import { HoshikoClient } from "../../../index";

const command: SlashCommand = {
  category: "Privado",
  data: new SlashCommandBuilder()
    .setName("racha-admin")
    .setDescription("⚙️ Comandos de administración para el sistema de rachas (Solo Owner).")
    .setDefaultMemberPermissions(0) // Oculta el comando para usuarios sin permisos de admin
    .addSubcommand((sub) =>
      sub
        .setName("ver")
        .setDescription("Inspeccionar los datos crudos de una racha por su ID.")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("El ID de la racha a inspeccionar.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("descongelar")
        .setDescription("Reactiva una racha que está en estado 'frozen'.")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("El ID de la racha a descongelar.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("disolver")
        .setDescription("Disuelve una racha por su ID (acción administrativa).")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("El ID de la racha a disolver.")
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    // -------------------- 🚨 CAPA DE SEGURIDAD 🚨 --------------------
    // Este comando SOLO debe ser accesible por el propietario y el staff.
    const ownerId = process.env.BOT_OWNER_ID || "";
    const staffIds = (process.env.BOT_STAFF_IDS || "").split(",").map(id => id.trim());
    const authorizedUsers = [ownerId, ...staffIds].filter(Boolean);

    if (!authorizedUsers.includes(interaction.user.id)) {
      await interaction.editReply({
        content: "⛔ Acceso denegado. Este comando es solo para el staff autorizado.",
      });
      return;
    }
    // -----------------------------------------------------------------

    const sub = interaction.options.getSubcommand();

    if (sub === "ver") {
      const groupId = interaction.options.getString("id", true);

      try {
        const streak = await StreakGroup.findById(groupId).lean();

        if (!streak) {
          await interaction.editReply({ content: `❌ No se encontró ninguna racha con el ID: \`${groupId}\`` });
          return;
        }

        const streakDataString = JSON.stringify(streak, null, 2);

        const embed = new EmbedBuilder()
          .setTitle(`🔍 Inspeccionando Racha: ${streak.name}`)
          .setColor(0x00ffff)
          .setDescription(`\`\`\`json\n${streakDataString.substring(0, 4000)}\`\`\``)
          .setFooter({ text: `ID: ${streak._id}` });

        await interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        await interaction.editReply({ content: `❌ Ocurrió un error al buscar la racha: \`${error.message}\`` });
      }
    } else if (sub === "descongelar") {
      const groupId = interaction.options.getString("id", true);

      try {
        const streak = await StreakGroup.findById(groupId);

        if (!streak) {
          await interaction.editReply({ content: `❌ No se encontró ninguna racha con el ID: \`${groupId}\`` });
          return;
        }

        if (streak.status !== "frozen") {
          await interaction.editReply({ content: `⚠️ La racha **${streak.name}** no está congelada. Su estado actual es \`${streak.status}\`.` });
          return;
        }

        streak.status = "active";
        await streak.save();

        await interaction.editReply({ content: `✅ La racha **${streak.name}** ha sido descongelada y vuelve a estar activa.` });
      } catch (error: any) {
        await interaction.editReply({ content: `❌ Ocurrió un error al descongelar la racha: \`${error.message}\`` });
      }
    } else if (sub === "disolver") {
      const groupId = interaction.options.getString("id", true);

      try {
        const streak = await StreakGroup.findById(groupId);

        if (!streak) {
          await interaction.editReply({ content: `❌ No se encontró ninguna racha con el ID: \`${groupId}\`` });
          return;
        }

        if (streak.status === "dissolved") {
          await interaction.editReply({ content: `⚠️ La racha **${streak.name}** ya está disuelta.` });
          return;
        }

        const oldStatus = streak.status;
        const oldStreak = streak.currentStreak;

        if (oldStreak > 0) {
          streak.breakHistory.push({
            brokenAt: new Date(),
            daysReached: oldStreak,
            reason: "dissolved",
          });
        }

        streak.status = "dissolved";
        streak.currentStreak = 0;
        await streak.save();

        await interaction.editReply({ content: `✅ La racha **${streak.name}** ha sido disuelta administrativamente. Su estado anterior era \`${oldStatus}\` con ${oldStreak} días.` });
      } catch (error: any) {
        await interaction.editReply({ content: `❌ Ocurrió un error al disolver la racha: \`${error.message}\`` });
      }
    }
  },
};

export default command;