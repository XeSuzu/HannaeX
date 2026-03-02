import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Setups",
  data: new SlashCommandBuilder()
    .setName("setprefix")
    .setDescription(
      "🔧 Cambia el prefijo de comandos de texto (Por defecto es x).",
    )
    .addStringOption((option) =>
      option
        .setName("nuevo")
        .setDescription("El nuevo símbolo (ej: ., !, ?)")
        .setRequired(true)
        .setMaxLength(3),
    ) // Limitamos a 3 caracteres para evitar trolls
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 🔒 Solo Admins

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // Obtenemos el nuevo prefijo que escribió el usuario
    const newPrefix = interaction.options.getString("nuevo", true);

    // ❌ ELIMINADO: await interaction.deferReply();

    try {
      // 💾 GUARDAR EN BASE DE DATOS
      // Buscamos por ID de servidor.
      // Si existe: actualizamos 'prefix'.
      // Si NO existe: lo creamos (upsert: true).
      await ServerConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { prefix: newPrefix },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      // Confirmación
      await interaction.editReply({
        content: `✅ **¡Configuración actualizada!**\n\nAhora el prefijo del servidor es: \`${newPrefix}\`\n> Ejemplo de uso: \`${newPrefix}ping\``,
      });
    } catch (error) {
      console.error("Error cambiando prefijo:", error);
      await interaction.editReply(
        "❌ Hubo un error al guardar el prefijo en la base de datos.",
      );
    }
  },
};
export default command;