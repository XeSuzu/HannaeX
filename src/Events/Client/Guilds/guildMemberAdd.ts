import { Events, GuildMember } from 'discord.js';
import { AntiRaid } from '../../../Security/Defense/antiraid';
import { SentinelNetwork } from '../../../Features/sentinelNetwork';
import { SettingsManager } from '../../../Database/SettingsManager';

export default {
    name: Events.GuildMemberAdd,
    async execute(member: GuildMember) {
        // 1. Consultar la configuración del servidor
        const settings = await SettingsManager.getSettings(member.guild.id);
        if (!settings) return;

        // 🛡️ ESCUDO 1: Sentinel Network (Blacklist Global)
        // Verificamos si el usuario es un atacante conocido en otros servidores
        await SentinelNetwork.checkMember(member);

        // 🛡️ ESCUDO 2: Anti-Raid (Detección de Join-Flood)
        // Si el módulo está activo, verificamos si hay una entrada masiva
        if (settings.securityModules.antiRaid) {
            await AntiRaid.handleJoin(member);
        }
    },
};