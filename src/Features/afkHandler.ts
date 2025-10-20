import { Message, EmbedBuilder } from "discord.js";
import AFK from "../Models/afk"; // Asegúrate de que la ruta sea correcta

export default async (message: Message): Promise<boolean> => {
    if (!message.guild || message.author.bot) return false;

    // 1️⃣ Revisar si el autor del mensaje estaba AFK
    const authorAfkData = await AFK.findOneAndDelete({
        userId: message.author.id,
        guildId: message.guild.id,
    });

    if (authorAfkData) {
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);

        // Restaurar el apodo original si tenía el prefijo [AFK]
        if (member && member.displayName.startsWith("[AFK]")) {
            const originalNickname = authorAfkData.originalNickname || member.user.username;
            await member.setNickname(originalNickname).catch(() => {});
        }

        // Embed de bienvenida kawaii 💕
        const timestamp = Math.floor(authorAfkData.timestamp.getTime() / 1000);
        const mensajes = [
            `¡Nyah~ ${message.author.username} volvió de su siesta! 💤🐾`,
            `El neko ha despertado, bienvenid@ de vuelta 💖`,
            `${message.author.username} ya no está AFK, a trabajar otra vez 😼✨`,
            `¡Bienvenid@ de vuelta, ${message.author.username}! Te extrañamos, nya~ 💞`
        ];
        const randomMsg = mensajes[Math.floor(Math.random() * mensajes.length)];

        const embedReturn = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setTitle("🌸 Has vuelto de tu modo AFK")
            .setDescription(`${randomMsg}\n> Estuviste ausente desde <t:${timestamp}:R>`)
            .setFooter({ text: "Tu descanso terminó... nya~ 🐾" });

        await message.reply({ embeds: [embedReturn] }).catch(() => {});
        return true; // Mensaje manejado
    }

    // 2️⃣ Revisar si se mencionó a usuarios AFK
    const mentionedUsers = message.mentions.users;
    if (mentionedUsers.size > 0) {
        const afkUsersData = await AFK.find({
            userId: { $in: mentionedUsers.map(u => u.id) },
            guildId: message.guild.id,
        });

        if (afkUsersData.length > 0) {
            for (const afkData of afkUsersData) {
                const mentionedUser = await message.client.users.fetch(afkData.userId);
                const timestamp = Math.floor(afkData.timestamp.getTime() / 1000);

                const embedMention = new EmbedBuilder()
                    .setColor(0xffb6c1)
                    .setAuthor({
                        name: `🌙 ${mentionedUser.username} está AFK`,
                        iconURL: mentionedUser.displayAvatarURL(),
                    })
                    .setDescription(
                        `> **Razón:** ${afkData.reason}\n> **Ausente desde:** <t:${timestamp}:R> 🐾`
                    );

                await message.reply({ embeds: [embedMention] }).catch(() => {});
            }
            return true; // Mensaje manejado
        }
    }

    return false; // No hubo interacción AFK
};
