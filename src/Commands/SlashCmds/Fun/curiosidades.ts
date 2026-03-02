import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ButtonInteraction,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";

// ── Anti-spam ──────────────────────────────────────────────────
const spamTracker = new Map<string, number[]>();

const mensajesSpam = [
  "⏳ Oye tranquilo, te vas a acabar mis frases.",
  "😭 Para para para. Respira. Las frases no se van a ir.",
  "🐾 Detecté actividad sospechosa. Hoshiko te está mirando.",
  "⚠️ Cuidado, no supimos del último que spameó el comando.",
  "😤 Tres veces seguidas. Tres. Estás bien?",
  "🔍 Sistema de curiosidades sobrecalentado. Espera un momento.",
  "💀 A este ritmo vas a sacar todas las frases en un día. Relax.",
  "🌚 El comando te está mirando raro. Y yo también.",
  "🎲 Los dados necesitan descanso también. Dale un momento.",
  "😇 Hoshiko no se enoja. Pero está tomando nota de esto.",
];

function checkSpam(userId: string): { isSpam: boolean; mensaje?: string } {
  const now = Date.now();
  const historial = spamTracker.get(userId) ?? [];
  const recientes = historial.filter(t => now - t < 10_000);
  recientes.push(now);
  spamTracker.set(userId, recientes);

  if (recientes.length >= 3) {
    return {
      isSpam: true,
      mensaje: mensajesSpam[Math.floor(Math.random() * mensajesSpam.length)],
    };
  }

  return { isSpam: false };
}

// ── Frases ─────────────────────────────────────────────────────
const frasesComunes = [
  "🌸 Hoshiko significa 'niña de las estrellas' en japonés.",
  "🐾 Hoshiko fue creada con mucho amor y demasiado café.",
  "✨ El primer comando que tuvo Hoshiko fue `ping`.",
  "🌙 Hoshiko trabaja 24/7 sin descanso, ¡incluso de madrugada!",
  "💫 El color morado de Hoshiko representa creatividad y magia.",
  "🌟 Hoshiko está construida sobre Discord.js v14 y TypeScript.",
  "💜 El nombre Hoshiko fue elegido porque las estrellas siempre están ahí, aunque no las veas.",
  "💜 Tú también eres una estrella, aunque a veces no lo sientas.",
  "✨ Cada bug resuelto es una victoria. Celebra las pequeñas cosas.",
  "🐾 No importa cuántas veces falle el build — lo importante es volver a intentarlo.",
  "🎵 Cada comando tiene su propia personalidad. Algunos más que otros.",
  "🌙 Los mejores proyectos nacen de madrugada. Este es la prueba.",
  "🎀 Hoshiko fue diseñada para ser kawaii y funcional. Lo kawaii ganó.",
  "⚡ Hoshiko puede procesar múltiples comandos al mismo tiempo sin sudar.",
  "🎮 La primera persona que probó Hoshiko fue su propia creadora a las 2am.",
  "🌈 Los colores del embed fueron elegidos con criterio artístico. Y algo de suerte.",
  "👀 Hoshiko no te juzga. Pero tampoco promete nada.",
  "🔄 Si algo falla, apágalo y enciéndelo. Funciona el 70% de las veces.",
  "🙃 Todo está bajo control. Esto es lo que decimos antes de que todo explote.",
  "🛠️ En producción funciona diferente que en local. Siempre. Sin excepción.",
  "😇 Hoshiko es inocente de todos los cargos. Su abogada está en ello.",
  "☕ El código funciona. No sabemos por qué. No lo toques.",
  "🐛 El bug fue encontrado. El bug fue ignorado. El bug sigue ahí. Hola bug.",
  "💀 TypeScript dijo que estaba correcto. TypeScript tiene mucho que explicar.",
  "🚀 Nuevo deploy en producción. Rezamos, pusheamos y corremos.",
  "🤡 Encontramos el bug. Era un punto y coma. Llevábamos 4 horas buscando.",
  "🫠 Alguien tocó el código que funcionaba. Ya no funciona. No hay preguntas.",
  "🌮 Se intentó arreglar un bug a las 11pm con hambre. Aparecieron 3 bugs nuevos.",
  "🎭 El bot actúa normal cuando lo estás mirando. En cuanto te vas, quién sabe.",
  "💅 Refactorizamos el código. Ahora está igual pero con mejores nombres de variables.",
];

