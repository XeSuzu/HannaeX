const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Revela un perfil detallado de un usuario, nyaa~!')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario del que deseas ver la informacion')
                .setRequired(false)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const presence = member?.presence;
        const status = presence?.status || 'offline';

        const statusColors = {
            online: '#57F287',   // Verde Discord
            idle: '#FEE75C',     // Amarillo Discord
            dnd: '#ED4245',      // Rojo Discord
            offline: '#747F8D',  // Gris Discord
            streaming: '#593695',// Morado (para streaming)
        };

        const embed = new EmbedBuilder()
            .setColor(statusColors[status] || '#5865F2')
            .setTitle(`📋 Información de ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Solicitado por ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        embed.addFields(
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
        );

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

            const memberRoles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position);

            if (memberRoles.size > 0) {
                const rolesToDisplay = memberRoles.map(role => role.toString()).slice(0, 10);
                const roleCount = memberRoles.size;
                const rolesValue = roleCount > 10 ? `${rolesToDisplay.join(' ')}\n*Y ${roleCount - 10} más...*` : rolesToDisplay.join(' ');

                embed.addFields({
                    name: `🎨 Roles [${roleCount}]`,
                    value: rolesValue,
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
                const statusEmoji = { online: '🟢', idle: '🟡', dnd: '🔴', offline: '⚫' };
                embed.addFields({
                    name: '📶 Estado',
                    value: `${statusEmoji[presence.status]} ${presence.status.charAt(0).toUpperCase() + presence.status.slice(1)}`,
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

        await interaction.reply({ embeds: [embed] });
    }
};