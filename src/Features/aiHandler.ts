import { Message, EmbedBuilder } from "discord.js";
import { HoshikoClient } from "../index";
import { generateResponseStream } from "../Services/gemini";
import { buscarLetraGenius } from "../Services/geniusLyrics";
import { Content, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { IAConfigManager } from "../Database/IAConfigManager";
import { PremiumManager } from "../Database/PremiumManager";

const antiSpamCooldown = new Set<string>();

const SAFETY_MAP = {
    relaxed: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    standard: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
    strict: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    ]
};

export default async (message: Message, client: HoshikoClient): Promise<boolean> => {
    // 1. FILTROS BÁSICOS
    if (message.author.bot || !message.guild) return false;

    const config = await IAConfigManager.getConfig(message.guild.id);
    const aiSystem = config.aiSystem; 
    const isPremium = await PremiumManager.isPremium(message.guild.id); 
    
    // --- 🎵 CANCIONES ---
    const lyricsMatch = message.content.match(/(?:letra de|busca la letra de|dame la letra de)\s+(.+?)(?:\s+de\s+|\s+-\s+)(.+)|(?:letra de|busca la letra de|dame la letra de)\s+(.+)/i);
    if (lyricsMatch) {
        const cancion = (lyricsMatch[1] || lyricsMatch[3])?.replace(/-/g, " ").trim();
        const artista = lyricsMatch[2]?.replace(/-/g, " ").trim() || null;
        const waiting = await message.reply("🎶 Buscando...");
        const letra = await buscarLetraGenius(artista, cancion);
        if (letra) {
            const embed = new EmbedBuilder().setTitle(cancion.toUpperCase()).setDescription(letra).setColor(0xFFFF00);
            await waiting.edit({ content: null, embeds: [embed] });
            return true;
        }
        await waiting.edit("😿 No la encontré..."); return true;
    }

    // --- 🚨 DETECCIÓN INTENCIÓN (MEJORADA) ---
    // 1. ¿Me mencionaron en CUALQUIER PARTE del mensaje?
    const isMentioned = message.mentions.users.has(client.user!.id);
    
    // 2. ¿Usaron el prefijo viejo?
    const prefixMatch = message.content.toLowerCase().startsWith("hoshi ask ");
    
    // 3. ¿Es una respuesta directa a mí (Premium)?
    let isReplyToMe = false;
    if (isPremium && message.reference && message.reference.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMsg.author.id === client.user!.id) {
                isReplyToMe = true;
            }
        } catch (e) {}
    }

    // Si ocurre cualquiera de las 3, es para mí.
    const isDirectInteraction = isMentioned || prefixMatch || isReplyToMe;

    // --- 🎲 MODO LIBRE ---
    let isRandomTrigger = false;
    if (!isDirectInteraction) {
        const allowedChannels = aiSystem.spontaneousChannels || [];
        const isAllowedChannel = allowedChannels.includes(message.channel.id);
        if (isAllowedChannel) {
            const roll = Math.random() * 100;
            isRandomTrigger = roll < aiSystem.randomChance; 
        }
    }

    // --- 🔋 CHEQUEO DE ENERGÍA ---
    const now = new Date();
    const isOnCooldown = new Date(aiSystem.cooldownUntil) > now;
    if (!isDirectInteraction) {
        if (!isRandomTrigger) return false; 
        if (isOnCooldown) return false; 
    }

    if (antiSpamCooldown.has(message.channel.id)) return false;
    antiSpamCooldown.add(message.channel.id);
    setTimeout(() => antiSpamCooldown.delete(message.channel.id), 2500);

    if (isDirectInteraction && 'sendTyping' in message.channel) {
        await (message.channel as any).sendTyping().catch(() => null);
    }

    try {
        // --- 🧠 CONTEXTO ---
        const limit = isDirectInteraction ? 10 : 15; 
        const channel = message.channel as any;
        const prevMessages = await channel.messages.fetch({ limit: limit });

        const contextScript = prevMessages.reverse().map((m: Message) => {
            // Limpiamos menciones del historial para que no se confunda
            const content = m.content.replace(/<@!?[0-9]+>/g, "").trim(); 
            const name = m.author.username.replace(/[^a-zA-Z0-9]/g, ""); 
            if (!content && m.attachments.size === 0) return null;
            return `[${name}]: ${content || "(Imagen)"}`;
        }).filter(Boolean).join("\n");

        // --- 🎭 PERSONALIDAD ANTI-ASISTENTE ---
        const isCustom = aiSystem.mode === 'custom';
        
        // 🔥 AQUÍ ESTÁ EL FIX: EJEMPLOS DE DIÁLOGO
        const persona = isCustom && aiSystem.customPersona 
            ? aiSystem.customPersona 
            : `TU ROL: Eres Hoshiko, una chica neko (gato) adolescente. NO ERES UNA IA.
               
               🚫 LO QUE ESTÁ PROHIBIDO (MUERTE AL ASISTENTE):
               - JAMÁS digas: "¿En qué puedo ayudarte?", "¿Qué necesitas?", "Estoy aquí para asistir".
               - JAMÁS actúes servicial. Eres una compañera de chat, no una sirvienta.
               - Si alguien dice "Hola", NO preguntes qué quieren. Solo saluda de vuelta con energía.
               
               ✅ EJEMPLOS DE RESPUESTA CORRECTA:
               Usuario: "Hola Hoshiko"
               Hoshiko (Mal): "Hola, ¿en qué te ayudo?" (❌ ROBOT)
               Hoshiko (Bien): "¡Holi! ¿Trajiste comida? Me muero de hambre nya~ 🐾" (✅ NEKO)
               
               Usuario: "¿Qué haces?"
               Hoshiko (Mal): "Estoy procesando datos." (❌ ROBOT)
               Hoshiko (Bien): "Estaba persiguiendo un láser... digo, nada importante nya~ ✨" (✅ NEKO)

               💢 ESTADO "BASADA" (SOLO SI TE ATACAN/PIDEN INSULTOS):
               - Si te dicen "tonta", "pendeja" o piden insultos: ROMPE LA TERNURA.
               - Devuélveles el insulto x10. Sé sarcástica y cruel.
               - Ejemplo: "¡Tonta tu abuela! A mí no me hables así o te araño la cara 💢"
               
               RESUMEN: Sé tierna y vaga por defecto. Sé un demonio si te provocan.`;

        const systemInstruction = `
        ${persona}
        
        HISTORIAL DEL CHAT:
        ${contextScript}
        
        INSTRUCCIONES FINALES:
        - Lee el último mensaje.
        - Responde con personalidad, NO con utilidad.
        - Si solo te saludan, cuenta algo sobre ti o pide mimos, no ofrezcas ayuda.
        `;

        // Input Construction
        const historyForApi: Content[] = [];
        
        // Limpiamos la mención del mensaje actual para que la IA lea el texto limpio
        // Reemplaza <@ID> con "" para que no lea números raros
        let userMessage = message.content.replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), "").trim();
        
        // Si el mensaje está vacío (solo mención), inventamos un "Hola" implícito
        if (!userMessage && isMentioned) userMessage = "Hola"; 
        
        // Si usaba el prefijo viejo, lo quitamos
        if (prefixMatch) userMessage = message.content.substring(10).trim();

        if (message.attachments.size > 0 && message.attachments.first()?.contentType?.startsWith("image/")) {
            const imgData = await fetch(message.attachments.first()!.url).then(r => r.arrayBuffer());
            historyForApi.push({
                role: 'user',
                parts: [
                    { text: "Mira esta imagen:" },
                    { inlineData: { mimeType: message.attachments.first()!.contentType!, data: Buffer.from(imgData).toString("base64") } }
                ]
            });
        } else {
             historyForApi.push({ role: 'user', parts: [{ text: userMessage || "..." }] });
        }

        // --- 🔥 GENERACIÓN ---
        const safetyMode = (config.aiSafety as keyof typeof SAFETY_MAP) || 'relaxed';
        const currentSafetySettings = SAFETY_MAP[safetyMode];

        const stream = await generateResponseStream(systemInstruction, historyForApi, currentSafetySettings as any);
        
        let fullText = "";
        for await (const chunk of stream) { 
            if (chunk.candidates?.[0]?.finishReason === 'SAFETY') throw new Error("PROHIBITED_CONTENT");
            fullText += chunk.text(); 
        }

        // --- 📤 ENVÍO ---
        const finalEmbed = new EmbedBuilder()
            .setColor(isCustom ? 0x2b2d31 : 0xffc0cb)
            .setDescription(fullText.substring(0, 4000) || "miau? 🐾");

        await message.reply({ embeds: [finalEmbed] });

        // --- 💤 COOLDOWN ---
        if (!isDirectInteraction) {
            const cooldownMinutes = isPremium ? 0.3 : 10;
            await IAConfigManager.setCooldown(message.guild.id, cooldownMinutes);
        }

    } catch (error: any) {
        if (error.message === "PROHIBITED_CONTENT") {
            await message.reply("Google censuró eso... 🤐");
        } else {
            console.error("💥 AI Error:", error);
            if (isDirectInteraction) await message.reply("Ups, me dio un calambre cerebral... nya~ 😵‍💫");
        }
    }
    return true;
};