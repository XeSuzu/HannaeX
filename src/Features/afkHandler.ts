import { Message, EmbedBuilder } from "discord.js";
import AFK from "../Models/afk";

export default async (message: Message): Promise<boolean> => {
    if (!message.guild || message.author.bot) return false;

    let handled = false;

    // 1️⃣ Revisar si el autor del mensaje estaba AFK 💤
    const authorAfkData = await AFK.findOneAndDelete({
        userId: message.author.id,
        guildId: message.guild.id,
    });

    if (authorAfkData) {
        const member = message.member;

        // Restaurar el apodo si el bot tiene permisos
        if (member && member.manageable && member.displayName.startsWith("[AFK]")) {
            const originalNickname = authorAfkData.originalNickname || member.user.username;
            await member.setNickname(originalNickname).catch(() => {});
        }

        const timestamp = Math.floor(authorAfkData.timestamp.getTime() / 1000);
        const mensajes = [
            `¡Nyah~ ${message.author.username} volvió de su siesta! 💤🐾`,
            `El neko ha despertado, bienvenid@ de vuelta 💖`,
            `¡Bienvenid@ de vuelta! Te extrañamos, nya~ 💞`
        ];
        const randomMsg = mensajes[Math.floor(Math.random() * mensajes.length)];

        const embedReturn = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setTitle("🌸 Has vuelto")
            .setDescription(`${randomMsg}\n> Estuviste ausente <t:${timestamp}:R>`)
            .setFooter({ text: "Este mensaje se borrará en 10s... nya~ 🐾" });

        // Guardamos el mensaje enviado para poder borrarlo ✨
        const welcomeMsg = await message.reply({ embeds: [embedReturn] }).catch(() => null);

        // ⏱️ Borrado automático tras 10 segundos
        if (welcomeMsg) {
            setTimeout(async () => {
                await welcomeMsg.delete().catch(() => {}); 
            }, 10000);
        }

        handled = true; 
    }

    // 2️⃣ Revisar si se mencionó a usuarios AFK 🌙
    const mentionedUsers = message.mentions.users.filter(u => u.id !== message.author.id);
    
    if (mentionedUsers.size > 0) {
        const afkUsersData = await AFK.find({
            userId: { $in: Array.from(mentionedUsers.keys()) },
            guildId: message.guild.id,
        });

        if (afkUsersData.length > 0) {
            for (const afkData of afkUsersData) {
                const mentionedUser = mentionedUsers.get(afkData.userId);
                if (!mentionedUser) continue;

                const timestamp = Math.floor(afkData.timestamp.getTime() / 1000);
                const embedMention = new EmbedBuilder()
                    .setColor(0xffb6c1)
                    .setAuthor({
                        name: `${mentionedUser.username} está en su camita`,
                        iconURL: mentionedUser.displayAvatarURL(),
                    })
                    .setDescription(`> **Motivo:** ${afkData.reason}\n> **Se fue:** <t:${timestamp}:R> 🐾`);

                // Para las menciones, podrías dejar que se queden o borrarlas también.
                // Por ahora las dejamos para que el que mencionó sepa por qué no responden. ✨
                await message.reply({ embeds: [embedMention] }).catch(() => {});
            }
            handled = true;
        }
    }

    return handled; 
};