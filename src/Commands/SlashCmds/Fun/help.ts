import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

const SUPPORT_SERVER =
  process.env.SUPPORT_SERVER_INVITE || "https://discord.gg/tuserver";
const BANNER_URL =
  process.env.BANNER_URL ||
  "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif";

function getInviteLink(clientId: string | undefined): string {
  return clientId
    ? `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`
    : "https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands";
}

const EMOJI = {
  paw: "🐾",
  flower: "🌸",
  moon: "🌙",
  heart: "🩷",
  sparkle: "✨",
  star: "⭐",
  ribbon: "🎀",
  arrow: "›",
  dot: "·",
  fun: "🎮",
  information: "📚",
  utility: "🔧",
  ai: "🧠",
  moderation: "🛡️",
  admin: "⚙️",
  owner: "👑",
  ping: "📡",
  home: "🏠",
  invite: "💌",
  support: "💬",
  prefix: "❯",
  divider: "▸",
};

const CATEGORIES: Record<
  string,
  {
    emoji: string;
    desc: string;
    flavor: string;
    color: number;
    visibleTo?: string;
  }
> = {
  Fun: {
    emoji: EMOJI.fun,
    desc: "Minijuegos y entretenimiento",
    flavor: "porque un servidor sin juegos es un servidor triste~",
    color: 0xff8fab,
  },
  Information: {
    emoji: EMOJI.information,
    desc: "Info y estadísticas",
    flavor: "datos, stats y todo lo que necesitas saber ✨",
    color: 0xb5a4f5,
  },
  Utility: {
    emoji: EMOJI.utility,
    desc: "Herramientas útiles",
    flavor: "las herramientas que hacen tu vida más fácil, de nada~",
    color: 0x7ec8e3,
  },
  AI: {
    emoji: EMOJI.ai,
    desc: "Inteligencia Artificial",
    flavor: "mi parte favorita. habla conmigo, te escucho~",
    color: 0x00d9ff,
  },
  Moderation: {
    emoji: EMOJI.moderation,
    desc: "Herramientas de Staff",
    flavor: "para los que cuidan el servidor. buen trabajo 🛡️",
    color: 0xff6b6b,
    visibleTo: "Mod",
  },
  Admin: {
    emoji: EMOJI.admin,
    desc: "Configuración del servidor",
    flavor: "aquí se configura todo. no toques lo que no sabes~",
    color: 0x4a4a6a,
    visibleTo: "Admin",
  },
  Owner: {
    emoji: EMOJI.owner,
    desc: "Developer Only",
    flavor: "zona restringida. si estás aquí, eres especial 💀",
    color: 0x1a1a2e,
    visibleTo: "Owner",
  },
};

const WELCOME_LINES = [
  "¿perdido? tranquilo, estoy aquí~",
  "oya oya, ¿necesitas ayuda? qué raro que no lo sepas todo ya...",
  "hm... llegaste hasta aquí. bien. no estoy impresionada. (sí lo estoy)",
  "¿buscando algo? yo lo sé todo. pregúntame~",
  "otro humano perdido... al menos eres cute~",
];

// ─── SEPARADOR VISUAL ──────────────────────────────────────
const SEPARATOR = "╌".repeat(34);

const command: SlashCommand = {
  category: "Information",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("🌸 Muestra el menú de ayuda de Hoshiko."),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    await interaction.deferReply();

    const memberPerms = interaction.member
      ?.permissions as Readonly<PermissionsBitField>;
    const isOwner = interaction.user.id === process.env.BOT_OWNER_ID;
    const isAdmin = memberPerms.has(PermissionFlagsBits.Administrator);
    const isMod =
      memberPerms.has(PermissionFlagsBits.ManageMessages) || isAdmin;

    const categorized: Record<string, { name: string; desc: string }[]> = {};
    client.slashCommands.forEach((cmd: any) => {
      const cat = cmd.category || "Utility";
      const catConfig = CATEGORIES[cat];
      if (catConfig?.visibleTo === "Owner" && !isOwner) return;
      if (catConfig?.visibleTo === "Admin" && !isAdmin) return;
      if (catConfig?.visibleTo === "Mod" && !isMod) return;
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push({
        name: cmd.data.name,
        desc: cmd.data.description || "Sin descripción.",
      });
    });

    const welcomeLine =
      WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)];
    const components = buildComponents(client, categorized);
    const mainEmbed = buildMainEmbed(
      client,
      categorized,
      interaction.user,
      welcomeLine,
    );

    const msg = await interaction.editReply({
      embeds: [mainEmbed],
      components: components as any,
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000 * 2,
    });

    collector.on(
      "collect",
      async (i: StringSelectMenuInteraction | ButtonInteraction) => {
        collector.resetTimer();
        let embed: EmbedBuilder;

        if (
          i.customId === "help_home" ||
          (i.isStringSelectMenu() && i.values[0] === "main")
        ) {
          embed = buildMainEmbed(
            client,
            categorized,
            interaction.user,
            welcomeLine,
          );
        } else if (i.isStringSelectMenu()) {
          const selected = i.values[0];
          embed =
            selected === "AI_SPECIAL"
              ? buildAIEmbed(client, categorized["AI"] || [])
              : buildCategoryEmbed(
                  client,
                  selected,
                  categorized[selected] || [],
                );
        } else {
          return;
        }

        await i.update({ embeds: [embed], components: components as any });
      },
    );

    // ✅ Deshabilita todos los componentes al expirar (no links)
    collector.on("end", () => {
      const disabledRows = components.map((row) => {
        const newRow = ActionRowBuilder.from(row as any);
        newRow.components.forEach((c: any) => {
          if (c.data.style !== ButtonStyle.Link) c.setDisabled(true);
        });
        return newRow;
      });
      interaction
        .editReply({ components: disabledRows as any })
        .catch(() => {});
    });
  },
};

