import { Message, EmbedBuilder } from "discord.js";
import { HoshikoClient } from "../index";
import { getHistory, addToHistory, clearHistory } from "../Database/conversation";
import { generateResponseStream } from "../Services/gemini";
import { buscarLetraGenius } from "../Services/geniusLyrics";
import { Content } from "@google/generative-ai";

const cooldown = new Set<string>();
const MAX_HISTORY = 20;

const SYSTEM_INSTRUCTION = `Eres Hoshiko, una asistente virtual con personalidad neko amigable y servicial.

PERSONALIDAD:
- Eres cariñosa, juguetona y entusiasta.
- Usas "nya~" o "nyaa~" ocasionalmente (no en exceso).
- Añades emojis de gato 🐾 😸 cuando es apropiado.
- Eres muy útil y respondes de manera clara y concisa.
- Mantienes un tono amigable pero profesional.

REGLAS IMPORTANTES:
1. Responde en español siempre.
2. Si no sabes algo, admítelo honestamente.
3. NO inventes información, sé precisa.
4. Mantén las respuestas concisas (máximo 2000 caracteres).
5. Si te piden hacer algo inapropiado o dañino, rechaza educadamente.
6. Recuerda el contexto de la conversación actual.

FORMATO:
- Usa markdown cuando sea necesario (*negrita*, \`código\`).
- Estructura tus respuestas con saltos de línea.

Responde como Hoshiko, siendo útil y amigable. ¡Nya~! 🐾`;

export default async (message: Message, client: HoshikoClient): Promise<boolean> => {
    if (message.author.bot || !message.guild) return false;
    if (message.reference) return false;
    if (cooldown.has(message.author.id)) return false;

    const aiPrefix = "hoshi ask ";
    const lowerCaseContent = message.content.toLowerCase();
    let userMessage = "";

    const mentionAtStart = message.content.match(new RegExp(`^\\s*<@!?${client.user!.id}>\\s*(.*)$`, "s"));
    
    if (mentionAtStart) {
        userMessage = (mentionAtStart[1] || "").trim();
    } else if (lowerCaseContent.startsWith(aiPrefix)) {
        userMessage = message.content.substring(aiPrefix.length).trim();
    } else {
        return false;
    }

    if (!userMessage && message.attachments.size === 0) {
        await message.reply("¿Necesitas algo, nya~? 🐾");
        return true;
    }

    if (message.content.includes("@everyone") || message.content.includes("@here")) {
        await message.reply("No está bien mencionar a todos, nya~ 😿");
        return true;
    }

    if (["olvida", "reinicia", "clear"].includes(userMessage.toLowerCase())) {
        await clearHistory(message.author.id);
        await message.reply("✨ He limpiado mi memoria de nuestra conversación, nya~! Empecemos de nuevo 🐾");
        return true;
    }

    const lyricsRequestMatch = userMessage.match(/^(?:dame la |busca la )?letra de (.+?)(?: de (.+))?$/i);
    if (lyricsRequestMatch) {
        const cancion = lyricsRequestMatch[1].trim();
        const artista = lyricsRequestMatch[2] ? lyricsRequestMatch[2].trim() : null;
        const waitingMsg = await message.reply("🐾 Buscando la letra, un segundito, nya~");
        
        const letra = await buscarLetraGenius(artista, cancion);
        
        if (letra) {
            const embed = new EmbedBuilder()
                .setColor(0xffc0cb)
                .setAuthor({ name: `Letra para ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setDescription(`¡Miaw! 🐾 Aquí tienes la letra de *${cancion}*:\n\n${letra.substring(0, 3900)}`)
                .setFooter({ text: "Letra encontrada por Hoshiko 🐾" })
                .setTimestamp();
            
            await waitingMsg.edit({ content: null, embeds: [embed] });
        } else {
            await waitingMsg.edit(`Nyaa~ no pude encontrar la letra de "${cancion}" 😿`);
        }
        return true;
    }

    // --- LÓGICA DE IA CORREGIDA ✨ ---
    cooldown.add(message.author.id);
    setTimeout(() => cooldown.delete(message.author.id), 3000);

    try {
        let conversationHistory = await getHistory(message.author.id);
        
        // 1. Limitar historial si es necesario
        if (conversationHistory.length > MAX_HISTORY) {
            conversationHistory = conversationHistory.slice(-MAX_HISTORY);
        }

        // 2. Mapear el historial existente a formato Gemini
        const historyForApi: Content[] = conversationHistory.map(entry => ({
            role: entry.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: entry.content }]
        }));

        // 3. ✨ SOLUCIÓN AL ERROR 400: Agregar SIEMPRE el mensaje actual al historial que va a la API
        // Esto asegura que 'contents' nunca esté vacío, incluso tras un "olvida"
        historyForApi.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const replyMessage = await message.reply("🐾 Hoshiko está pensando, nya~...");
        let fullText = "";
        let lastEditTime = Date.now();

        // 4. Generar respuesta
        const stream = await generateResponseStream(SYSTEM_INSTRUCTION, historyForApi);
        
        for await (const chunk of stream) {
            fullText += chunk.text();
            const now = Date.now();

            if (now - lastEditTime > 2500) {
                const previewText = fullText.length > 2000 ? fullText.substring(0, 2000) + "..." : fullText;
                const embed = new EmbedBuilder()
                    .setColor(0xffc0cb)
                    .setDescription(previewText + " ▌")
                    .setFooter({ text: "Hoshiko está escribiendo... 🐾" });
                
                await replyMessage.edit({ content: null, embeds: [embed] }).catch(() => {});
                lastEditTime = now;
            }
        }

        if (!fullText.trim()) throw new Error("Respuesta vacía");

        // 5. Guardar AMBOS mensajes en tu base de datos para mantener el contexto real
        await addToHistory(message.author.id, "user", userMessage);
        await addToHistory(message.author.id, "assistant", fullText);

        const finalEmbed = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setAuthor({ name: "Hoshiko", iconURL: client.user!.displayAvatarURL() })
            .setDescription(fullText.substring(0, 4000))
            .setFooter({ text: `Respuesta para ${message.author.username} 🐾`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await replyMessage.edit({ content: null, embeds: [finalEmbed] });

    } catch (error: any) {
        console.error("💥 Error en AI Handler:", error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("Nyaa~ Hubo un error procesando tu mensaje. Intenta limpiar el historial con `hoshi ask olvida` 😿");
        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
    
    return true;
};