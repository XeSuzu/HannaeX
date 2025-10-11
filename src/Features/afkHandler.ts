import { Message, EmbedBuilder } from "discord.js";
import AFK from "../Models/afk"; // Asegúrate que la ruta sea correcta

// Esta función devuelve 'true' si manejó el mensaje, o 'false' si no.
export default async (message: Message): Promise<boolean> => {
    // 1. Revisar si el autor del mensaje estaba AFK
    const authorAfkData = await AFK.findOneAndDelete({
        userId: message.author.id,
        guildId: message.guild!.id,
    });

    if (authorAfkData) {
        const timestamp = Math.floor(authorAfkData.timestamp.getTime() / 1000);
        const embedReturn = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setTitle(`😽 ¡Bienvenid@ de vuelta, ${message.author.username}!`)
            .setDescription(`Estuviste AFK desde <t:${timestamp}:R>, nya~ 🐾`);
        
        await message.reply({ embeds: [embedReturn] }).catch(() => {});
        return true; // Mensaje manejado.
    }

    // 2. Revisar si se mencionó a usuarios que están AFK
    const mentionedUsers = message.mentions.users;
    if (mentionedUsers.size > 0) {
        const afkUsersData = await AFK.find({
            userId: { $in: mentionedUsers.map(u => u.id) },
            guildId: message.guild!.id,
        });

        if (afkUsersData.length > 0) {
            for (const afkData of afkUsersData) {
                const mentionedUser = await message.client.users.fetch(afkData.userId);
                const timestamp = Math.floor(afkData.timestamp.getTime() / 1000);
                const embedMention = new EmbedBuilder()
                    .setColor(0xffb6c1)
                    .setAuthor({ name: `🌸 ${mentionedUser.username} está AFK`, iconURL: mentionedUser.displayAvatarURL() })
                    .setDescription(`> **Razón:** ${afkData.reason}\n> **Ausente desde:** <t:${timestamp}:R> 🐾`);
                await message.reply({ embeds: [embedMention] }).catch(() => {});
            }
            return true; // Mensaje manejado.
        }
    }

    return false; // No se hizo nada relacionado con AFK.
};