const frasesRaras = [
  "😤 Alguien hizo un `any` en TypeScript. No vamos a señalar culpables pero ya sabemos quién fue.",
  "🌚 El bot se cayó. Volvió. No dijo a dónde fue. No le preguntamos.",
  "📊 Las estadísticas del bot son precisas. Las inventamos con mucho cuidado.",
  "🕐 El deploy iba a tardar 5 minutos. Van 3 horas. Todo bien.",
  "🔍 Se hizo una revisión de código exhaustiva. Duró 4 minutos. Fue aprobado.",
  "💾 El backup existe. En algún lugar. Probablemente.",
  "🏆 Premio al bug más creativo: pendiente de asignar.",
  "😱 El código funciona en local. En producción tiene otra personalidad.",
  "🎯 El comando funcionó a la primera en producción. Captura guardada como evidencia histórica.",
  "🧠 Alguien preguntó si había documentación. Cambiamos el tema rápidamente.",
  "😭 Alguien puso un `console.log('aquí llegó')` y lo subió a producción. Todos lo hemos hecho.",
  "🧪 El testing fue exhaustivo. Definición de exhaustivo: lo probé yo sola dos veces.",
  "🫡 El equipo de testing reportó 47 bugs. Se arreglaron 2. Progreso.",
  "📦 `node_modules` pesa 300mb. Nadie sabe qué hay adentro. Nadie pregunta.",
  "🎪 Bienvenido a producción, donde los errores son sorpresas y los bugs son eventos especiales.",
];

const frasesLegendarias = [
  "👑 Hoshiko fue, es y será. El resto son bots temporales.",
  "🌌 Dicen que si ejecutas este comando 100 veces seguidas pasa algo especial. Dicen.",
  "💀 Esta frase tiene un 5% de aparecer. La encontraste. Algo mereces.",
  "🔮 El código de Hoshiko fue escrito bajo la luna llena. No es verdad pero suena poético.",
  "🌠 En algún lugar del código existe un comentario que dice 'arreglar después'. Lleva meses ahí.",
  "🐉 Según la leyenda, hubo una versión 0.0.1 de Hoshiko. Nadie habla de esa época.",
  "🗝️ Existe un comando secreto en Hoshiko. Esta frase no es una pista. O sí.",
  "👁️ Esta frase fue escrita para quien la encontrara. Hola. Sabíamos que ibas a llegar.",
  "🌒 Se dice que si usas `/curiosidad` exactamente a medianoche la frase es diferente. Nadie lo ha confirmado.",
];

const frasesOG = [
  "⛔ Error 10062 te voy a encontrar, no te preocupes.",
  "❓ 1+1=11? Quien calculó esto?",
  "🍵 Su creadora programa mejor con cumbia de fondo? Quien sugirió esta línea.",
];

// ── Tipos ──────────────────────────────────────────────────────
type Tier = "común" | "rara" | "legendaria" | "og";

interface FraseResult {
  frase: string;
  tier: Tier;
  prob: number;
}

// ── Selector ───────────────────────────────────────────────────
function getFrase(username: string): FraseResult {
  const frasesPersonalizadas = [
    `🌟 ${username} acaba de descubrir algo sobre Hoshiko. O Hoshiko descubrió algo sobre ${username}.`,
    `👀 ${username} preguntó algo que no debería saber. Hoshiko tomó nota.`,
    `💜 ${username} y Hoshiko comparten un vínculo especial. Bueno, con todos. Pero tú eres especial también.`,
    `🐾 ${username} usa demasiado este comando. Hoshiko no se queja. Solo observa.`,
  ];

  const todasComunes = [...frasesComunes, ...frasesPersonalizadas];
  const roll = Math.random() * 100;

  if (roll < 2)  return { frase: frasesOG[Math.floor(Math.random() * frasesOG.length)],                   tier: "og",         prob: 2  };
  if (roll < 7)  return { frase: frasesLegendarias[Math.floor(Math.random() * frasesLegendarias.length)], tier: "legendaria", prob: 5  };
  if (roll < 25) return { frase: frasesRaras[Math.floor(Math.random() * frasesRaras.length)],             tier: "rara",       prob: 18 };
  return               { frase: todasComunes[Math.floor(Math.random() * todasComunes.length)],            tier: "común",      prob: 75 };
}

