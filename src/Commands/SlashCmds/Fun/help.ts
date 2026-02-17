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

// ==========================================================
// 🎨 CONFIGURACIÓN
// ==========================================================
const LINKS = {
  invite:
    "https://discord.com/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=8&scope=bot%20applications.commands",
  support: "https://discord.gg/tuserver",
  // He puesto un banner de ejemplo que sé que funciona.
  // Asegúrate de que tu link de Pinterest sea el directo a la imagen (.gif/.png)
  banner:
    "https://i.pinimg.com/originals/0d/f5/59/0df559e264fa08b7fa204f7c67a33926.gif",
};

// Configuración de categorías y permisos requeridos para verlas
const CATEGORIES: Record<
  string,
  { emoji: string; desc: string; color: number; visibleTo?: string }
> = {
  Fun: { emoji: "🎮", desc: "Minijuegos y diversión", color: 0xff69b4 },
  Information: {
    emoji: "📚",
    desc: "Información del servidor",
    color: 0x5865f2,
  },
  Music: { emoji: "🎵", desc: "Música y reproducción", color: 0x9b59b6 },
  Economy: { emoji: "💰", desc: "Economía y tienda", color: 0xf1c40f },
  Utility: { emoji: "🔧", desc: "Utilidades varias", color: 0x3498db },
  AI: { emoji: "🧠", desc: "Inteligencia Artificial", color: 0x00d9ff },

  // Categorías restringidas
  Moderation: {
    emoji: "🛡️",
    desc: "Herramientas de Staff",
    color: 0xed4245,
    visibleTo: "Mod",
  },
  Admin: {
    emoji: "⚙️",
    desc: "Configuración del servidor",
    color: 0x2c2f33,
    visibleTo: "Admin",
  },
  Owner: {
    emoji: "👑",
    desc: "Developer Only",
    color: 0x000000,
    visibleTo: "Owner",
  },
};

export default {
  category: "Information",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("✨ Muestra el menú de ayuda personalizado."),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    await interaction.deferReply();

    // 1. OBTENER PERMISOS DEL USUARIO
    const memberPerms = interaction.member
      ?.permissions as Readonly<PermissionsBitField>;
    const isOwner = interaction.user.id === process.env.BOT_OWNER_ID;
    const isAdmin = memberPerms.has(PermissionFlagsBits.Administrator);
    const isMod =
      memberPerms.has(PermissionFlagsBits.ManageMessages) || isAdmin;

    // 2. FILTRAR COMANDOS
    const commands = client.slashCommands;
    const categorized: Record<string, string[]> = {};

    commands.forEach((cmd: any) => {
      const cat = cmd.category || "Otros";
      const catConfig = CATEGORIES[cat];

      // 🛑 LÓGICA DE FILTRADO (Aquí está la magia)
      if (catConfig?.visibleTo === "Owner" && !isOwner) return;
      if (catConfig?.visibleTo === "Admin" && !isAdmin) return;
      if (catConfig?.visibleTo === "Mod" && !isMod) return;

      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(`\`/${cmd.data.name}\``);
    });

    // 3. Generar Componentes
    // Pasamos 'categorized' filtrado para que el menú solo muestre lo permitido
    const mainEmbed = createMainEmbed(
      client,
      commands.size,
      Object.keys(categorized).length,
      interaction.user.username,
    );
    const components = createComponents(categorized);

    const msg = await interaction.editReply({
      embeds: [mainEmbed],
      components: components as any,
    });

    // 4. Collector
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000 * 5,
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
          embed = createMainEmbed(
            client,
            commands.size,
            Object.keys(categorized).length,
            interaction.user.username,
          );
        } else if (i.isStringSelectMenu()) {
          const selected = i.values[0];
          if (selected === "AI_SPECIAL") {
            embed = createAIEmbed(client);
          } else {
            embed = createCategoryEmbed(
              client,
              selected,
              categorized[selected] || [],
            );
          }
        } else {
          return;
        }

        await i.update({ embeds: [embed], components: components as any });
      },
    );

    collector.on("end", () => {
      const disabledMenuRow = ActionRowBuilder.from(components[0] as any);
      disabledMenuRow.components.forEach((c: any) => c.setDisabled(true));
      interaction
        .editReply({ components: [disabledMenuRow, components[1]] as any })
        .catch(() => {});
    });
  },
};

// ==========================================================
// 🛠️ HELPERS
// ==========================================================

