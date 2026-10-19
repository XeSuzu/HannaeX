import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";

import {
  SHIP_TIERS,
  drawBackground,
  drawEnhancedParticles,
  drawGlassCard,
  drawEnhancedAvatar,
  drawRedThread,
  drawCentralHeart,
  drawPercentage,
  drawProgressBar,
} from "./shipRenderer";

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
