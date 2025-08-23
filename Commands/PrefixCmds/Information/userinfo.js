const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'userinfo',
    description: 'Obtén información detallada de un usuario',
    usage: '!userinfo [@usuario]',
    async execute(message, args, client) {
        try {
            let user;

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

            const member = message.guild.members.cache.get(user.id);
            const presence = member?.presence;
            const status = presence?.status || 'offline';

            const statusColors = {
                online: '#57F287',
                idle: '#FEE75C',
                dnd: '#ED4245',
                offline: '#747F8D',
                streaming: '#593695',
            };

            const embed = new EmbedBuilder()
                .setColor(statusColors[status] || '#5865F2')
                .setTitle(`📋 Información de ${user.username}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '👤 Usuario',
                        value: `${user.tag}\n\`${user.id}\``,
                        inline: true,
                    },
                    {
                        name: '📅 Cuenta creada',
                        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                        inline: true,
                    },
                    {
                        name: '🤖 Bot',
                        value: user.bot ? 'Sí' : 'No',
                        inline: true,
                    }
                )
                .setFooter({ text: `Solicitado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            if (member) {
                embed.addFields(
                    {
                        name: '📅 Entró al servidor',
                        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                        inline: true,
                    },
                    {
                        name: '🎭 Apodo',
                        value: member.nickname || 'Ninguno',
                        inline: true,
                    },
                    {
                        name: '🏆 Rol más alto',
                        value: member.roles.highest.name,
                        inline: true,
                    }
                );

                const roles = member.roles.cache
                    .filter(role => role.name !== '@everyone')
                    .sort((a, b) => b.position - a.position)
                    .map(role => role.toString())
                    .slice(0, 10);

                if (roles.length > 0) {
                    embed.addFields({
                        name: `🎨 Roles [${member.roles.cache.size - 1}]`,
                        value: roles.length === 10 ? `${roles.join(' ')}\n*Y ${member.roles.cache.size - 11} más...*` : roles.join(' '),
                        inline: false,
                    });
                }

                const keyPermissions = [];
                const perms = PermissionsBitField.Flags;

                if (member.permissions.has(perms.Administrator)) keyPermissions.push('Administrador');
                if (member.permissions.has(perms.ManageGuild)) keyPermissions.push('Gestionar servidor');
                if (member.permissions.has(perms.ManageChannels)) keyPermissions.push('Gestionar canales');
                if (member.permissions.has(perms.ManageMessages)) keyPermissions.push('Gestionar mensajes');
                if (member.permissions.has(perms.KickMembers)) keyPermissions.push('Expulsar miembros');
                if (member.permissions.has(perms.BanMembers)) keyPermissions.push('Banear miembros');
                if (member.permissions.has(perms.ModerateMembers)) keyPermissions.push('Suspender miembros');

                if (keyPermissions.length > 0) {
                    embed.addFields({
                        name: '🛡️ Permisos clave',
                        value: keyPermissions.join(', '),
                        inline: false,
                    });
                }

                if (presence) {
                    const statusEmoji = {
                        online: '🟢',
                        idle: '🟡',
                        dnd: '🔴',
                        offline: '⚫',
                    };
                    embed.addFields({
                        name: '📶 Estado',
                        value: `${statusEmoji[status]} ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                        inline: true,
                    });

                    const customStatus = presence.activities.find(a => a.type === 4);
                    if (customStatus?.state) {
                        const emoji = customStatus.emoji;
                        const emojiString = emoji ? (emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name) : '';

                        embed.addFields({
                            name: '💭 Estado personalizado',
                            value: `${emojiString} ${customStatus.state || 'Ninguno'}`.trim(),
                            inline: true,
                        });
                    }

                    const playing = presence.activities.find(a => a.type === 0);
                    if (playing) {
                        embed.addFields({
                            name: '🎮 Jugando',
                            value: playing.name,
                            inline: true,
                        });
                    }

                    const listening = presence.activities.find(a => a.type === 2);
                    if (listening) {
                        embed.addFields({
                            name: '🎵 Escuchando',
                            value: `${listening.name}${listening.details ? `\n${listening.details}` : ''}`,
                            inline: true,
                        });
                    }
                }
            } else {
                embed.addFields({
                    name: '❓ Miembro del servidor',
                    value: 'Este usuario no está en este servidor',
                    inline: false,
                });
            }

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error mostrando información del usuario:', error);
            await message.reply('❌ Ocurrió un error mostrando la información del usuario.');
        }
    },
};