export default command;

// ==========================================================
// 🛠️ BUILDERS
// ==========================================================

function buildComponents(
  client: HoshikoClient,
  categorized: Record<string, { name: string; desc: string }[]>,
) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder(`${EMOJI.paw} Elige una categoría~`)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Inicio")
        .setDescription("Volver al menú principal")
        .setValue("main")
        .setEmoji(EMOJI.home),
    );

  for (const [cat] of Object.entries(categorized)) {
    if (cat === "AI") continue;
    const info = CATEGORIES[cat] || { emoji: "📁", desc: "Varios" };
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(cat)
        .setDescription(info.desc.substring(0, 100))
        .setValue(cat)
        .setEmoji(info.emoji),
    );
  }

  if (categorized["AI"]) {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Hoshiko AI")
        .setDescription("habla conmigo~ nyaa 🌙")
        .setValue("AI_SPECIAL")
        .setEmoji(EMOJI.ai),
    );
  }

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("help_home")
      .setLabel("Inicio")
      .setStyle(ButtonStyle.Success)
      .setEmoji(EMOJI.home),
    new ButtonBuilder()
      .setLabel("Invitar")
      .setStyle(ButtonStyle.Link)
      .setURL(getInviteLink(client.user?.id))
      .setEmoji(EMOJI.invite),
    new ButtonBuilder()
      .setLabel("Soporte")
      .setStyle(ButtonStyle.Link)
      .setURL(SUPPORT_SERVER)
      .setEmoji(EMOJI.support),
  );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    buttons,
  ];
}

// ----------------------------------------------------------
// EMBED PRINCIPAL
// ----------------------------------------------------------
function buildMainEmbed(
  client: HoshikoClient,
  categorized: Record<string, { name: string; desc: string }[]>,
  user: { username: string; displayAvatarURL: () => string },
  welcomeLine: string,
): EmbedBuilder {
  const totalCmds = Object.values(categorized).flat().length;
  const prefix = process.env.DEFAULT_PREFIX || "x";

  // Categorías como tabla visual compacta
  const catList = Object.entries(categorized)
    .map(([cat, cmds]) => {
      const info = CATEGORIES[cat] || { emoji: "📁" };
      const count = `\`${cmds.length}\``;
      return `${info.emoji} **${cat}** ${EMOJI.arrow} ${count} cmd${cmds.length !== 1 ? "s" : ""}`;
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
      `> *${welcomeLine}*\n\n` +
        `${EMOJI.sparkle} **${totalCmds} comandos** disponibles.\n` +
        `Usa el menú de abajo para explorar~ ${EMOJI.heart}\n\n` +
        `${SEPARATOR}`,
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

// ----------------------------------------------------------
// EMBED CATEGORÍA
// ----------------------------------------------------------
function buildCategoryEmbed(
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

  // Agrupar en columnas de 2 si hay muchos comandos
  const cmdList =
    commands.length > 0
      ? commands
          .map(
            (c) =>
              `${EMOJI.divider} \`/${c.name}\`\n` +
              `\u200b \u200b \u200b *${c.desc.length > 60 ? c.desc.substring(0, 57) + "..." : c.desc}*`,
          )
          .join("\n\n")
      : `*${EMOJI.moon} No hay comandos aquí todavía.*`;

  return new EmbedBuilder()
    .setColor(info.color)
    .setAuthor({
      name: `${info.emoji} ${category}  ·  ${commands.length} comando${commands.length !== 1 ? "s" : ""}`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setDescription(
      `> *${info.flavor}*\n\n` + `${SEPARATOR}\n\n` + `${cmdList}`,
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Desarrollado por v.sxn ®`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}

// ----------------------------------------------------------
// EMBED AI
// ----------------------------------------------------------
function buildAIEmbed(
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

  return new EmbedBuilder()
    .setColor(0x00d9ff)
    .setAuthor({
      name: `Hoshiko AI  ·  powered by Gemini`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.moon} sí, soy inteligente. no tanto como tú crees.`)
    .setDescription(
      `> *tengo memoria, busco en internet y puedo hablar de lo que sea~*\n\n` +
        `${SEPARATOR}`,
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
      ...(cmdList
        ? [
            {
              name: `${EMOJI.ribbon} Comandos relacionados`,
              value: cmdList,
              inline: false,
            },
          ]
        : []),
      {
        name: `${EMOJI.paw} Personalidad`,
        value: `Cámbiala con \`/setup\` — varios modos disponibles~`,
        inline: false,
      },
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Desarrollado por v.sxn ®`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}
