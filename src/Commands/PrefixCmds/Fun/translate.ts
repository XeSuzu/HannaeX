import { Message, TextChannel, DMChannel, NewsChannel } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HoshikoClient } from "../../../index";

interface PrefixCommand {
  name: string;
  description: string;
  execute: (
    message: Message,
    args: string[],
    client: HoshikoClient,
  ) => Promise<void>;
}

const command: PrefixCommand = {
  name: "translate",
  description:
    "Traduce texto o el mensaje al que respondes usando Google Translate",

  async execute(message, args, client) {
    if (!message.channel || !message.channel.isTextBased()) return;
    const channel = message.channel as TextChannel | DMChannel | NewsChannel;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await channel.send("❌ Falta la variable de entorno `GEMINI_API_KEY`.");
      return;
    }

    const langMap: Record<string, string> = {
      en: "English",
      es: "Spanish",
      pt: "Portuguese",
      fr: "French",
      de: "German",
      ja: "Japanese",
      ko: "Korean",
      "zh-CN": "Chinese",
    };

    let target: string | null = null;
    let text = args.join(" ").trim();
    let autoDetectTarget = false;

    if (args.length > 0 && /^[a-zA-Z-]{2,5}$/.test(args[0])) {
      target = args[0];
      text = args.slice(1).join(" ").trim();
    }

    if ((!text || text.length === 0) && message.reference?.messageId) {
      try {
        const ref = await message.channel.messages.fetch(
          message.reference.messageId,
        );
        if (ref && ref.content) text = ref.content;
      } catch (err) {
        console.error("Error fetching referenced message:", err);
      }

      if (!target && text) {
        autoDetectTarget = true;
        try {
          const userMessages = await channel.messages.fetch({ limit: 10 });
          const userMsgs = userMessages
            .filter(
              (m) => m.author.id === message.author.id && m.content.length > 10,
            )
            .map((m) => m.content)
            .slice(0, 3);

          if (userMsgs.length > 0) {
            const userTexts = userMsgs.join("\n\n");
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
            });
            const detectUserLangPrompt = `Detect the language of this text and respond with ONLY the language name in English (e.g., Spanish, English, French):\n\n${userTexts}`;
            const detectUserResult = await model.generateContent({
              contents: [
                { role: "user", parts: [{ text: detectUserLangPrompt }] },
              ],
            });
            const detectedUserLang = detectUserResult.response.text().trim();

            for (const [code, name] of Object.entries(langMap)) {
              if (name.toLowerCase() === detectedUserLang.toLowerCase()) {
                target = code;
                break;
              }
            }
            if (!target) target = "en";
          } else {
            target = "en";
          }
        } catch (err) {
          console.error("Error detecting user language:", err);
          target = "en";
        }
      }
    }

    if (!text) {
      await channel.send(
        `❌ ${message.author}, uso: \`hoshi translate [idioma-destino] <texto>\` o responde a un mensaje.`,
      );
      return;
    }

    if (text.length > 4000) {
      await channel.send(
        "❌ El texto es demasiado largo para traducir (máx. 4000 caracteres).",
      );
      return;
    }

    if (!target) target = "en";

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const detectPrompt = `Detect the language of this text and respond with ONLY the language name in English (e.g., Spanish, English, French):\n\n${text}`;
      const detectResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: detectPrompt }] }],
      });
      const detectedLang = detectResult.response.text().trim();

      const targetLang = langMap[target] || target;
      const prompt = `Translate the following text to ${targetLang}. Respond with ONLY the translated text, nothing else:\n\n${text}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const translated = result.response.text();

      if (!translated) {
        await channel.send("❌ No se pudo obtener la traducción.");
        return;
      }

      const autoNote = autoDetectTarget ? " (idioma detectado)" : "";
      await channel.send(
        `🌐 Traducción (${detectedLang} → ${targetLang})${autoNote}:\n${translated}`,
      );
    } catch (err: any) {
      console.error(
        "Error en comando translate (prefix):",
        err?.message || err,
      );
      await channel.send("❌ Ocurrió un error al traducir.");
    }
  },
};

export = command;
