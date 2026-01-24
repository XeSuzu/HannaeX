import { Client, EmbedBuilder, TextChannel, User } from 'discord.js';

export class SystemLogger {
    // Asegúrate de tener SYSTEM_LOGS_CHANNEL en tu .env
    private static logChannelId = process.env.SYSTEM_LOGS_CHANNEL; 

    /**
     * 🚨 Log de Seguridad (Intrusos)
     */
    static async logSecurityBreach(client: Client, user: User, commandName: string) {
        if (!this.logChannelId) return console.warn("⚠️ [LOGGER] No hay canal de logs configurado en .env");

        try {
            const channel = await client.channels.fetch(this.logChannelId) as TextChannel;
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle('🚨 INTENTO DE ACCESO NO AUTORIZADO')
                .setColor(0xFF0000)
                .setDescription(`El usuario **${user.tag}** intentó ejecutar un comando de Dueño.`)
                .addFields(
                    { name: '👤 ID Usuario', value: `\`${user.id}\``, inline: true },
                    { name: '💻 Comando', value: `\`/${commandName}\``, inline: true },
                )
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            // Te menciona para que lo veas
            await channel.send({ content: `<@${process.env.BOT_OWNER_ID}>`, embeds: [embed] });

        } catch (error) {
            console.error("Error enviando log de seguridad:", error);
        }
    }

    /**
     * 💎 Log de Transacción (Cuando das premium)
     */
    static async logTransaction(client: Client, admin: User, details: string) {
        if (!this.logChannelId) return;

        try {
            const channel = await client.channels.fetch(this.logChannelId) as TextChannel;
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle('💎 Gestión Premium Realizada')
                .setColor(0x00FF00)
                .setDescription(details)
                .setFooter({ text: `Admin: ${admin.tag}`, iconURL: admin.displayAvatarURL() })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error("Error logs transaction:", error);
        }
    }
}