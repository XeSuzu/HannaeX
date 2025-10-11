import {
    EmbedBuilder,
    PermissionsBitField,
    Message,
    User,
    GuildMember,
    ActivityType,
} from 'discord.js';
import { HoshikoClient } from '../../../index'; // Ajusta la ruta a tu index.ts principal

// Interfaz para el comando de prefijo
interface PrefixCommand {
    name: string;
    description: string;
    usage: string;
    execute: (message: Message, args: string[], client: HoshikoClient) => Promise<void | Message>;
}

const command: PrefixCommand = {
    name: 'userinfo',
    description: 'Obtén información detallada de un usuario',
    usage: '!userinfo [@usuario]',

    async execute(message, args, client) {
        // Verificamos que el comando se use en un servidor.
        if (!message.guild) return;

        try {
            let user: User | undefined;

            if (message.mentions.users.first()) {
                user = message.mentions.users.first();
            } else if (args[0]) {
                try {
                    user = await client.users.fetch(args[0]);
                } catch {
                    return message.reply('❌ Usuario no encontrado. Por favor menciona a un usuario o proporciona un ID válido.');
                }
            } else {
                user = message.author;
            }

            if (!user) return;

            const member = message.guild.members.cache.get(user.id);
            const presence = member?.presence;
            const status = presence?.status ?? 'offline';

            const statusColors: Record<string, number> = {
                online: 0x57f287,
                idle: 0xfee75c,
                dnd: 0xed4245,
                offline: 0x747f8d,
                streaming: 0x593695,
            };

            const embed = new EmbedBuilder()
                .setColor(statusColors[status] ?? 0x5865f2)
                .setTitle(`📋 Información de ${user.username}`)
                .setThumbnail(user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: '👤 Usuario', value: `${user.tag}\n\`${user.id}\``, inline: true },
                    { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '🤖 Bot', value: user.bot ? 'Sí' : 'No', inline: true }
                )
                .setFooter({
                    text: `Solicitado por ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL(),
                })
                .setTimestamp();

            if (member) {
                if (member.joinedTimestamp) {
                    embed.addFields({
                        name: '📅 Entró al servidor',
                        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                        inline: true,
                    });
                }
                 embed.addFields(
                    { name: '🎭 Apodo', value: member.nickname || 'Ninguno', inline: true },
                    { name: '🏆 Rol más alto', value: member.roles.highest.toString(), inline: true }
                );
                
                const roles = member.roles.cache
                    .filter(role => role.id !== message.guild!.id)
                    .sort((a, b) => b.position - a.position)
                    .map(role => role.toString())
                    .slice(0, 10);

                if (roles.length > 0) {
                    embed.addFields({ name: `🎨 Roles [${roles.length}]`, value: roles.join(' '), inline: false });
                }
            } else {
                embed.addFields({
                    name: '❓ Miembro',
                    value: 'Este usuario no está en el servidor.',
                });
            }

            // ✅ CORRECCIÓN DEFINITIVA:
            // Enviamos la respuesta directamente al canal usando message.reply()
            return await message.reply({ embeds: [embed] });

        } catch (error: any) {
            console.error('Error mostrando información del usuario:', error);
            await message.reply('❌ Ocurrió un error al ejecutar el comando.');
        }
    },
};

export = command;