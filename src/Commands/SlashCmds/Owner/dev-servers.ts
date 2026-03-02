import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { Logger } from "../../../Utils/SystemLogger";

const command: SlashCommand = {
  // 🔴 ANTES: .toJSON() al final
  // 🟢 AHORA: Sin .toJSON() (El deploy script lo hará por ti)
  data: new SlashCommandBuilder()
    .setName("dev-servers")
    .setDescription(" [DEV] Te muestro todos los lugares donde vivo, nya~"),

  // Agregamos esto para asegurar que el deploy sepa que es privado
  category: "Owner",

  async execute(interaction: ChatInputCommandInteraction) {
    // 🔒 CERROJO DE SEGURIDAD
    const ownerId = process.env.BOT_OWNER_ID;

    // Validación extra por si se te olvidó ponerlo en el .env
    if (!ownerId) {
      return interaction.reply({
        content:
          "⚠️ **Error de Configuración:** Falta `BOT_OWNER_ID` en el archivo .env",
        ephemeral: true,
      });
    }

    if (interaction.user.id !== ownerId) {
      // 📊 Log de intento de acceso no autorizado
      await Logger.logSecurityBreach(interaction.user, "dev-servers");
      
      return interaction.reply({
        content: "🚫 ¡Oye! Solo mi creador puede ver esto, ¡miau!",
        ephemeral: true,
      });
    }

    // ❌ ELIMINADO: await interaction.deferReply({ ephemeral: true });

    const guilds = interaction.client.guilds.cache;

    const totalServers = guilds.size;
    const totalMembers = guilds.reduce(
      (acc, guild) => acc + guild.memberCount,
      0,
    );

    const sortedGuilds = [...guilds.values()].sort(
      (a, b) => b.memberCount - a.memberCount,
    );

    // 📝 OPCIÓN A: Pocos servidores (Embed visual)
    if (totalServers <= 10) {
      const description = sortedGuilds
        .map((g, index) => {
          return `**${index + 1}. ${g.name}**\n> 🆔 \`${g.id}\`\n> 👥 ${g.memberCount} personitas\n> 👑 Creado por <@${g.ownerId}>`;
        })
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle(`🌸 Mis Casitas Actuales`)
        .setColor("#2b2d31")
        .setDescription(description)
        .addFields(
          {
            name: "🏡 Total de Casitas",
            value: `${totalServers}`,
            inline: true,
          },
          { name: " Total de Amigos", value: `${totalMembers}`, inline: true },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // 📝 OPCIÓN B: Muchos servidores (Archivo .txt)
    else {
      let fileContent = `🌸 MI DIARIO SECRETO DE CASITAS - HOSHIKO 🌸\n\n`;
      fileContent += `📊 Total: ${totalServers} casitas | 💖 ${totalMembers} amigos en total\n`;
      fileContent += `==================================================\n\n`;

      sortedGuilds.forEach((g, index) => {
        fileContent += `${index + 1}. [${g.name}]\n`;
        fileContent += `   ID: ${g.id}\n`;
        fileContent += `   Personitas: ${g.memberCount}\n`;
        fileContent += `   Dueño/a: ${g.ownerId}\n\n`;
      });

      const buffer = Buffer.from(fileContent, "utf-8");
      const attachment = new AttachmentBuilder(buffer, {
        name: "hoshiko-servers.txt",
      });

      const embed = new EmbedBuilder()
        .setTitle(`🌸 ¡Tengo muchas casitas!`)
        .setColor("#2b2d31")
        .setDescription(
          `¡Miau! Son demasiadas casitas (**${totalServers}**) para un solo mensajito.\n¡Pero no te preocupes! Te hice un diario secreto con la lista completa, nya~ 💖`,
        )
        .addFields({
          name: "💖 Amigos Totales",
          value: `${totalMembers} personitas`,
          inline: true,
        });

      return interaction.editReply({ embeds: [embed], files: [attachment] });
    }
  },
};
export default command;