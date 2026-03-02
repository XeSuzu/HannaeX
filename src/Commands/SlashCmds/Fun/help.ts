import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuInteraction,
  ButtonInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

// ==========================================================
// 🎀 LINKS & ASSETS
// ==========================================================
const LINKS = {
  invite: "https://discord.com/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=8&scope=bot%20applications.commands",
  support: "https://discord.gg/tuserver",
  banner: "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif",
};

// ==========================================================
// 🐾 EMOJIS — Reemplaza con tus custom emojis cuando los tengas
// Formato custom: "<:nombre:ID>" o "<a:nombre:ID>" animados
// ==========================================================
const EMOJI = {
  paw:         "🐾",
  flower:      "🌸",
  moon:        "🌙",
  heart:       "🩷",
  sparkle:     "✨",
  star:        "⭐",
  ribbon:      "🎀",
  arrow:       "›",
  dot:         "·",
  fun:         "🎮",
  information: "📚",
  utility:     "🔧",
  ai:          "🧠",
  moderation:  "🛡️",
  admin:       "⚙️",
  owner:       "👑",
  ping:        "📡",
  home:        "🏠",
  invite:      "💌",
  support:     "💬",
  prefix:      "❯",
};

// ==========================================================
// 🐱 CATEGORÍAS
// ==========================================================
const CATEGORIES: Record<string, {
  emoji: string;
  desc: string;
  flavor: string;
  color: number;
  visibleTo?: string;
}> = {
  Fun:         { emoji: EMOJI.fun,         desc: "Minijuegos y entretenimiento",  flavor: "porque un servidor sin juegos es un servidor triste~ nyaa",    color: 0xff8fab },
  Information: { emoji: EMOJI.information, desc: "Info y estadísticas",           flavor: "datos, stats y todo lo que necesitas saber ✨",                 color: 0xb5a4f5 },
  Utility:     { emoji: EMOJI.utility,     desc: "Herramientas útiles",           flavor: "las herramientas que hacen tu vida más fácil, de nada~",        color: 0x7ec8e3 },
  AI:          { emoji: EMOJI.ai,          desc: "Inteligencia Artificial",       flavor: "mi parte favorita. habla conmigo, te escucho~",                 color: 0x00d9ff },
  Moderation:  { emoji: EMOJI.moderation,  desc: "Herramientas de Staff",         flavor: "para los que cuidan el servidor. buen trabajo, senpai 🛡️",      color: 0xff6b6b, visibleTo: "Mod"   },
  Admin:       { emoji: EMOJI.admin,       desc: "Configuración del servidor",    flavor: "aquí se configura todo. no toques lo que no sabes~",            color: 0x4a4a6a, visibleTo: "Admin" },
  Owner:       { emoji: EMOJI.owner,       desc: "Developer Only",                flavor: "zona restringida. si estás aquí, eres especial 💀",             color: 0x1a1a2e, visibleTo: "Owner" },
};

const WELCOME_LINES = [
  "¿perdido? tranquilo, estoy aquí~ nyaa",
  "oya oya, ¿necesitas ayuda? qué raro que no lo sepas todo ya...",
  "hm... llegaste hasta aquí. bien. no estoy impresionada. (sí lo estoy)",
  "¿buscando algo? yo lo sé todo. pregúntame~",
  "otro humano perdido... al menos eres cute~",
];

// ==========================================================
// COMANDO
// ==========================================================
const command: SlashCommand = {
  category: "Information",
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("🌸 Muestra el menú de ayuda de Hoshiko."),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    const memberPerms = interaction.member?.permissions as Readonly<PermissionsBitField>;
    const isOwner = interaction.user.id === process.env.BOT_OWNER_ID;
    const isAdmin = memberPerms.has(PermissionFlagsBits.Administrator);
    const isMod   = memberPerms.has(PermissionFlagsBits.ManageMessages) || isAdmin;

    const categorized: Record<string, { name: string; desc: string }[]> = {};
    client.slashCommands.forEach((cmd: any) => {
      const cat = cmd.category || "Utility";
      const catConfig = CATEGORIES[cat];
      if (catConfig?.visibleTo === "Owner" && !isOwner) return;
      if (catConfig?.visibleTo === "Admin" && !isAdmin) return;
      if (catConfig?.visibleTo === "Mod"   && !isMod)   return;
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push({
        name: cmd.data.name,
        desc: cmd.data.description || "Sin descripción.",
      });
    });

    const welcomeLine = WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)];
    const components  = buildComponents(categorized);
    const mainEmbed   = buildMainEmbed(client, categorized, interaction.user.username, welcomeLine);

    const msg = await interaction.editReply({
      embeds: [mainEmbed],
      components: components as any,
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000 * 5,
    });

    collector.on("collect", async (i: StringSelectMenuInteraction | ButtonInteraction) => {
      collector.resetTimer();
      let embed: EmbedBuilder;

      if (i.customId === "help_home" || (i.isStringSelectMenu() && i.values[0] === "main")) {
        embed = buildMainEmbed(client, categorized, interaction.user.username, welcomeLine);
      } else if (i.isStringSelectMenu()) {
        const selected = i.values[0];
        embed = selected === "AI_SPECIAL"
          ? buildAIEmbed(client, categorized["AI"] || [])
          : buildCategoryEmbed(client, selected, categorized[selected] || []);
      } else {
        return;
      }

      await i.update({ embeds: [embed], components: components as any });
    });

    collector.on("end", () => {
      const disabledRow = ActionRowBuilder.from(components[0] as any);
      disabledRow.components.forEach((c: any) => c.setDisabled(true));
      interaction.editReply({ components: [disabledRow, components[1]] as any }).catch(() => {});
    });
  },
};

