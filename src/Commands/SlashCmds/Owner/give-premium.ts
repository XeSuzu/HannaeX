import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import ServerConfig from "../../../Models/serverConfig";
// 👇 1. Importamos el Logger nuevo
import { Logger } from "../../../Utils/SystemLogger";

export default {
  category: "Owner",
  data: new SlashCommandBuilder()
    .setName("give-premium")
    .setDescription("👑 [Sistema] Asignar Premium manualmente")
    .addStringOption((opt) =>
      opt
        .setName("server_id")
        .setDescription("ID del Servidor")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("dias")
        .setDescription("Días de duración (0 para quitar)")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // 🔒 1. VERIFICACIÓN DE IDENTIDAD
    const ownerId = process.env.BOT_OWNER_ID;

    if (interaction.user.id !== ownerId) {
      // 🚨 ALERTA DE INTRUSO (Corregido: Sin 'client')
      Logger.logSecurityBreach(interaction.user, "give-premium");

      return interaction.reply({
        content:
          "⛔ **ACCESO DENEGADO**\nIncidente reportado al administrador del sistema.",
        ephemeral: true,
      });
    }

    const targetGuildId = interaction.options.getString("server_id", true);
    const days = interaction.options.getInteger("dias", true);

    await interaction.deferReply({ ephemeral: true });

    try {
      // 2. Buscamos o Creamos la configuración
      // upsert: true crea el documento si no existe automáticamente
      let config = await ServerConfig.findOneAndUpdate(
        { guildId: targetGuildId },
        {}, // No cambiamos nada todavía, solo buscamos/creamos
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (days > 0) {
        // === SUMAR DÍAS ===
        const now = new Date();
        const currentExp = config.premiumUntil
          ? new Date(config.premiumUntil)
          : new Date();

        // Lógica de fecha: Si ya venció, empezamos desde HOY. Si sigue activo, sumamos a lo que queda.
        // Usamos .getTime() para crear una copia limpia de la fecha
        const baseDate =
          currentExp > now ? new Date(currentExp.getTime()) : new Date();

        // Sumamos los días
        baseDate.setDate(baseDate.getDate() + days);

        // Guardamos
        config.premiumUntil = baseDate;
        await config.save();

        // 📝 Log de transacción (Corregido: Sin 'client')
        Logger.logTransaction(
          interaction.user,
          `✅ **Añadido:** ${days} días\n🏢 **Server ID:** \`${targetGuildId}\`\n📅 **Vence:** <t:${Math.floor(baseDate.getTime() / 1000)}:R>`,
        );

        return interaction.editReply({
          content: `✅ **Listo.** Servidor \`${targetGuildId}\` ahora es Premium.\n📅 **Vence:** <t:${Math.floor(baseDate.getTime() / 1000)}:F>`,
        });
      } else {
        // === QUITAR PREMIUM ===
        config.premiumUntil = null; // Mongoose acepta null si el tipo es Date
        await config.save();

        // 📝 Log de transacción
        Logger.logTransaction(
          interaction.user,
          `🗑️ **Removido:** Premium quitado manual\n🏢 **Server ID:** \`${targetGuildId}\``,
        );

        return interaction.editReply({
          content: `🗑️ **Premium eliminado** del servidor \`${targetGuildId}\`.`,
        });
      }
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: "❌ Error al acceder a la base de datos.",
      });
    }
  },
};
