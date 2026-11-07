import { Message, TextChannel, DMChannel, NewsChannel } from "discord.js";
import { LANGUAGE_MAP, translateText } from "../../../Services/translationService";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { PrefixCommand } from "../../../Interfaces/Command";
import {
  ADMIN_MARKER,
  markAsAdminMessage,
} from "../../../Features/ai/adminMessageTracker";

const command: PrefixCommand = {
  name: "translate",
  description:
    "Traduce texto o el mensaje al que respondes usando la IA de Hoshiko",

  async execute(message: Message, args: string[], _client: HoshikoClient) {
    if (!message.channel || !message.channel.isTextBased()) return;
    const channel = message.channel as TextChannel | DMChannel | NewsChannel;

    const langMap = LANGUAGE_MAP;

    let target: string | null = null;
    let text = args.join(" ").trim();

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

    if (!target) target = "es";

    try {
      const targetLang =
        target === "auto" ? "Spanish" : langMap[target] || target;
      const { detectedLang, translation: translated } = await translateText(
        text,
        targetLang,
      );

      if (!translated) {
        await channel.send("❌ No se pudo obtener la traducción.");
        return;
      }

      const sent = await channel.send(
        `🌐 Traducción (${detectedLang} → ${targetLang}):\n${translated}${ADMIN_MARKER}`,
      );
      if (sent?.id) markAsAdminMessage(sent.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        "Error en comando translate (prefix):",
        errorMessage,
      );
      await channel.send("❌ Ocurrió un error al traducir.");
    }
  },
};

export default command;
