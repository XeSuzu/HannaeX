import { Message, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { InfractionManager } from '../../../Features/InfractionManager';

export default {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Resta puntos de infracción a un usuario.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    name: 'unwarn',
    description: 'Resta puntos de infracción a un usuario.',

    async execute(message: Message, args: string[]) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply("🌸 Nyaa... no tienes permiso para quitar advertencias.");
        }

        const target = message.mentions.members?.first() || message.guild?.members.cache.get(args[0]);
        if (!target) return message.reply("❌ Menciona a alguien o da su ID.");

        // Restamos 10 puntos (puedes hacerlo dinámico con args[1] si prefieres)
        const pointsToRemove = -10; 
        await InfractionManager.addPoints(target, pointsToRemove, "Puntos removidos por Staff", message);
        
        message.reply(`✅ Se han removido puntos a **${target.user.tag}**. ¡Hoshiko está feliz de ver buen comportamiento! 🐾`);
    },
};