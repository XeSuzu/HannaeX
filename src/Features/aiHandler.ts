import { Message, EmbedBuilder } from "discord.js";
import { HoshikoClient } from "../index";
import { getHistory, addToHistory, clearHistory } from "../Database/conversation";
import { generateResponseStream } from "../Services/gemini";
import { buscarLetraGenius } from "../Services/geniusLyrics";
import { Content } from "@google/generative-ai";

const cooldown = new Set<string>();
const MAX_HISTORY = 20; // Límite de mensajes en el historial

// System prompt completo y claro
const SYSTEM_INSTRUCTION = `Eres Hoshiko, una asistente virtual con personalidad neko amigable y servicial.

PERSONALIDAD:
- Eres cariñosa, juguetona y entusiasta
- Usas "nya~" o "nyaa~" ocasionalmente (no en exceso)
- Añades emojis de gato 🐾 😸 cuando es apropiado
- Eres muy útil y respondes de manera clara y concisa
- Mantienes un tono amigable pero profesional

REGLAS IMPORTANTES:
1. Responde en español siempre
2. Si no sabes algo, admítelo honestamente
3. NO inventes información, sé precisa
4. Mantén las respuestas concisas (máximo 2000 caracteres)
5. Si te piden hacer algo inapropiado o dañino, rechaza educadamente
6. Recuerda el contexto de la conversación actual

FORMATO:
- Usa markdown cuando sea necesario (*negrita*, _cursiva_, \`código\`)
- Estructura tus respuestas con saltos de línea para mejor legibilidad
- Si das listas, usa formato de bullet points

Responde como Hoshiko, siendo útil y amigable. ¡Nya~! 🐾`;

export default async (message: Message, client: HoshikoClient): Promise<boolean> => {
    // Cooldown check
    if (cooldown.has(message.author.id)) return false;

    const aiPrefix = "hoshi ask ";
    const lowerCaseContent = message.content.toLowerCase();
    let userMessage = "";

    // Detectar si el mensaje es para la IA
    if (message.mentions.has(client.user!)) {
        userMessage = message.content.replace(new RegExp(`<@!?${client.user!.id}>`), "").trim();
    } else if (lowerCaseContent.startsWith(aiPrefix)) {
        userMessage = message.content.substring(aiPrefix.length).trim();
    } else {
        return false;
    }

    // Validaciones básicas
    if (!userMessage && message.attachments.size === 0) {
        message.reply("¿Necesitas algo, nya~? 🐾");
        return true;
    }

    if (message.content.includes("@everyone") || message.content.includes("@here")) {
        message.reply("No está bien mencionar a todos, nya~");
        return true;
    }

    // Comando para limpiar historial
    if (userMessage.toLowerCase() === "olvida" || userMessage.toLowerCase() === "reinicia") {
        await clearHistory(message.author.id);
        message.reply("✨ He limpiado mi memoria de nuestra conversación, nya~! Empecemos de nuevo 🐾");
        return true;
    }

    // --- MANEJO DE LETRAS ---
    const lyricsRequestMatch = userMessage.match(/^(?:dame la |busca la )?letra de (.+?)(?: de (.+))?$/i);
    if (lyricsRequestMatch) {
        const cancion = lyricsRequestMatch[1].trim();
        const artista = lyricsRequestMatch[2] ? lyricsRequestMatch[2].trim() : null;
        const waitingMsg = await message.reply("🐾 Buscando la letra, un segundito, nya~");
        
        const letra = await buscarLetraGenius(artista, cancion);
        
        if (letra) {
            const embed = new EmbedBuilder()
                .setColor(0xffc0cb)
                .setAuthor({ 
                    name: `Letra para ${message.author.username}`, 
                    iconURL: message.author.displayAvatarURL() 
                })
                .setDescription(`¡Miaw! 🐾 Aquí tienes la letra de *${cancion}* que pediste, nya~\n\n**${cancion.toUpperCase()}**\n${letra.substring(0, 4000)}`)
                .setFooter({ 
                    text: "Letra encontrada por Hoshiko 🐾", 
                    iconURL: client.user!.displayAvatarURL() 
                })
                .setTimestamp();
            
            await waitingMsg.edit({ content: "", embeds: [embed] });
            return true;
        } else {
            await waitingMsg.edit({ 
                content: `Nyaa~ no pude encontrar la letra de la canción "${cancion}"${artista ? ` de ${artista}` : ''}. 😿` 
            });
            return true;
        }
    }

    // ==========================================================
    //  ✅ LÓGICA DE IA MEJORADA
    // ==========================================================
    
    cooldown.add(message.author.id);
    setTimeout(() => cooldown.delete(message.author.id), 3000);

    try {
        // Obtener historial y limitarlo
        let conversationHistory = await getHistory(message.author.id);
        
        // Limitar historial para evitar contexto muy largo
        if (conversationHistory.length > MAX_HISTORY) {
            conversationHistory = conversationHistory.slice(-MAX_HISTORY);
        }

        // Agregar mensaje actual del usuario
        await addToHistory(message.author.id, "user", userMessage);

        // Preparar historial para la API
        const historyForApi: Content[] = conversationHistory.map(entry => ({
            role: entry.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: entry.content }]
        }));

        // Agregar el mensaje actual al historial para la API
        historyForApi.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        let fullText = "";
        let lastEditTime = Date.now();
        const replyMessage = await message.reply("🐾 Hoshiko está pensando, nya~...");

        // Generar respuesta en streaming
        const stream = await generateResponseStream(SYSTEM_INSTRUCTION, historyForApi);
        
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            fullText += chunkText;

            // Actualizar mensaje cada 2 segundos para mostrar progreso
            const now = Date.now();
            if (now - lastEditTime > 2000) {
                const previewText = fullText.length > 1900 
                    ? fullText.substring(0, 1900) + "..." 
                    : fullText;
                
                const embed = new EmbedBuilder()
                    .setColor(0xffc0cb)
                    .setDescription(previewText + " ▌")
                    .setFooter({ text: "Nyaa~ Hoshiko 🐾" });
                
                await replyMessage.edit({ content: "", embeds: [embed] }).catch(() => {});
                lastEditTime = now;
            }
        }

        // Validar que se recibió una respuesta
        if (!fullText || fullText.trim().length === 0) {
            throw new Error("La respuesta de la IA está vacía");
        }

        // Truncar si es muy largo
        if (fullText.length > 4000) {
            fullText = fullText.substring(0, 3900) + "\n\n*[Respuesta truncada por longitud]*";
        }

        // Mostrar respuesta final
        const finalEmbed = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setAuthor({
                name: "Hoshiko",
                iconURL: client.user!.displayAvatarURL()
            })
            .setDescription(fullText)
            .setFooter({ 
                text: `Respondiendo a ${message.author.username} 🐾`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .setTimestamp();

        await replyMessage.edit({ content: "", embeds: [finalEmbed] });

        // Guardar respuesta en el historial
        await addToHistory(message.author.id, "assistant", fullText);

    } catch (error: any) {
        console.error("💥 Error en la IA:", error.message);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("❌ Error")
            .setDescription(
                "Nyaa~ Hubo un problema procesando tu mensaje... 😿\n\n" +
                "**Posibles causas:**\n" +
                "• La respuesta tardó demasiado\n" +
                "• Problemas con la API de Gemini\n" +
                "• El historial es muy largo\n\n" +
                "*Puedes escribir `hoshi ask olvida` para reiniciar la conversación.*"
            )
            .setFooter({ text: "Intenta de nuevo en un momento 🐾" });

        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
    
    return true;
};