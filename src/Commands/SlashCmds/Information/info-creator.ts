import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";

const SEPARATOR = "╌".repeat(34);

const CURIOSIDADES = [
  "Hoshiko significa *niña de las estrellas* en japonés 🌠",
  "Fue creada con mucho amor y demasiado café a las 3am ☕",
  "El primer comando que tuvo fue `ping`. Humilde origen.",
  "Trabaja 24/7 sin descanso, incluso de madrugada 🌙",
  "Está construida sobre Discord.js v14 y TypeScript 🛠️",
  "Cada actualización nace del feedback real de la comunidad 💬",
  "Tiene memoria — recuerda tus preferencias entre sesiones 🧠",
  "Su IA puede buscar en internet en tiempo real 🌐",
];

const CONTRIBUTORS: {
  id: string;
  tag: string;
  note: string;
  emoji: string;
  flavor: string;
}[] = [
  {
    id: "1031006071411724308",
    tag: ".0yrxx",
    note: "Mejoras en VC",
    emoji: "🎙️",
    flavor:
      "la que se sentó en VC y dijo *'esto podría estar mejor'*. tenía razón.",
  },
  {
    id: "798965856204750898",
    tag: "aguss9999_",
    note: "Ideas de comandos",
    emoji: "💡",
    flavor: "responsable de más de una feature que hoy usas sin darte cuenta.",
  },
];

const command: SlashCommand = {
  category: "Information",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("infocreator")
    .setDescription("🌸 Descubre todo sobre el proyecto Hoshiko"),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    const creatorId = process.env.BOT_OWNER_ID || client.application?.owner?.id;
    const creator = await client.users.fetch(creatorId!).catch(() => null);

    if (!creator) {
      await interaction.editReply({
        content: "😿 No pude cargar los datos del proyecto...",
      });
      return;
    }

    await creator.fetch(true);

    // ── Stats ──────────────────────────────────────────────
    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce(
      (acc, g) => acc + g.memberCount,
      0,
    );
    const uptimeMs = client.uptime ?? 0;
    const uptimeH = Math.floor(uptimeMs / 1000 / 60 / 60);
    const uptimeM = Math.floor((uptimeMs / 1000 / 60) % 60);
    const ping = client.ws.ping;

    const curiosidad =
      CURIOSIDADES[Math.floor(Math.random() * CURIOSIDADES.length)];

    // ── Fetch contributors ─────────────────────────────────
    const contributorsText = (
      await Promise.all(
        CONTRIBUTORS.map(async (c) => {
          const user = await client.users.fetch(c.id).catch(() => null);
          const display = user ? `**${user.username}**` : `**${c.tag}**`;
          return (
            `${c.emoji} ${display}\n` + `\u200b \u200b \u200b *${c.flavor}*`
          );
        }),
      )
    ).join("\n\n");

    const embed = new EmbedBuilder()
      .setColor(creator.accentColor ?? 0xff8fab)
      .setAuthor({
        name: `Proyecto Hoshiko — por ${creator.username}`,
        iconURL: creator.displayAvatarURL({ size: 256 }),
      })
      .setTitle("🌸 ¿Quién soy?")
      .setDescription(
        `> *Un bot de Discord hecho con pasión, código bonito y demasiado café.*\n\n` +
          `Creada por **${creator.username}** desde cero — full stack, ` +
          `sin plantillas, sin atajos. Cada feature fue pensada, discutida y ` +
          `peleada con el compilador hasta que funcionó. Hoshiko es el resultado ` +
          `de alguien que no se conformó con lo genérico.\n\n` +
          `${SEPARATOR}`,
      )
      .setThumbnail(creator.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "📊 En números",
          value: [
            `\`🏠\` Servidores **${totalServers}**`,
            `\`👥\` Usuarios **${totalUsers.toLocaleString()}**`,
            `\`⏱️\` Uptime **${uptimeH}h ${uptimeM}m**`,
            `\`📡\` Ping **${ping}ms**`,
          ].join("\n"),
          inline: true,
        },
        {
          name: "🛠️ Stack",
          value: [
            `\`⚙️\` Discord.js **v14**`,
            `\`📘\` TypeScript`,
            `\`🟢\` Node.js`,
            `\`🍃\` MongoDB`,
          ].join("\n"),
          inline: true,
        },
        {
          name: "✨ Curiosidad del día",
          value: `> ${curiosidad}`,
          inline: false,
        },
        {
          name: "💖 Contribuidores",
          value:
            `Sin estas personas, Hoshiko no sería lo que es hoy.\n` +
            `Cada bug reportado, cada idea lanzada al aire — todo dejó huella. 🌸\n\n` +
            `${contributorsText}`,
          inline: false,
        },
      )
      .setImage(
        process.env.BANNER_URL ||
          "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif",
      )
      .setFooter({
        text: `🐾 Hoshiko • Desarrollado por v.sxn ®  ·  Con amor desde el principio 🌙`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
