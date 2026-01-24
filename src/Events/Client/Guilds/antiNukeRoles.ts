import { Events, Role, AuditLogEvent, User } from 'discord.js';
import { HoshikoLogger, LogLevel } from '../../../Security/Logger/HoshikoLogger';
import { SettingsManager } from '../../../Database/SettingsManager';

const roleDeletionTracker = new Map<string, { count: number, lastDeletion: number }>();
const LIMIT = 3; 
const TIME_WINDOW = 10000;

export default {
    name: Events.GuildRoleDelete,
    async execute(role: Role): Promise<void> {
        const guild = role.guild;
        const settings = await SettingsManager.getSettings(guild.id);

        if (!settings?.securityModules?.antiNuke) return;

        try {
            const fetchedLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleDelete,
            });

            const deletionLog = fetchedLogs.entries.first();
            if (!deletionLog) return;

            const { executor } = deletionLog;
            if (!executor || executor.bot || executor.id === guild.ownerId) return;

            const now = Date.now();
            const userData = roleDeletionTracker.get(executor.id) || { count: 0, lastDeletion: 0 };

            if (now - userData.lastDeletion > TIME_WINDOW) {
                userData.count = 1;
            } else {
                userData.count++;
            }

            userData.lastDeletion = now;
            roleDeletionTracker.set(executor.id, userData);

            if (userData.count >= LIMIT) {
                const executorMember = await guild.members.fetch(executor.id);
                
                // 🛡️ Quitamos todos sus roles (Cuarentena)
                const rolesToRemove = executorMember.roles.cache.filter(r => !r.managed && r.id !== guild.id);
                await executorMember.roles.remove(rolesToRemove, "Anti-Nuke: Borrado masivo de roles.");

                HoshikoLogger.log({
                    level: LogLevel.FATAL,
                    context: 'Security/AntiNuke',
                    message: `¡NUKE DE ROLES! ${executor.tag} borró ${userData.count} roles.`,
                    guildId: guild.id
                });

                await HoshikoLogger.sendLog(
                    guild,
                    "🚨 PROTOCOLO ANTI-NUKE: ROLES",
                    `El usuario **${executor.tag}** ha sido despojado de sus permisos por borrar roles masivamente.`,
                    0xff0000,
                    executor as User
                );

                roleDeletionTracker.delete(executor.id);
            }

        } catch (err) {
            console.error("❌ Error en Anti-Nuke Roles:", err);
        }
    }
};