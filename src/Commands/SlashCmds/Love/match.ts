import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { HoshikoClient } from "../../../index";

export default {
  category: "Social",
  data: new SlashCommandBuilder()
    .setName("match")
    .setDescription(
      "🖼️ Fusiona dos avatares para ver si combinan (Matching Icons).",
    )
    .addUserOption((opt) =>
      opt.setName("usuario1").setDescription("Izquierda").setRequired(true),
    )
    .addUserOption((opt) =>
      opt.setName("usuario2").setDescription("Derecha").setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    await interaction.deferReply();

    const user1 = interaction.options.getUser("usuario1", true);
    const user2 = interaction.options.getUser("usuario2") || interaction.user;

    try {
      // 1. CONFIGURACIÓN DEL LIENZO
      // Hacemos el canvas ancho (2:1 exacto)
      const sideSize = 400; // Tamaño de cada avatar
      const width = sideSize * 2; // 800
      const height = sideSize; // 400

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // 2. CARGAR IMÁGENES
      const avatar1 = await loadImage(
        user1.displayAvatarURL({ extension: "png", size: 512 }),
      );
      const avatar2 = await loadImage(
        user2.displayAvatarURL({ extension: "png", size: 512 }),
      );

      // 3. DIBUJAR (LA FUSIÓN)
      // Lado Izquierdo
      ctx.drawImage(avatar1, 0, 0, sideSize, height);
      // Lado Derecho (Pegado exactamente al píxel 400)
      ctx.drawImage(avatar2, sideSize, 0, sideSize, height);

      // ==========================================================
      // 🎨 EFECTOS VISUALES PARA QUE PAREZCA UNA SOLA FOTO
      // ==========================================================

      // A) EL "COSIDO" CENTRAL (The Stitch)
      // Esto oculta el corte duro y hace que parezca una unión estilizada
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; // Línea blanca semitransparente
      ctx.beginPath();
      ctx.moveTo(sideSize, 0);
      ctx.lineTo(sideSize, height);
      ctx.stroke();

      // Sombra en la unión para dar profundidad
      const gradient = ctx.createLinearGradient(
        sideSize - 20,
        0,
        sideSize + 20,
        0,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.5, "rgba(0,0,0,0.3)"); // Oscuro en el centro
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(sideSize - 20, 0, 40, height);

      // B) MARCO EXTERNO UNIFICADO
      // Un borde grueso que rodea TODO el rectángulo para forzar al ojo a verlo como uno solo
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 15;
      ctx.strokeRect(0, 0, width, height);

      // C) ICONO DE UNIÓN (Pequeño detalle en el centro)
      // Un pequeño eslabón o corazón discreto
      ctx.font = "40px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "black";
      ctx.shadowBlur = 5;
      ctx.fillText("🔗", sideSize, height / 2); // Eslabón de cadena

      // 4. ENVIAR
      const attachment = new AttachmentBuilder(await canvas.encode("png"), {
        name: "match-icons.png",
      });

      const embed = new EmbedBuilder()
        .setColor("#2b2d31") // Color neutro/oscuro de Discord
        .setImage("attachment://match-icons.png")
        .setFooter({ text: `${user1.username} + ${user2.username}` });

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Hubo un error procesando las imágenes.");
    }
  },
};
