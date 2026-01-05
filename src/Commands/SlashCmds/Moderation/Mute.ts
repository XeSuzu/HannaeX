import { Message, PermissionFlagsBits, TextChannel, SlashCommandBuilder } from 'discord.js';
import { InfractionManager } from '../../../Features/InfractionManager';
import ms = require('ms');

export default {
    // ✨ Agregamos la propiedad 'data' que te pide el Handler
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silencia a un usuario por un tiempo determinado.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    // Mantén estas propiedades si tu handler de prefijo las usa
    name: 'mute',
    description: 'Silencia a un usuario por un tiempo determinado.',

    async execute(message: Message, args: string[]) {
        if (!message.guild || !message.member) return;

        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply("🌸 Nyaa... no tienes permisos para silenciar miembros.");
        }

        const target = message.mentions.members?.first() || message.guild.members.cache.get(args[0]);
        if (!target) return message.reply("❌ Debes mencionar a alguien o dar su ID para silenciar.");

        if (target.permissions.has(PermissionFlagsBits.ModerateMembers) || target.id === message.author.id) {
            return message.reply("❌ No puedo silenciar a este usuario.");
        }

        const timeInput = args[0]?.includes(target.id) ? args[1] : args[0];
        
        if (!timeInput) return message.reply("❌ Debes especificar un tiempo (ej: 10m, 1h).");

        const duration = ms(timeInput as any); 
        
        if (!duration || typeof duration !== 'number' || duration < 5000 || duration > 2419200000) {
            return message.reply("❌ Tiempo no válido o fuera de rango (máximo 28 días).");
        }

        const reason = args.slice(2).join(' ') || "No se especificó un motivo.";

        try {
            await target.timeout(duration, reason);
            await InfractionManager.addPoints(target, 20, `Mute manual: ${reason}`, message);

            if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                await (message.channel as TextChannel).send(`✅ **${target.user.tag}** ha sido silenciado por \`${timeInput}\`.\n**Motivo:** ${reason}`);
            }

        } catch (error) {
            console.error("💥 Error en comando mute:", error);
            message.reply("🌸 Hubo un error al intentar silenciar al usuario.");
        }
    },
};