export default command;

// ==========================================================
// 🛠️ BUILDERS
// ==========================================================

function buildComponents(categorized: Record<string, { name: string; desc: string }[]>) {
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
      .setURL(LINKS.invite)
      .setEmoji(EMOJI.invite),
    new ButtonBuilder()
      .setLabel("Soporte")
      .setStyle(ButtonStyle.Link)
      .setURL(LINKS.support)
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
  username: string,
  welcomeLine: string,
): EmbedBuilder {
  const totalCmds = Object.values(categorized).flat().length;
  const prefix    = process.env.DEFAULT_PREFIX || "x";

  const catList = Object.entries(categorized)
    .map(([cat, cmds]) => {
      const info = CATEGORIES[cat] || { emoji: "📁" };
      return `${info.emoji} **${cat}** — ${cmds.length} cmd${cmds.length !== 1 ? "s" : ""}`;
    })
    .join("\n");

  return new EmbedBuilder()
    .setColor(0xff8fab)
    .setAuthor({
      name: `${client.user?.username} • nyaa~`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.flower} ¡Hola, ${username}!`)
    .setDescription(
      `*${welcomeLine}*\n\n` +
      `${EMOJI.sparkle} **${totalCmds} comandos** listos para ti.\n` +
      `Usa el menú de abajo para explorar~ ${EMOJI.heart}`,
    )
    .addFields(
      {
        name: `${EMOJI.paw} Categorías`,
        value: catList,
        inline: true,
      },
      {
        name: `${EMOJI.prefix} Prefijos & Activadores`,
        value:
          `\`/\` Comandos slash\n` +
          `\`${prefix}\` Comandos clásicos\n` +
          `\`hoshi ask\` Pregunta directa a la IA\n` +
          `\`@Hoshiko\` Chat con IA\n` +
          `\`${prefix}img\` Buscar imágenes`,
        inline: true,
      },
      {
        name: `${EMOJI.ping} Latencia`,
        value: `\`${client.ws.ping}ms\``,
        inline: true,
      },
    )
    .setImage(LINKS.banner)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Desarrollado por v.sxn ®`,
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
    emoji: "📁", desc: "Comandos", flavor: "aquí tienes lo que buscas.", color: 0xff8fab,
  };

  const cmdList = commands.length > 0
    ? commands
        .map((c) => `\`/${c.name}\`\n${EMOJI.arrow} *${c.desc}*`)
        .join("\n\n")
    : `*${EMOJI.moon} hmm... parece que no hay nada aquí todavía.*`;

  return new EmbedBuilder()
    .setColor(info.color)
    .setAuthor({
      name: `${info.emoji} ${category} — ${commands.length} comando${commands.length !== 1 ? "s" : ""}`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setDescription(
      `*${info.flavor}*\n\n` +
      `${cmdList}`,
    )
    .setImage(LINKS.banner)
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
  const prefix = process.env.DEFAULT_PREFIX || "!";

  const cmdList = commands.length > 0
    ? commands.map((c) => `\`/${c.name}\`  ${EMOJI.arrow} *${c.desc}*`).join("\n")
    : "";

  return new EmbedBuilder()
    .setColor(0x00d9ff)
    .setAuthor({
      name: `Hoshiko AI • powered by Gemini`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.moon} sí, soy inteligente. no tanto como tú crees.`)
    .setDescription(
      `*tengo memoria, busco en internet y puedo hablar de lo que sea~ nyaa*`,
    )
    .addFields(
      {
        name: `${EMOJI.sparkle} ¿Cómo hablar conmigo?`,
        value:
          `${EMOJI.arrow} Mencióname \`@Hoshiko\`\n` +
          `${EMOJI.arrow} Responde a alguno de mis mensajes\n` +
          `${EMOJI.arrow} Escribe \`hoshi ask <pregunta>\`\n` +
          `${EMOJI.arrow} Prefijo: \`${prefix}img\` para buscar imágenes`,
        inline: false,
      },
      {
        name: `${EMOJI.star} ¿Qué puedo hacer?`,
        value:
          `${EMOJI.arrow} Buscar info actualizada en internet\n` +
          `${EMOJI.arrow} Explicar código, anime, ciencia, lo que sea\n` +
          `${EMOJI.arrow} Buscar imágenes con paginación\n` +
          `${EMOJI.arrow} Recordar tus preferencias entre sesiones ${EMOJI.heart}`,
        inline: false,
      },
      ...(cmdList ? [{
        name: `${EMOJI.ribbon} Comandos relacionados`,
        value: cmdList,
        inline: false,
      }] : []),
      {
        name: `${EMOJI.paw} Personalidad`,
        value: `Cámbiala con \`/setup\` ~ tengo varios modos disponibles`,
        inline: false,
      },
    )
    .setImage(LINKS.banner)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Desarrollado por v.sxn ®`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}
