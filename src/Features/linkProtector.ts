import { Message, PermissionFlagsBits } from 'discord.js';
import { InfractionManager } from './InfractionManager';
import { SettingsManager } from '../Database/SettingsManager';

const DEFAULT_ALLOWED = [
    'youtube.com', 'youtu.be', 'spotify.com', 'tenor.com', 
    'pinterest.com', 'giphy.com', 'google.com'
];

export async function handleLinkProtection(message: Message): Promise<boolean> {
    // 1. Inmunidad para Staff y DMs 🛡️
    if (!message.guild || message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    // 2. Obtener configuración (usa el caché del SettingsManager) ⚙️
    const settings = await SettingsManager.getSettings(message.guild.id);
    
    // Si el módulo está apagado, no hacemos nada
    if (!settings?.securityModules?.antiLinks) return false;

    const customAllowed = settings?.allowedLinks || [];
    const allAllowed = [...DEFAULT_ALLOWED, ...customAllowed];

    // 3. Detectar si hay links
    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    const links = message.content.match(linkRegex);
    if (!links) return false;

    // 4. Detectar Invitaciones de Discord 🚨
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
    const isInvite = inviteRegex.test(message.content);

    // 5. Verificar si el link es prohibido
    const isForbidden = links.some(link => {
        const lowerLink = link.toLowerCase();
        return !allAllowed.some(domain => lowerLink.includes(domain.toLowerCase()));
    });

    if (isInvite || isForbidden) {
        await message.delete().catch(() => null);
        
        if (message.channel.isTextBased()) {
            const warning = await (message.channel as any).send(`🌸 **${message.author.username}**, ese tipo de enlaces no están permitidos aquí.`);
            setTimeout(() => warning.delete().catch(() => null), 5000);
        }

        const reason = isInvite ? "Spam de invitaciones" : "Enlace no autorizado";
        await InfractionManager.addPoints(message.member!, reason, message);
        return true; 
    }

    return false;
}