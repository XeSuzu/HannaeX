import { Message, GuildMember } from 'discord.js';
import { SettingsManager } from '../Database/SettingsManager';

// ✨ Agregamos 'export' para que el comando 'infractions' pueda consultar este Map
export const userPoints = new Map<string, number>();

export class InfractionManager {
    /**
     * Añade puntos y verifica si debe aplicarse una sanción automática.
     */
    static async addPoints(member: GuildMember, pointsToAdd: number, reason: string, message?: Message) {
        const guildId = member.guild.id;
        const userId = member.id;
        
        const settings = await SettingsManager.getSettings(guildId);
        if (!settings) return;

        const key = `${guildId}-${userId}`;
        // Calculamos los nuevos puntos (asegurando que no bajen de 0)
        let currentPoints = (userPoints.get(key) || 0) + pointsToAdd;
        if (currentPoints < 0) currentPoints = 0;
        
        userPoints.set(key, currentPoints);

        // Buscar si hay una acción configurada
        const actionToApply = settings.autoActions
            .filter((a: any) => currentPoints >= a.points)
            .sort((a: any, b: any) => b.points - a.points)[0];

        if (actionToApply) {
            await this.executeAction(member, actionToApply, reason, message);
            userPoints.delete(key); // Resetear tras sanción
        }
    }

    private static async executeAction(member: GuildMember, actionData: any, reason: string, message?: Message) {
        const { action, duration } = actionData;

        try {
            // Validamos que el canal sea de texto y no sea un MD
            const canSend = message && message.channel.isTextBased() && !message.channel.isDMBased();

            switch (action) {
                case 'timeout':
                    if (!duration) return;
                    await member.timeout(duration, reason);
                    if (canSend) {
                        await (message.channel as any).send(`🌸 **${member.user.tag}** ha sido silenciado por acumular demasiadas infracciones. Motivo: ${reason}`);
                    }
                    break;

                case 'kick':
                    await member.kick(reason);
                    if (canSend) {
                        await (message.channel as any).send(`🌸 **${member.user.tag}** ha sido expulsado. Motivo: ${reason}`);
                    }
                    break;

                case 'ban':
                    await member.ban({ reason });
                    if (canSend) {
                        await (message.channel as any).send(`🌸 **${member.user.tag}** ha sido baneado permanentemente. Motivo: ${reason}`);
                    }
                    break;
            }
        } catch (err) {
            console.error(`❌ Error al ejecutar auto-sanción (${action}):`, err);
        }
    }
}