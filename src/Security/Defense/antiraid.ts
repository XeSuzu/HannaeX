import { GuildMember, TextChannel, PermissionFlagsBits } from 'discord.js';
import { SettingsManager } from '../../Database/SettingsManager';

// Mapa para guardar las entradas recientes en RAM
const joinCache = new Map<string, number[]>();

export class AntiRaid {
    private static JOIN_LIMIT = 1; // Máximo 5 usuarios
    private static TIME_WINDOW = 10000; // En un lapso de 10 segundos

    static async handleJoin(member: GuildMember) {
        const settings = await SettingsManager.getSettings(member.guild.id);
        if (!settings || !settings.securityModules.antiRaid) return;

        const now = Date.now();
        const guildId = member.guild.id;
        
        // Obtenemos la lista de entradas recientes de este servidor
        const joins = joinCache.get(guildId) || [];

        // Limpiamos las entradas que ya son más viejas de 10 segundos
        const recentJoins = joins.filter(timestamp => now - timestamp < this.TIME_WINDOW);
        
        // Añadimos la entrada actual
        recentJoins.push(now);
        joinCache.set(guildId, recentJoins);

        // Si superan el límite (más de 5 personas en 10 segundos)
        if (recentJoins.length > this.JOIN_LIMIT) {
            await this.activatePanicMode(member, settings);
        }
    }

    private static async activatePanicMode(member: GuildMember, settings: any) {
        const guild = member.guild;

        // Intentar avisar por el canal de logs configurado
        if (settings.modLogChannel) {
            const logChannel = guild.channels.cache.get(settings.modLogChannel);
            
            if (logChannel?.isTextBased()) {
                await (logChannel as any).send({
                    content: "⚠️ **¡POSIBLE RAID DETECTADO!** ⚠️",
                    embeds: [{
                        title: "🚨 Alerta de Seguridad: Join-Flood",
                        description: `Se ha detectado un flujo inusual de entradas (${this.JOIN_LIMIT}+ usuarios en 10s).\n\n**Estado:** Hoshiko está monitoreando las fronteras.`,
                        color: 0xff0000,
                        footer: { text: "Sentinel Network 📡" },
                        timestamp: new Date().toISOString()
                    }]
                });
            }
        }

        // Aquí podrías añadir lógica agresiva, como pausar invitaciones
        console.log(`[Anti-Raid] Alerta activada en: ${guild.name}`);
    }
}