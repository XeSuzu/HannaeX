import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { HoshikoClient } from "../../../index";
import path from "path";
import fs from "fs";
import { SlashCommand } from "../../../Interfaces/Command";

// Cargar fuente de emojis
try {
  GlobalFonts.registerFromPath(
    path.join(__dirname, "../../../../assets/fonts/NotoColorEmoji.ttf"),
    "NotoEmoji",
  );
} catch {}

const BANNERS_DIR = path.join(
  __dirname,
  "../../../assets/images/banners/ship-banners",
);

// ══════════════════════════════════════════════════════════
// 🎭 CONFIGURACIÓN DE TIERS CON PERSONALIDAD
// ══════════════════════════════════════════════════════════
interface ShipTier {
  range: [number, number];
  color: string;
  gradient: [string, string];
  heart: string;
  title: string;
  messages: string[];
  particles: number;
  glow: number;
  threadStyle: "none" | "weak" | "normal" | "strong" | "destiny";
}

const SHIP_TIERS: ShipTier[] = [
  {
    range: [0, 15],
    color: "#2c3e50",
    gradient: ["#1a1a2e", "#2c3e50"],
    heart: "💔",
    title: "Zona Helada",
    messages: [
      "Ni siquiera el sol podría derretir este hielo.",
      "Houston, no tenemos conexión.",
      'El universo dijo: "Nop".',
      "Más distantes que Plutón del Sol.",
      "Mejor ser extraños que esto.",
    ],
    particles: 10,
    glow: 0,
    threadStyle: "none",
  },
  {
    range: [16, 35],
    color: "#5d6d7e",
    gradient: ["#34495e", "#5d6d7e"],
    heart: "🌧️",
    title: "Nublado con Lluvia",
    messages: [
      "Quizás en otra dimensión...",
      'La vibra es de "hola y adiós".',
      "Falta chispa, mya.",
      "Como café sin azúcar: funciona, pero no emociona.",
      "Amistad del montón.",
    ],
    particles: 15,
    glow: 5,
    threadStyle: "weak",
  },
  {
    range: [36, 55],
    color: "#85929e",
    gradient: ["#566573", "#85929e"],
    heart: "🤝",
    title: "Zona Amistosa",
    messages: [
      "Buenos amigos, nada más.",
      "Se llevan bien, pero sin fuegos artificiales.",
      'Energía de "hermanos de otra madre".',
      "Conexión estable, sin drama.",
      "Cómodos juntos, pero sin mariposas.",
    ],
    particles: 20,
    glow: 8,
    threadStyle: "weak",
  },
  {
    range: [56, 70],
    color: "#f39c12",
    gradient: ["#e67e22", "#f39c12"],
    heart: "🧡",
    title: "Calorcito Agradable",
    messages: [
      "¡Aquí hay potencial, mya!",
      "Se nota que hay conexión.",
      "Energía bonita y cálida.",
      "Podrían ser algo especial.",
      "Las estrellas sonríen un poco.",
    ],
    particles: 30,
    glow: 12,
    threadStyle: "normal",
  },
  {
    range: [71, 85],
    color: "#e74c3c",
    gradient: ["#c0392b", "#e74c3c"],
    heart: "❤️",
    title: "Química Fuerte",
    messages: [
      "¡Houston, tenemos TENSIÓN!",
      "Esto promete mucho.",
      "La vibra es INTENSA.",
      "Se sienten las chispas desde aquí.",
      "El destino guiña un ojo.",
    ],
    particles: 40,
    glow: 18,
    threadStyle: "strong",
  },
  {
    range: [86, 94],
    color: "#e91e63",
    gradient: ["#c2185b", "#e91e63"],
    heart: "💖",
    title: "Fuego y Pasión",
    messages: [
      "¡ESTO ES REAL, MYA!",
      "Química de laboratorio nivel nuclear.",
      "Las estrellas están alineadas.",
      "Conexión de otro nivel.",
      "Prácticamente imanes.",
    ],
    particles: 50,
    glow: 25,
    threadStyle: "strong",
  },
  {
    range: [95, 100],
    color: "#9c27b0",
    gradient: ["#7b1fa2", "#e91e63"],
    heart: "💝",
    title: "✨ DESTINO ABSOLUTO ✨",
    messages: [
      "¡¡¡ALMAS GEMELAS!!!",
      "Escrito en las estrellas y grabado en piedra.",
      "El universo entero los empuja juntos.",
      "Esto es LEGENDARIO.",
      "Cupido renunció porque ya está hecho.",
      "¿Boda cuándo? 💒",
    ],
    particles: 70,
    glow: 35,
    threadStyle: "destiny",
  },
];

