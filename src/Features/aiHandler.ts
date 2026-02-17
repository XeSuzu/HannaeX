import { Message, EmbedBuilder } from "discord.js";
import { HoshikoClient } from "../index";
import { generateResponseStream } from "../Services/gemini";
import { buscarLetraGenius } from "../Services/geniusLyrics";
import { Content } from "@google/generative-ai";
import { IAConfigManager } from "../Database/IAConfigManager";
import { PremiumManager } from "../Database/PremiumManager";
import ServerConfig from "../Models/serverConfig";
import { SystemPrompts } from "../Utils/AI/SystemPrompts";

const antiSpamCooldown = new Set<string>();

export default async (
  message: Message,
  client: HoshikoClient,
): Promise<boolean> => {
  // 1. FILTROS BÁSICOS
  if (message.author.bot || !message.guild) return false;

  // Cargar configuración completa
  let config = await ServerConfig.findOne({ guildId: message.guild.id });
  if (!config) config = new ServerConfig({ guildId: message.guild.id });

  // Asegurar que aiSystem existe
  const aiSystem = config.aiSystem || {
    mode: "neko",
    behavior: "normal",
    randomChance: 3,
    spontaneousChannels: [],
  };
  const isPremium = await PremiumManager.isPremium(message.guild.id);

  // --- 🎵 CANCIONES ---
  const lyricsMatch = message.content.match(
    /(?:letra de|busca la letra de|dame la letra de)\s+(.+?)(?:\s+de\s+|\s+-\s+)(.+)|(?:letra de|busca la letra de|dame la letra de)\s+(.+)/i,
  );
  if (lyricsMatch) {
    const cancion = (lyricsMatch[1] || lyricsMatch[3])
      ?.replace(/-/g, " ")
      .trim();
    const artista = lyricsMatch[2]?.replace(/-/g, " ").trim() || null;
    const waiting = await message.reply("🎶 Buscando...");
    const letra = await buscarLetraGenius(artista, cancion);
    if (letra) {
      const embed = new EmbedBuilder()
        .setTitle(cancion.toUpperCase())
        .setDescription(letra)
        .setColor(0xffff00);
      await waiting.edit({ content: null, embeds: [embed] });
      return true;
    }
    await waiting.edit("😿 No la encontré...");
    return true;
  }

  // --- 🚨 DETECCIÓN DE INTERÉS (GATILLOS) ---
  const isMentioned = message.mentions.users.has(client.user!.id);
  const prefixMatch = message.content.toLowerCase().startsWith("hoshi ask ");

  let isReplyToMe = false;
  if (isPremium && message.reference && message.reference.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      if (repliedMsg.author.id === client.user!.id) isReplyToMe = true;
    } catch (e) {}
  }

  const isDirectInteraction = isMentioned || prefixMatch || isReplyToMe;

  // --- 🎲 GATILLO ESPONTÁNEO ---
  let isRandomTrigger = false;
  if (!isDirectInteraction) {
    const allowedChannels = aiSystem.spontaneousChannels || [];
    if (allowedChannels.includes(message.channel.id)) {
      const roll = Math.random() * 100;
      isRandomTrigger = roll < (aiSystem.randomChance || 3);
    }
  }

  // --- 🔋 CHEQUEO DE ENERGÍA / COOLDOWN ---
  const now = new Date();
  const isOnCooldown = new Date(aiSystem.cooldownUntil || 0) > now;
  if (!isDirectInteraction) {
    if (!isRandomTrigger) return false;
    if (isOnCooldown) return false;
  }

  if (antiSpamCooldown.has(message.channel.id)) return false;
  antiSpamCooldown.add(message.channel.id);
  setTimeout(() => antiSpamCooldown.delete(message.channel.id), 2500);

  // Indicador visual
  if (isDirectInteraction && "sendTyping" in message.channel) {
    await (message.channel as any).sendTyping().catch(() => null);
  }

  try {
    // --- 🧠 CONSTRUCCIÓN DEL CONTEXTO ---
    const limit = isDirectInteraction ? 10 : 15;
    const channel = message.channel as any;
    const prevMessages = await channel.messages.fetch({ limit: limit });

    const chatHistoryScript = prevMessages
      .reverse()
      .map((m: Message) => {
        const content = m.content.replace(/<@!?[0-9]+>/g, "").trim();
        const name = m.author.username.replace(/[^a-zA-Z0-9]/g, "");
        if (!content && m.attachments.size === 0) return null;
        return `[${name}]: ${content || "(Imagen)"}`;
      })
      .filter(Boolean)
      .join("\n");

    // =================================================================
    // 🔥 CARGA DE INSTRUCCIONES DINÁMICAS (Nuevo Sistema)
    // =================================================================

    // 1. Obtenemos la personalidad desde SystemPrompts (actualizado a Neko/Maid/etc)
    const basePersona = SystemPrompts.getInstruction(config);

    // 2. Fusionamos con el historial
    const systemInstruction = `
        ${basePersona}
        
        CONTEXTO RECIENTE DEL CHAT:
        ${chatHistoryScript}
        
        INSTRUCCIÓN FINAL:
        Responde al último mensaje basándote estrictamente en tu ROL definido arriba.
        `;

    // =================================================================

    // Preparar Input para Gemini
    const historyForApi: Content[] = [];

    let userMessage = message.content
      .replace(new RegExp(`<@!?${client.user!.id}>`, "g"), "")
      .trim();
    if (!userMessage && isMentioned) userMessage = "Hola";
    if (prefixMatch) userMessage = message.content.substring(10).trim();

    if (
      message.attachments.size > 0 &&
      message.attachments.first()?.contentType?.startsWith("image/")
    ) {
      const imgData = await fetch(message.attachments.first()!.url).then((r) =>
        r.arrayBuffer(),
      );
      historyForApi.push({
        role: "user",
        parts: [
          { text: "Mira esta imagen:" },
          {
            inlineData: {
              mimeType: message.attachments.first()!.contentType!,
              data: Buffer.from(imgData).toString("base64"),
            },
          },
        ],
      });
    } else {
      historyForApi.push({
        role: "user",
        parts: [{ text: userMessage || "..." }],
      });
    }

    // --- LLAMADA A LA API ---

    // Determinamos el nivel de seguridad basado en la configuración
    // El comando /setup ya guarda 'relaxed' si el modo es agresivo
    const safetyMode =
      (config.aiSafety as "relaxed" | "standard" | "strict") || "standard";

    // ⚠️ CORRECCIÓN: Pasamos el STRING 'safetyMode', no el objeto complejo.
    // gemini.ts ya sabe convertir el string a las reglas de Google.
    const stream = await generateResponseStream(
      systemInstruction,
      historyForApi,
      safetyMode,
    );

    let fullText = "";
    for await (const chunk of stream) {
      if (chunk.candidates?.[0]?.finishReason === "SAFETY")
        throw new Error("PROHIBITED_CONTENT");
      fullText += chunk.text();
    }

    // --- RESPUESTA ---
    // 🎨 Color varía según el comportamiento (Nuevo sistema)
    const behavior = aiSystem.behavior || "normal";
    let embedColor = 0xffb6c1; // Rosa (Normal)

    if (behavior === "pesado") embedColor = 0xffa500; // Naranja
    if (behavior === "agresivo") embedColor = 0xff0000; // Rojo

    const finalEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setDescription(fullText.substring(0, 4000) || "...");

    await message.reply({ embeds: [finalEmbed] });

    // Cooldown
    if (!isDirectInteraction) {
      const cooldownMinutes = isPremium ? 0.3 : 10;
      await IAConfigManager.setCooldown(message.guild.id, cooldownMinutes);
    }
  } catch (error: any) {
    if (error.message === "PROHIBITED_CONTENT") {
      await message.reply(
        "Lo siento, mis protocolos de seguridad bloquean ese tema. 🤐",
      );
    } else {
      console.error("💥 AI Error:", error);
      if (isDirectInteraction)
        await message.reply(
          "Tuve un pequeño error procesando eso. ¿Intentamos de nuevo?",
        );
    }
  }
  return true;
};
