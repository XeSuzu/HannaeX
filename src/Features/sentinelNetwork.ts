import GlobalBlacklist from '../Models/GlobalBlacklist';
import { GuildMember, TextChannel } from 'discord.js';
import { SettingsManager } from '../Database/SettingsManager';

export class SentinelNetwork {
    /**
     * Verifica si un nuevo miembro es una amenaza global conocida.
     */
    static async checkMember(member: GuildMember) {
        const isBlacklisted = await GlobalBlacklist.findOne({ userId: member.id });

        if (isBlacklisted) {
            const settings = await SettingsManager.getSettings(member.guild.id);
            
            // Acción: Banear automáticamente si es una amenaza HIGH
            try {
                await member.ban({ reason: `Sentinel Network: ${isBlacklisted.reason}` });
                
                // Avisar al canal de logs
                if (settings.modLogChannel) {
                    const logChannel = member.guild.channels.cache.get(settings.modLogChannel);
                    if (logChannel?.isTextBased()) {
                        await (logChannel as any).send(`📡 **SENTINEL NETWORK**\nEl usuario \`${member.user.tag}\` ha sido baneado automáticamente al entrar. Está en la lista negra global por: *${isBlacklisted.reason}*`);
                    }
                }
            } catch (err) {
                console.error("Error al ejecutar ban global:", err);
            }
        }
    }

    /**
     * Añade un usuario a la lista global (Solo para desarrolladores del bot)
     */
    static async reportUser(userId: string, reason: string) {
        await GlobalBlacklist.updateOne(
            { userId },
            { reason, addedAt: new Date() },
            { upsert: true }
        );
    }
}