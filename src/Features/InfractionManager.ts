import { GuildMember, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { SettingsManager } from '../Database/SettingsManager';
import { HoshikoLogger } from '../Security/Logger/HoshikoLogger';
import { IServerConfig } from '../Models/serverConfig'; // Asegúrate que la ruta sea correcta

export class InfractionManager {

    // 📜 REGLAS POR DEFECTO
    private static readonly DEFAULT_RULES = [
        { threshold: 100, action: 'BAN', duration: 0 },
        { threshold: 60,  action: 'KICK', duration: 0 },
        { threshold: 30,  action: 'MUTE', duration: 60 * 60 * 1000 }, // 1h
        { threshold: 20,  action: 'MUTE', duration: 10 * 60 * 1000 }, // 10m
        { threshold: 10,  action: 'WARN', duration: 0 }
    ];

    /**
     * 👮‍♂️ MOTOR PRINCIPAL: AUTO-MOD
     */
    static async addInfraction(member: GuildMember, severity: number, reason: string) {
        if (!member || member.user.bot) return;

        // 1. 🛡️ INMUNIDAD
        if (member.permissions.has(PermissionFlagsBits.Administrator) || 
            member.permissions.has(PermissionFlagsBits.BanMembers) || 
            member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            
            return HoshikoLogger.logAction(member.guild, 'SECURITY', {
                reason: `Intento de sanción ignorado (Inmunidad).`,
                extra: `Usuario: ${member.user.tag} | Motivo: ${reason}`
            });
        }

        const guildId = member.guild.id;
        const userId = member.id;

        // 🔥 CORRECCIÓN AQUÍ:
        // Eliminé la declaración duplicada. Solo dejamos esta que tiene el 'as unknown as IServerConfig'.
        // Esto obliga a TypeScript a reconocer 'infractionsMap' y 'autoModRules'.
        const settings = await SettingsManager.getSettings(guildId) as unknown as IServerConfig;

        if (!settings) return; // Seguridad por si la DB falla

        // 2. ➕ SUMAR PUNTOS
        // Usamos tipos explícitos <string, number> para evitar errores de TS
        const map = settings.infractionsMap || new Map<string, number>();
        const currentPoints = map.get(userId) || 0;
        
        const newTotal = currentPoints + severity;

        // 3. 💾 GUARDAR
        if (!settings.infractionsMap) settings.infractionsMap = new Map<string, number>();
        
        settings.infractionsMap.set(userId, newTotal);
        settings.markModified('infractionsMap'); // Vital para Mongoose Maps
        await settings.save();

        // Log visual
        await HoshikoLogger.logAction(member.guild, 'AUTOMOD', {
            user: member.user,
            reason: reason,
            extra: `Sanción: +${severity} pts | Acumulado Total: ${newTotal} pts`
        });

        // 4. ⚖️ JUZGAR
        let activeRules = settings.autoModRules && settings.autoModRules.length > 0 
            ? settings.autoModRules 
            : this.DEFAULT_RULES;

        // Ordenar reglas (Mayor a Menor)
        activeRules = activeRules.sort((a: any, b: any) => b.threshold - a.threshold);

        const punishment = activeRules.find((rule: any) => newTotal >= rule.threshold);

        if (punishment) {
            await this.executePunishment(member, punishment, reason, newTotal);
            
            // Resetear puntos si es expulsión
            if (punishment.action === 'BAN' || punishment.action === 'KICK') {
                settings.infractionsMap.set(userId, 0);
                settings.markModified('infractionsMap');
                await settings.save();
            }
        }
    }

    // --- 🔨 EJECUTOR DE CASTIGOS ---
    private static async executePunishment(member: GuildMember, rule: any, reason: string, totalPts: number) {
        if (!member.manageable) return;

        const embed = new EmbedBuilder().setTimestamp();

        try {
            switch (rule.action) {
                case 'BAN':
                    embed.setTitle('⛔ BANEADO POR AUTOMOD').setColor(0xFF0000)
                        .setDescription(`Has acumulado **${totalPts} puntos** de infracción.\n**Detonante:** ${reason}`);
                    await member.send({ embeds: [embed] }).catch(() => null);
                    await member.ban({ reason: `[AutoMod] ${totalPts} pts: ${reason}` });
                    break;

                case 'KICK':
                    embed.setTitle('👢 EXPULSADO POR AUTOMOD').setColor(0xFF5500)
                        .setDescription(`Has acumulado **${totalPts} puntos**.\n**Detonante:** ${reason}`);
                    await member.send({ embeds: [embed] }).catch(() => null);
                    await member.kick(`[AutoMod] ${totalPts} pts: ${reason}`);
                    break;

                case 'MUTE':
                    if (!member.isCommunicationDisabled()) {
                        const mins = Math.floor(rule.duration / 60000);
                        embed.setTitle('😶 SILENCIADO POR AUTOMOD').setColor(0xFFA500)
                            .setDescription(`Has sido silenciado temporalmente.\n**Acumulado:** ${totalPts} pts\n**Tiempo:** ${mins} minutos\n**Razón:** ${reason}`);
                        
                        await member.timeout(rule.duration, `[AutoMod] ${totalPts} pts: ${reason}`);
                        await member.send({ embeds: [embed] }).catch(() => null);
                    }
                    break;

                case 'WARN':
                    embed.setTitle('⚠️ ADVERTENCIA AUTOMÁTICA').setColor(0xFFFF00)
                        .setDescription(`Tu comportamiento está sumando puntos negativos (${totalPts}).\n**Razón:** ${reason}`);
                    await member.send({ embeds: [embed] }).catch(() => null);
                    break;
            }
        } catch (e) {
            console.error(`Error AutoMod en ${member.guild.name}:`, e);
        }
    }
}