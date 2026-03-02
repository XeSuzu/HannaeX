import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActivityType,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";

const curiosidades = [
  "🌸 Hoshiko significa 'niña de las estrellas' en japonés.",
  "🐾 Hoshiko fue creada con mucho amor y demasiado café.",
  "✨ El primer comando que tuvo Hoshiko fue `ping`.",
  "🌙 Hoshiko trabaja 24/7 sin descanso, ¡incluso de madrugada!",
  "💫 El color morado de Hoshiko representa creatividad y magia.",
  "🎀 Cada respuesta de Hoshiko tiene un toque kawaii intencional.",
  "🌟 Hoshiko está construida sobre Discord.js v14 y TypeScript.",
  "🎉 Cada actualización de Hoshiko trae nuevas sorpresas y mejoras basadas en el feedback de la comunidad.",
  "💖 Hoshiko tiene un sistema de agradecimientos para reconocer a quienes contribuyen al proyecto, desde testers hasta colaboradores.",
  "🌟 Hoshiko tiene planes de expandirse con nuevas funcionalidades, integraciones y eventos especiales para mantener la experiencia fresca y emocionante para todos los usuarios.",
];

const testers = [
  { name: "Tester 1", note: "Primera en reportar bugs 🐛" },
  { name: "Tester 2", note: "Rey del estrés testing 💥" },
  { name: "Tester 3", note: "Siempre con ideas increíbles 💡" },
];

const command: SlashCommand = {
  category: "Information",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("infocreator")
    .setDescription("🌸 Descubre todo sobre el proyecto Hoshiko"),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    // await interaction.deferReply({ ephemeral: true });

    const creatorId = process.env.BOT_OWNER_ID || client.application?.owner?.id;
    const creator = await client.users.fetch(creatorId!).catch(() => null);
    if (!creator) {
      await interaction.editReply({ content: "😿 No pude cargar los datos del proyecto..." });
      return;
    }

    await creator.fetch(true);

    // Stats
    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const uptimeMs = client.uptime ?? 0;
    const uptimeHours = Math.floor(uptimeMs / 1000 / 60 / 60);
    const uptimeMinutes = Math.floor((uptimeMs / 1000 / 60) % 60);

    // Curiosidad random
    const curiosidad = curiosidades[Math.floor(Math.random() * curiosidades.length)];

    // Agradecimientos
    const testersText = testers.map(t => `**${t.name}** — ${t.note}`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🌸 Sobre el Proyecto Hoshiko")
      .setDescription(
        `Hoshiko es un bot de Discord creado con pasión por **${creator.username}**.\nUna experiencia kawaii, funcional y llena de amor. 💜`
      )
      .setThumbnail(creator.displayAvatarURL({ size: 256 }))
      .setColor(creator.accentColor ?? 0x9b59b6)
      .addFields(
        {
          name: "👾 Estadísticas",
          value: [
            `🏠 **Servidores:** ${totalServers}`,
            `👥 **Usuarios totales:** ${totalUsers.toLocaleString()}`,
            `⏱️ **Uptime:** ${uptimeHours}h ${uptimeMinutes}m`,
          ].join("\n"),
          inline: false,
        },
        {
          name: "✨ Curiosidad del día",
          value: curiosidad,
          inline: false,
        },
        {
          name: "💖 Agradecimientos especiales",
          value: `Gracias a los testers que hicieron posible este proyecto:\n\n${testersText}`,
          inline: false,
        },
        {
          name: "🛠️ Stack técnico",
          value: "Discord.js v14 • TypeScript • Node.js",
          inline: false,
        }
      )
      .setFooter({
        text: `Hoshiko Bot • Con amor desde el principio 🌙`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
