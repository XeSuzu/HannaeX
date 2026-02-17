import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";

export default {
  // 🔴 ANTES: .toJSON() al final
  // 🟢 AHORA: Sin .toJSON() (El deploy script lo hará por ti)
  data: new SlashCommandBuilder()
    .setName("dev-servers")
    .setDescription("🕵️‍♀️ [DEV] Lista secreta de servidores donde estoy."),

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
      return interaction.reply({
        content:
          '🚫 **Acceso Denegado.** Protocolo de seguridad "Hoshiko" activo.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

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
          return `**${index + 1}. ${g.name}**\n🆔 \`${g.id}\` | 👥 ${g.memberCount} miembros | 👑 <@${g.ownerId}>`;
        })
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle(`🕵️‍♀️ Reporte de Infiltración`)
        .setColor("#2b2d31")
        .setDescription(description)
        .addFields(
          {
            name: "📊 Total Servidores",
            value: `${totalServers}`,
            inline: true,
          },
          { name: "👥 Total Usuarios", value: `${totalMembers}`, inline: true },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // 📝 OPCIÓN B: Muchos servidores (Archivo .txt)
    else {
      let fileContent = `🕵️‍♀️ REPORTE DE SERVIDORES - HOSHIKO\n\n`;
      fileContent += `📊 Total: ${totalServers} Servers | 👥 ${totalMembers} Usuarios\n`;
      fileContent += `==================================================\n\n`;

      sortedGuilds.forEach((g, index) => {
        fileContent += `${index + 1}. [${g.name}]\n`;
        fileContent += `   ID: ${g.id}\n`;
        fileContent += `   Miembros: ${g.memberCount}\n`;
        fileContent += `   Dueño ID: ${g.ownerId}\n\n`;
      });

      const buffer = Buffer.from(fileContent, "utf-8");
      const attachment = new AttachmentBuilder(buffer, {
        name: "hoshiko-servers.txt",
      });

      const embed = new EmbedBuilder()
        .setTitle(`🕵️‍♀️ Reporte de Infiltración (Extenso)`)
        .setColor("#2b2d31")
        .setDescription(
          `Estoy en demasiados servidores (**${totalServers}**) para ponerlos aquí.\nTe he generado un archivo secreto con la lista completa.`,
        )
        .addFields({
          name: "👥 Alcance Total",
          value: `${totalMembers} usuarios`,
          inline: true,
        });

      return interaction.editReply({ embeds: [embed], files: [attachment] });
    }
  },
};
