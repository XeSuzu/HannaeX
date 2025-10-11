import { Message, EmbedBuilder } from "discord.js";
import { HoshikoClient } from "../index";
import { getHistory, addToHistory } from "../Database/conversation";
import { generateResponseStream } from "../Services/gemini";
import { buscarLetraGenius } from "../Services/geniusLyrics";

const cooldown = new Set<string>();

export default async (message: Message, client: HoshikoClient): Promise<boolean> => {
    if (cooldown.has(message.author.id)) return false;

    const aiPrefix = "hoshi ask ";
    const lowerCaseContent = message.content.toLowerCase();
    let userMessage = "";

    if (message.mentions.has(client.user!)) {
        userMessage = message.content.replace(new RegExp(`<@!?${client.user!.id}>`), "").trim();
    } else if (lowerCaseContent.startsWith(aiPrefix)) {
        userMessage = message.content.substring(aiPrefix.length).trim();
    } else {
        return false;
    }

    if (!userMessage && message.attachments.size === 0) {
        message.reply("¿Necesitas algo, nya~? 🐾");
        return true;
    }
    if (message.content.includes("@everyone") || message.content.includes("@here")) {
        message.reply("No está bien mencionar a todos, nya~");
        return true;
    }

    const lyricsRequestMatch = userMessage.match(/^(?:dame la |busca la )?letra de (.+?)(?: de (.+))?$/i);
    if (lyricsRequestMatch) {
        const cancion = lyricsRequestMatch[1].trim();
        const artista = lyricsRequestMatch[2] ? lyricsRequestMatch[2].trim() : null;
        const waitingMsg = await message.reply("🐾 Buscando la letra, un segundito, nya~");
        const letra = await buscarLetraGenius(artista, cancion);
        if (letra) {
            const embed = new EmbedBuilder().setColor(0xffc0cb)
                .setAuthor({ name: `Letra para ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setDescription(`¡Miaw! 🐾 Aquí tienes la letra de *${cancion}* que pediste, nya~\n\n**${cancion.toUpperCase()}**\n${letra.substring(0, 4000)}`)
                .setFooter({ text: "Letra encontrada por Hoshiko 🐾", iconURL: client.user!.displayAvatarURL() }).setTimestamp();
            await waitingMsg.edit({ content: "", embeds: [embed] });
            return true;
        } else {
            userMessage = `Nyaa~ no pude encontrar la letra de la canción "${cancion}"${artista ? ` de ${artista}` : ''}. 😿`;
        }
    }

    cooldown.add(message.author.id);
    setTimeout(() => cooldown.delete(message.author.id), 3000);
    console.log(`[Hoshiko AI] ${message.author.tag}: "${userMessage}"`);
    await addToHistory(message.author.id, "user", userMessage);
    const conversationHistory = (await getHistory(message.author.id)).slice(-5);
    const prompt = `Eres Hoshiko... (Tu prompt completo va aquí)... Hoshiko:`; // Acorta el prompt por brevedad
    const stream = await generateResponseStream(prompt);
    let fullText = "";
    const replyMessage = await message.reply("Hoshiko está pensando... 🐾");
    let buffer = "";
    try {
        for await (const chunk of stream) {
            fullText += chunk.text(); buffer += chunk.text();
            if (Date.now() - (replyMessage.editedTimestamp || replyMessage.createdTimestamp) > 1500 && buffer) {
                const embed = new EmbedBuilder().setColor(0xffc0cb).setDescription(fullText + " ▌").setFooter({ text: "Nyaa~ Hoshiko 🐾" });
                await replyMessage.edit({ content: "", embeds: [embed] }).catch(() => {});
                buffer = "";
            }
        }
    } finally {
        const finalEmbed = new EmbedBuilder().setColor(0xffc0cb).setDescription(fullText || "Nyaa… me quedé sin palabras 💭🐾").setFooter({ text: "Powered by Hoshiko 🐾" });
        await replyMessage.edit({ content: "", embeds: [finalEmbed] }).catch(() => {});
    }
    if (fullText) await addToHistory(message.author.id, "assistant", fullText);
    return true;
};