import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

const LANG_CHOICES = [
  ["Auto Detect", "auto"],
  ["English", "en"],
  ["Spanish", "es"],
  ["Portuguese", "pt"],
  ["French", "fr"],
  ["German", "de"],
  ["Japanese", "ja"],
  ["Korean", "ko"],
  ["Chinese (Simplified)", "zh-CN"],
] as const;

const command: SlashCommand = {
  category: "Fun",
  cooldown: 5, // 5 segundos entre traducciones
  data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription(
      "Traduce texto detectando automáticamente el idioma de origen",
    )
    .addStringOption((opt) => {
      let o = opt
        .setName("target")
        .setDescription("Idioma destino (defecto: English)")
        .setRequired(false);
      for (const [name, value] of LANG_CHOICES)
        o = o.addChoices({ name, value } as any);
      return o;
    })
    .addStringOption((opt) =>
      opt
        .setName("text")
        .setDescription(
          "Texto a traducir (si se omite intentará traducir el último mensaje)",
        )
        .setRequired(false),
    ),

  async execute(interaction, client) {
    // ❌ ELIMINADO: await interaction.deferReply();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await interaction.editReply(
        "❌ Falta la variable de entorno `GEMINI_API_KEY`.",
      );
      return;
    }

    let text = interaction.options.getString("text");
    const targetInput = interaction.options.getString("target") || "en";

    // If no text provided, attempt to fetch the last non-bot message in the channel
    if (!text) {
      try {
        const channel = interaction.channel;
        if (!channel || !channel.isTextBased()) {
          await interaction.editReply(
            "❌ No puedo acceder al canal para obtener el mensaje.",
          );
          return;
        }
        const messages = await channel.messages.fetch({ limit: 5 });
        const last = messages
          .filter((m) => !m.author.bot)
          .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
          .first();
        if (!last) {
          await interaction.editReply(
            "❌ No encontré un mensaje válido para traducir.",
          );
          return;
        }
        text = last.content;
      } catch (err) {
        console.error("Error obteniendo mensaje anterior:", err);
        await interaction.editReply("❌ Error al obtener el mensaje anterior.");
        return;
      }
    }

    if (!text || text.trim().length === 0) {
      await interaction.editReply(
        "❌ Debes indicar texto a traducir o usar el comando en un canal con mensajes recientes.",
      );
      return;
    }

    if (text.length > 4000) {
      await interaction.editReply(
        "❌ El texto es demasiado largo para traducir (máx. 4000 caracteres).",
      );
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const langMap: Record<string, string> = {
        auto: "",
        en: "English",
        es: "Spanish",
        pt: "Portuguese",
        fr: "French",
        de: "German",
        ja: "Japanese",
        ko: "Korean",
        "zh-CN": "Chinese",
      };

      // Detectar idioma de origen
      const detectPrompt = `Detect the language of this text and respond with ONLY the language name in English (e.g., Spanish, English, French):\n\n${text}`;
      const detectResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: detectPrompt }] }],
      });
      const detectedLang = detectResult.response.text().trim();

      const targetLang = langMap[targetInput] || targetInput;
      const prompt = `Translate the following text to ${targetLang}. Respond with ONLY the translated text, nothing else:\n\n${text}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const translated = result.response.text();

      if (!translated) {
        await interaction.editReply("❌ No se pudo obtener la traducción.");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🌐 Traducción (Gemini)")
        .addFields(
          { name: "Detectado", value: detectedLang, inline: true },
          { name: "Destino", value: targetLang, inline: true },
          {
            name: "Original",
            value: text.length > 200 ? text.substring(0, 200) + "..." : text,
          },
        )
        .setDescription(translated)
        .setColor(0x57f287)
        .setFooter({ text: `Solicitado por ${interaction.user.username}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("Error en /translate:", err?.message || err);
      await interaction.editReply("❌ Ocurrió un error al traducir.");
    }
  },
};
export default command;