// ══════════════════════════════════════════════════════════
// 🎯 COMANDO PRINCIPAL
// ══════════════════════════════════════════════════════════
const command: SlashCommand = {
  category: "Social",
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("💕 ¿Qué dice el destino sobre ustedes dos?")
    .addUserOption((opt) =>
      opt
        .setName("usuario1")
        .setDescription("Primera persona")
        .setRequired(true),
    )
    .addUserOption((opt) =>
      opt
        .setName("usuario2")
        .setDescription("Segunda persona (tú por defecto)")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // ❌ ELIMINADO: await interaction.deferReply();

    const user1 = interaction.options.getUser("usuario1", true);
    const user2 = interaction.options.getUser("usuario2") || interaction.user;

    // Validación de autoship
    if (user1.id === user2.id) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#9b59b6")
            .setDescription(
              '## 💜 Amor Propio: 100%\n\n> *"El amor propio es la base de todo amor verdadero, mya~"*\n\n✨ Pero para este hechizo necesitas a otra alma.',
            )
            .setFooter({
              text: "¡Elige a alguien más y descubre su conexión! 🐾",
            }),
        ],
      });
    }

    try {
      // ═══════════════════════════════════════════
      // 📊 CALCULAR PORCENTAJE Y TIER
      // ═══════════════════════════════════════════
      const percentage = Math.floor(Math.random() * 101);
      const tier = SHIP_TIERS.find(
        (t) => percentage >= t.range[0] && percentage <= t.range[1],
      )!;
      const message =
        tier.messages[Math.floor(Math.random() * tier.messages.length)];

      // Generar nombre ship
      const shipName = generateShipName(user1.username, user2.username);

      // ═══════════════════════════════════════════
      // 🎨 CREAR CANVAS
      // ═══════════════════════════════════════════
      const width = 900;
      const height = 500;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // ───────────────────────────────────────────
      // 1️⃣ FONDO DINÁMICO
      // ───────────────────────────────────────────
      await drawBackground(ctx, width, height, tier);

      // ───────────────────────────────────────────
      // 2️⃣ PARTÍCULAS AMBIENTALES
      // ───────────────────────────────────────────
      drawEnhancedParticles(ctx, width, height, tier);

      // ───────────────────────────────────────────
      // 3️⃣ TARJETA PRINCIPAL (Glassmorphism)
      // ───────────────────────────────────────────
      drawGlassCard(ctx, 50, 50, width - 100, height - 100, tier.color);

      // ───────────────────────────────────────────
      // 4️⃣ TÍTULO DEL TIER
      // ───────────────────────────────────────────
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.shadowColor = tier.color;
      ctx.shadowBlur = 15;
      ctx.fillText(tier.title, width / 2, 95);
      ctx.shadowBlur = 0;

      // ───────────────────────────────────────────
      // 5️⃣ AVATARES CON EFECTOS
      // ───────────────────────────────────────────
      const avatar1 = await loadImage(
        user1.displayAvatarURL({ extension: "png", size: 512 }),
      );
      const avatar2 = await loadImage(
        user2.displayAvatarURL({ extension: "png", size: 512 }),
      );

      const avatarY = 230;
      const avatarRadius = 75;

      // Avatar izquierdo
      drawEnhancedAvatar(
        ctx,
        avatar1,
        220,
        avatarY,
        avatarRadius,
        tier.color,
        tier.glow,
      );

      // Avatar derecho
      drawEnhancedAvatar(
        ctx,
        avatar2,
        680,
        avatarY,
        avatarRadius,
        tier.color,
        tier.glow,
      );

      // ───────────────────────────────────────────
      // 6️⃣ HILO ROJO DEL DESTINO
      // ───────────────────────────────────────────
      drawRedThread(ctx, 295, avatarY, 605, avatarY, tier);

      // ───────────────────────────────────────────
      // 7️⃣ CORAZÓN CENTRAL ANIMADO
      // ───────────────────────────────────────────
      drawCentralHeart(ctx, width / 2, avatarY - 20, tier);

      // ───────────────────────────────────────────
      // 8️⃣ PORCENTAJE ÉPICO
      // ───────────────────────────────────────────
      drawPercentage(ctx, width / 2, avatarY + 90, percentage, tier);

      // ───────────────────────────────────────────
      // 🔟 BARRA DE PROGRESO MEJORADA
      // ───────────────────────────────────────────
      drawProgressBar(ctx, width / 2, 420, 600, 16, percentage, tier);

      // ═══════════════════════════════════════════
      // 📤 ENVIAR RESULTADO
      // ═══════════════════════════════════════════
      const attachment = new AttachmentBuilder(await canvas.encode("png"), {
        name: "ship-destiny.png",
      });

      const embed = new EmbedBuilder()
        .setTitle(`💕 ${user1.username} × ${user2.username}`)
        .setDescription(
          `### ${tier.heart} ${percentage}% - ${tier.title}\n\n> *${message}*\n\n*Ship name:* **${shipName}**`,
        )
        .setColor(tier.color as any)
        .setImage("attachment://ship-destiny.png")
        .setFooter({ text: "Los dados del destino han hablado 🎲" });

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error("❌ Error en comando ship:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#e74c3c")
            .setDescription(
              "😿 **Mya!** Hubo un error al consultar el destino. El cosmos está temporalmente nublado...",
            ),
        ],
      });
    }
  },
};