// ── Config visual ──────────────────────────────────────────────
const tierConfig: Record<Tier, { color: number; label: string; footer: string; badge: string }> = {
  común:      { color: 0x9b59b6, label: "✨ Curiosidad del día",        footer: "Tier: Común • 75%",                badge: "✨ Común"      },
  rara:       { color: 0x3498db, label: "💙 Curiosidad rara",           footer: "Tier: Rara • 18%",                 badge: "💙 Rara"       },
  legendaria: { color: 0xf1c40f, label: "👑 Curiosidad legendaria",     footer: "Tier: Legendaria • 5%",            badge: "👑 Legendaria" },
  og:         { color: 0xe74c3c, label: "🔥 Frase OG — Las originales", footer: "Tier: OG • 2% • Eres especial 🌟", badge: "🔥 OG"        },
};

const tierChances: Record<Tier, string> = {
  común:      "~1 de cada 1 uso",
  rara:       "~1 de cada 6 usos",
  legendaria: "~1 de cada 20 usos",
  og:         "~1 de cada 50 usos",
};

// ── Builder de embed ───────────────────────────────────────────
function buildEmbed(result: FraseResult, client: HoshikoClient): EmbedBuilder {
  const config = tierConfig[result.tier];
  return new EmbedBuilder()
    .setTitle(config.label)
    .setDescription(result.frase)
    .setColor(config.color)
    .setThumbnail(client.user?.displayAvatarURL() ?? null)
    .addFields(
      { name: "🎲 Tier",         value: config.badge,             inline: true },
      { name: "📊 Probabilidad", value: `${result.prob}%`,        inline: true },
      { name: "🎯 Promedio",     value: tierChances[result.tier], inline: true },
    )
    .setFooter({ text: config.footer, iconURL: client.user?.displayAvatarURL() })
    .setTimestamp();
}

// ── Builder de botones ─────────────────────────────────────────
function buildRow(tier: Tier, disabled: boolean = false): ActionRowBuilder<ButtonBuilder> {
  const canShare = tier === "rara" || tier === "legendaria" || tier === "og";
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("reroll")
      .setLabel("🎲 Tirar de nuevo")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );

  if (canShare) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("share")
        .setLabel("📢 Compartir")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
    );
  }

  return row;
}

// ── Comando ────────────────────────────────────────────────────
const command: SlashCommand = {
  category: "Information",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("curiosidad")
    .setDescription("🌸 Descubre una curiosidad random sobre Hoshiko — ¿podrás sacar la OG?"),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Anti-spam
    const { isSpam, mensaje } = checkSpam(userId);
    if (isSpam) {
      await interaction.editReply({ content: mensaje! });
      return;
    }

    // Animación de suspenso
    await interaction.editReply({ content: "🎲 Tirando..." });
    await new Promise(res => setTimeout(res, 1500));

    let result = getFrase(username);

    await interaction.editReply({
      content: "",
      embeds: [buildEmbed(result, client)],
      components: [buildRow(result.tier)],
    });

    // Collector de botones — 60 segundos
    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: (btn) => btn.user.id === userId,
    });

    collector.on("collect", async (btn: ButtonInteraction) => {
      await btn.deferUpdate();

      if (btn.customId === "reroll") {
        const spamCheck = checkSpam(userId);
        if (spamCheck.isSpam) {
          await interaction.editReply({ content: spamCheck.mensaje!, embeds: [], components: [] });
          return;
        }

        await interaction.editReply({ content: "🎲 Tirando...", embeds: [], components: [] });
        await new Promise(res => setTimeout(res, 1500));

        result = getFrase(username);

        await interaction.editReply({
          content: "",
          embeds: [buildEmbed(result, client)],
          components: [buildRow(result.tier)],
        });
      }

      if (btn.customId === "share") {
        await interaction.followUp({
          content: `✨ **${username}** sacó una frase **${result.tier.toUpperCase()}**:`,
          embeds: [buildEmbed(result, client)],
          ephemeral: false,
        });
      }
    });

    // Deshabilitar botones al expirar
    collector.on("end", async () => {
      await interaction.editReply({ components: [buildRow(result.tier, true)] }).catch(() => null);
    });
  },
};

export default command;