function createComponents(categorized: Record<string, string[]>) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder("🔍 Selecciona una categoría...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Menú Principal")
        .setDescription("Volver al inicio")
        .setValue("main")
        .setEmoji("🏠"),
    );

  // Solo añadimos al menú las categorías que pasaron el filtro
  for (const [cat, cmds] of Object.entries(categorized)) {
    if (cat === "AI") continue;
    const info = CATEGORIES[cat] || {
      emoji: "📁",
      desc: "Varios",
      color: 0x99aab5,
    };

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
        .setDescription("Asistente inteligente")
        .setValue("AI_SPECIAL")
        .setEmoji("🧠"),
    );
  }

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("help_home")
      .setLabel("Inicio")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🏠"),
    new ButtonBuilder()
      .setLabel("Invitar")
      .setStyle(ButtonStyle.Link)
      .setURL(LINKS.invite),
    new ButtonBuilder()
      .setLabel("Soporte")
      .setStyle(ButtonStyle.Link)
      .setURL(LINKS.support),
  );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    buttonRow,
  ];
}

function createMainEmbed(
  client: HoshikoClient,
  totalCmds: number,
  totalCats: number,
  username: string,
): EmbedBuilder {
  return (
    new EmbedBuilder()
      .setColor(0xffc0cb)
      // Quitamos el author para que se vea más limpio el título
      .setTitle(`👋 ¡Hola, ${username}! Soy ${client.user?.username}`)
      .setDescription(
        `>>> Soy un bot multipropósito diseñado para hacer tu servidor más divertido y seguro.\n\n` +
          `**¿Qué deseas hacer hoy?**\n` +
          `Usa el menú de abajo para explorar mis **${totalCats} categorías** filtradas para ti.`,
      )
      .addFields(
        {
          name: "🌟 Novedades",
          value: "> Nuevo sistema de `/post` estilo Twitter e Instagram.",
          inline: false,
        },
        {
          name: "📊 Sistema",
          value: `\`📡\` Ping: **${client.ws.ping}ms**\n\`🤖\` Comandos: **${totalCmds}**`,
          inline: true,
        },
        {
          name: "🔗 Enlaces",
          value: `[Soporte](${LINKS.support}) • [Invitar](${LINKS.invite})`,
          inline: true,
        },
      )
      .setImage(LINKS.banner) // ✅ AHORA SÍ SE MOSTRARÁ
      .setFooter({
        text: "Hoshiko System v3.0",
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTimestamp()
  );
}

function createCategoryEmbed(
  client: HoshikoClient,
  category: string,
  commands: string[],
): EmbedBuilder {
  const info = CATEGORIES[category] || {
    emoji: "📁",
    desc: "Comandos Generales",
    color: 0x2f3136,
  };

  // DISEÑO: Bloque de código para que se vea ordenado y compacto
  const cmdList =
    commands.length > 0
      ? commands.join("  ")
      : "❌ No hay comandos disponibles.";

  return (
    new EmbedBuilder()
      .setColor(info.color)
      .setTitle(`${info.emoji}  Categoría: ${category}`)
      .setDescription(
        `> *${info.desc}*\n\n**Comandos Disponibles:**\n${cmdList}`,
      ) // Sin bloques de código para que los links de slash funcionen si el cliente los soporta, o usa bloques para estilo
      // Opción B (Estilo Terminal): .setDescription(`> *${info.desc}*\n\`\`\`\n${commands.map(c => c.replace(/`/g, '')).join(', ')}\n\`\`\``)
      .setThumbnail(client.user?.displayAvatarURL() || null) // Thumbnail solo en categorías
      .setFooter({
        text: `Total: ${commands.length} comandos`,
        iconURL: client.user?.displayAvatarURL(),
      })
  );
}

function createAIEmbed(client: HoshikoClient): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x00d9ff)
    .setTitle("🧠  Hoshiko AI Assistant")
    .setDescription(
      "He sido potenciada con Inteligencia Artificial para ayudarte.",
    )
    .addFields(
      {
        name: "💬 Conversación",
        value: "> Mencióname `@Hoshiko` para hablar conmigo.",
        inline: true,
      },
      {
        name: "🎨 Creatividad",
        value: "> Pídeme historias, poemas o chistes.",
        inline: true,
      },
      {
        name: "🛠️ Comandos",
        value: "`hoshi ask <pregunta>`\n`hoshi imagine <prompt>`",
        inline: false,
      },
    )
    .setImage(
      "https://media.discordapp.net/attachments/123456789/123456789/ai_banner.png?width=800&height=200",
    ) // Puedes poner otro banner aquí si quieres
    .setFooter({
      text: "Powered by Gemini",
      iconURL: client.user?.displayAvatarURL(),
    });
}