export default command;

// ══════════════════════════════════════════════════════════
// 🎨 FUNCIONES DE RENDERIZADO MEJORADAS
// ══════════════════════════════════════════════════════════

/**
 * Dibuja el fondo con banner aleatorio o gradiente dinámico
 */
async function drawBackground(
  ctx: any,
  width: number,
  height: number,
  tier: ShipTier,
) {
  let bgDrawn = false;

  // Intentar cargar banner
  if (fs.existsSync(BANNERS_DIR)) {
    const files = fs
      .readdirSync(BANNERS_DIR)
      .filter((f) => f.match(/\.(png|jpg|jpeg|webp)$/i));
    if (files.length > 0) {
      try {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const img = await loadImage(path.join(BANNERS_DIR, randomFile));

        // Dibujar con cover
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        bgDrawn = true;
      } catch (e) {
        console.error("Error cargando banner:", e);
      }
    }
  }

  // Gradiente de fallback
  if (!bgDrawn) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, tier.gradient[0]);
    grad.addColorStop(1, tier.gradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Overlay oscuro con color del tier
  const overlay = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    width,
  );
  overlay.addColorStop(0, hexToRgba(tier.color, 0.2));
  overlay.addColorStop(1, "rgba(0, 0, 0, 0.7)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Partículas mejoradas con movimiento y variación
 */
function drawEnhancedParticles(
  ctx: any,
  width: number,
  height: number,
  tier: ShipTier,
) {
  ctx.save();

  for (let i = 0; i < tier.particles; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 4 + 1;
    const opacity = Math.random() * 0.6 + 0.2;

    // Partículas circulares
    ctx.fillStyle = hexToRgba(tier.color, opacity);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Algunas partículas con glow
    if (Math.random() > 0.7) {
      ctx.shadowColor = tier.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
}

/**
 * Tarjeta con efecto glassmorphism
 */
function drawGlassCard(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.save();

  // Sombra exterior
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 10;

  // Fondo de vidrio
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  roundRect(ctx, x, y, w, h, 30);
  ctx.fill();

  // Borde superior brillante
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Borde de color
  ctx.strokeStyle = hexToRgba(color, 0.3);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

/**
 * Avatar mejorado con orejas de gato y efectos
 */
function drawEnhancedAvatar(
  ctx: any,
  img: any,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: number,
) {
  ctx.save();

  // Glow exterior
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Orejas de gato (detrás)
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;

  // Oreja izquierda
  ctx.beginPath();
  ctx.moveTo(x - r + 20, y - r + 20);
  ctx.lineTo(x - r - 10, y - r - 30);
  ctx.lineTo(x - r + 50, y - r + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Oreja derecha
  ctx.beginPath();
  ctx.moveTo(x + r - 20, y - r + 20);
  ctx.lineTo(x + r + 10, y - r - 30);
  ctx.lineTo(x + r - 50, y - r + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Avatar circular
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  ctx.restore();

  // Borde del avatar
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  // Brillo interior
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Hilo rojo del destino con estilos dinámicos
 */
function drawRedThread(
  ctx: any,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tier: ShipTier,
) {
  if (tier.threadStyle === "none") return;

  ctx.save();

  const midX = (x1 + x2) / 2;
  const curve = tier.threadStyle === "destiny" ? 80 : 60;

  // Línea base
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(midX, y1 - curve, x2, y2);

  if (tier.threadStyle === "weak") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
  } else if (tier.threadStyle === "normal") {
    ctx.strokeStyle = hexToRgba(tier.color, 0.6);
    ctx.lineWidth = 4;
  } else if (tier.threadStyle === "strong") {
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 15;
  } else if (tier.threadStyle === "destiny") {
    // Doble línea con glow
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 6;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 25;
    ctx.stroke();

    // Segunda línea brillante
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Corazón central con efectos según tier
 */
function drawCentralHeart(ctx: any, x: number, y: number, tier: ShipTier) {
  ctx.save();

  // Círculo de fondo para el corazón
  ctx.fillStyle = hexToRgba(tier.color, 0.2);
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = tier.glow;
  ctx.beginPath();
  ctx.arc(x, y, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Intentar renderizar emoji con múltiples fallbacks
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Probar diferentes tamaños y fuentes
  const fonts = [
    '85px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
    '85px NotoEmoji, "Apple Color Emoji", "Segoe UI Emoji", Arial',
    '85px "Segoe UI Emoji", "Apple Color Emoji", Arial',
  ];

  let rendered = false;
  for (const font of fonts) {
    ctx.font = font;
    if (tier.glow > 0) {
      ctx.shadowColor = tier.color;
      ctx.shadowBlur = tier.glow * 1.5;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText(tier.heart, x, y);
    rendered = true;
    break; // Si llega aquí, asumimos que funcionó
  }

  // Fallback: dibujar corazón SVG si el emoji no carga
  if (!rendered) {
    ctx.shadowBlur = 0;
    drawHeartShape(ctx, x, y, 40, tier.color);
  }

  // Anillo de poder para tier alto
  if (tier.range[0] >= 86) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexToRgba(tier.color, 0.6);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Dibuja un corazón con path (fallback si emojis no cargan)
 */
function drawHeartShape(
  ctx: any,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);

  // Curva superior izquierda
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);

  // Curva inferior izquierda
  ctx.bezierCurveTo(
    x - size / 2,
    y + (size + topCurveHeight) / 2,
    x,
    y + (size + topCurveHeight) / 2,
    x,
    y + size,
  );

  // Curva inferior derecha
  ctx.bezierCurveTo(
    x,
    y + (size + topCurveHeight) / 2,
    x + size / 2,
    y + (size + topCurveHeight) / 2,
    x + size / 2,
    y + topCurveHeight,
  );

  // Curva superior derecha
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);

  ctx.fill();
  ctx.restore();
}

/**
 * Porcentaje con estilo épico
 */
function drawPercentage(
  ctx: any,
  x: number,
  y: number,
  percentage: number,
  tier: ShipTier,
) {
  ctx.save();

  ctx.font = "bold 64px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Sombra/borde negro para legibilidad
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.lineWidth = 8;
  ctx.strokeText(`${percentage}%`, x, y);

  // Texto principal
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 20;
  ctx.fillText(`${percentage}%`, x, y);

  ctx.restore();
}

/**
 * Barra de progreso moderna
 */
function drawProgressBar(
  ctx: any,
  x: number,
  y: number,
  width: number,
  height: number,
  percentage: number,
  tier: ShipTier,
) {
  ctx.save();

  const barX = x - width / 2;

  // Fondo de la barra
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  roundRect(ctx, barX, y, width, height, height / 2);
  ctx.fill();

  // Borde
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Progreso
  if (percentage > 0) {
    const fillWidth = (width * percentage) / 100;

    // Gradiente de progreso
    const grad = ctx.createLinearGradient(barX, y, barX + fillWidth, y);
    grad.addColorStop(0, tier.color);
    grad.addColorStop(1, lightenColor(tier.color, 30));

    ctx.fillStyle = grad;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 15;

    roundRect(ctx, barX, y, fillWidth, height, height / 2);
    ctx.fill();

    // Brillo superior
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    roundRect(ctx, barX, y, fillWidth, height / 2, height / 2);
    ctx.fill();
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════════
// 🛠️ UTILIDADES
// ══════════════════════════════════════════════════════════

/**
 * Genera nombre ship combinando usernames
 */
function generateShipName(name1: string, name2: string): string {
  const clean1 = name1.replace(/[^a-zA-Z]/g, "").toLowerCase();
  const clean2 = name2.replace(/[^a-zA-Z]/g, "").toLowerCase();

  if (clean1.length < 2 || clean2.length < 2) {
    return `${name1}×${name2}`;
  }

  // Tomar primera mitad del primero y segunda mitad del segundo
  const half1 = Math.ceil(clean1.length / 2);
  const half2 = Math.floor(clean2.length / 2);

  const part1 = clean1.slice(0, half1);
  const part2 = clean2.slice(half2);

  return (part1 + part2).charAt(0).toUpperCase() + (part1 + part2).slice(1);
}

/**
 * Dibuja rectángulo con bordes redondeados
 */
function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Convierte hex a rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Aclara un color hex
 */
function lightenColor(hex: string, percent: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + percent);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + percent);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + percent);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
