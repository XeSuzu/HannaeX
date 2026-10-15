import { EmbedBuilder } from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { CATEGORIES, EMOJI, SEPARATOR, BANNER_URL } from "./config";

export function buildMainEmbed(
  client: HoshikoClient,
  categorized: Record<string, { name: string; desc: string }[]>,
  user: { username: string; displayAvatarURL: () => string },
  welcomeLine: string,
): EmbedBuilder {
  const totalCmds = Object.values(categorized).flat().length;
  const prefix = process.env.DEFAULT_PREFIX || "x";
  const catList = Object.entries(categorized)
    .map(([cat, cmds]) => {
      const info = CATEGORIES[cat] || { emoji: "📁" };
      const count = `\`${cmds.length}\``;
      return `${info.emoji} **${cat}**${EMOJI.arrow} ${count} cmd${cmds.length !== 1 ? "s" : ""}`;
    })
    .join("\n");

  return new EmbedBuilder()
    .setColor(0xff8fab)
    .setAuthor({
      name: `Solicitado por ${user.username}`,
      iconURL: user.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.flower} Hoshiko — Centro de Ayuda`)
    .setDescription(
      `> *${welcomeLine}*\n\n${EMOJI.sparkle} **${totalCmds} comandos** disponibles.\nUsa el menú de abajo para explorar~ ${EMOJI.heart}\n\n${SEPARATOR}`,
    )
    .addFields(
      {
        name: `${EMOJI.paw} Categorías`,
        value: catList || "*Sin categorías disponibles.*",
        inline: true,
      },
      {
        name: `${EMOJI.prefix} Activadores`,
        value: [
          `\`/\` — Slash commands`,
          `\`${prefix}\` — Comandos clásicos`,
          `\`hoshi ask\` — Pregunta a la IA`,
          `\`@Hoshiko\` — Chat con IA`,
          `\`${prefix}img\` — Buscar imágenes`,
        ].join("\n"),
        inline: true,
      },
      {
        name: `${EMOJI.ping} Estado`,
        value: [
          `Latencia \`${client.ws.ping}ms\``,
          `Servidores \`${client.guilds.cache.size}\``,
        ].join("\n"),
        inline: true,
      },
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Desarrollado por v.sxn ®  •  Expira en 2 min`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}

export function buildCategoryEmbed(
  client: HoshikoClient,
  category: string,
  commands: { name: string; desc: string }[],
): EmbedBuilder {
  const info = CATEGORIES[category] || {
    emoji: "📁",
    desc: "Comandos",
    flavor: "aquí tienes lo que buscas.",
    color: 0xff8fab,
  };
  const cmdList =
    commands.length > 0
      ? commands
          .map(
            (c) =>
              `${EMOJI.divider} \`/${c.name}\`\n\u200b \u200b \u200b *${c.desc.length > 60 ? c.desc.substring(0, 57) + "..." : c.desc}*`,
          )
          .join("\n\n")
      : `*${EMOJI.moon} No hay comandos aquí todavía.*`;
  return new EmbedBuilder()
    .setColor(info.color)
    .setAuthor({
      name: `${info.emoji}${category}  ·  ${commands.length} comando${commands.length !== 1 ? "s" : ""}`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setDescription(`> *${info.flavor}*\n\n${SEPARATOR}\n\n${cmdList}`)
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Desarrollado por v.sxn ®`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}

export function buildAIEmbed(
  client: HoshikoClient,
  commands: { name: string; desc: string }[],
): EmbedBuilder {
  const prefix = process.env.DEFAULT_PREFIX || "x";
  const cmdList =
    commands.length > 0
      ? commands
          .map((c) => `${EMOJI.divider} \`/${c.name}\` — *${c.desc}*`)
          .join("\n")
      : "";
  const embed = new EmbedBuilder()
    .setColor(0x00d9ff)
    .setAuthor({
      name: `Hoshiko AI  ·  powered by Gemini`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.moon} sí, soy inteligente. no tanto como tú crees.`)
    .setDescription(
      `> *tengo memoria, busco en internet y puedo hablar de lo que sea~*\n\n${SEPARATOR}`,
    )
    .addFields(
      {
        name: `${EMOJI.sparkle} ¿Cómo hablar conmigo?`,
        value: [
          `${EMOJI.divider} Mencioname \`@Hoshiko <mensaje>\``,
          `${EMOJI.divider} Responde a uno de mis mensajes`,
          `${EMOJI.divider} Escribe \`hoshi ask <pregunta>\``,
          `${EMOJI.divider} Usa \`${prefix}img <query>\` para imágenes`,
        ].join("\n"),
        inline: false,
      },
      {
        name: `${EMOJI.star} ¿Qué puedo hacer?`,
        value: [
          `${EMOJI.divider} Buscar info actualizada en internet`,
          `${EMOJI.divider} Explicar código, anime, ciencia, lo que sea`,
          `${EMOJI.divider} Buscar imágenes con paginación`,
          `${EMOJI.divider} Recordar tus preferencias entre sesiones ${EMOJI.heart}`,
        ].join("\n"),
        inline: false,
      },
    );
  if (cmdList)
    embed.addFields({
      name: `${EMOJI.ribbon} Comandos relacionados`,
      value: cmdList,
      inline: false,
    });
  embed.addFields({
    name: `${EMOJI.paw} Personalidad`,
    value: `Cámbiala con \`/setup\` — varios modos disponibles~`,
    inline: false,
  });
  return embed
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Desarrollado por v.sxn ®`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}
