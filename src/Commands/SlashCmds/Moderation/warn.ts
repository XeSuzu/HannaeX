import { Message, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { InfractionManager } from '../../../Features/InfractionManager';

export default {
    // ✨ Agregamos 'data' para compatibilidad con tu Handler
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Añade una advertencia a un usuario (suma 10 puntos).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    name: 'warn',
    description: 'Añade una advertencia a un usuario (suma 10 puntos).',

    async execute(message: Message, args: string[]) {
        // Solo staff con permisos de moderación 🛡️
        if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply("🌸 Nyaa... no tienes permiso para dar advertencias.");
        }

        const target = message.mentions.members?.first() || message.guild?.members.cache.get(args[0]);
        if (!target) return message.reply("❌ Debes mencionar a un usuario o dar su ID.");

        // Evitar advertir a otros moderadores
        if (target.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply("❌ No puedes advertir a otro miembro del staff.");
        }

        const reason = args.slice(1).join(' ') || "No se especificó un motivo.";

        // Sumamos 10 puntos por cada warn (Fase 3)
        await InfractionManager.addPoints(target, 10, reason, message);
        
        message.reply(`✅ Se ha advertido a **${target.user.tag}**. Motivo: ${reason}`);
    },
};