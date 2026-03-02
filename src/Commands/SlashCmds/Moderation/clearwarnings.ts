import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags, 
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";
import { clearWarnings } from "../../../Models/Warning";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Elimina todas las advertencias de un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Usuario al que limpiar las advertencias.")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    // 🚨 REGLA DE ORO: ¡El deferReply va primero que absolutamente TODO!
    // Usamos la nueva sintaxis estricta de Discord.js v14+
    // ❌ ELIMINADO: await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Ahora sí, hacemos las validaciones después de haberle dicho a Discord "¡Espera, estoy pensando!"
    if (!interaction.guild) {
      await interaction.editReply("❌ Este comando solo se puede usar dentro de un servidor.");
      return;
    }

    try {
      // Intentamos obtener el miembro. (Usar getUser y luego fetch es más seguro, pero getMember funciona si está en caché)
      const target = interaction.options.getMember("usuario") as GuildMember;
      
      if (!target) {
        await interaction.editReply("❌ No pude encontrar a ese usuario en el servidor.");
        return;
      }

      // ⏳ Llamada a MongoDB (Aquí es donde el deferReply nos salva la vida)
      const deleted = await clearWarnings(interaction.guild.id, target.id);

      if (deleted === 0) {
        await interaction.editReply(`ℹ️ **${target.user.tag}** no tenía advertencias registradas.`);
        return;
      }

      // 🎨 Construimos el Embed
      const embed = new EmbedBuilder()
        .setTitle("🧹 Advertencias Limpiadas")
        .setDescription(`Se eliminaron **${deleted}** advertencia(s) de **${target.user.tag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
        )
        .setColor(0x00ff7f)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      // ✨ Respuesta final exitosa
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("❌ Error en /clearwarnings:", error);
      // Siempre respondemos algo, incluso si todo explota
      await interaction.editReply("😿 Hubo un error interno al limpiar las advertencias de la base de datos.");
    }
  },
};

export default command;