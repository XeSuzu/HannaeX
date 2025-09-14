const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Mutea a un usuario usando un rol')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('👤 Usuario a mutear')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('📝 Razón del mute')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const usuario = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';

        const miembro = await interaction.guild.members.fetch(usuario.id);

        if (miembro.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ 
                content: '❌ No puedo mutear a este usuario por su jerarquía. ¡Es demasiado poderoso!', 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (usuario.id === interaction.user.id) {
            return interaction.reply({ 
                content: '❌ No puedes mutearte a ti mismo. ¡Quiérete un poquito! 💖', 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (usuario.id === interaction.guild.ownerId) {
            return interaction.reply({ 
                content: '❌ No puedes mutear al dueño del servidor. ¡Es el jefe! 👑', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Crear o buscar rol de mute
        let rolMute = interaction.guild.roles.cache.find(r => r.name === 'Muted');
        if (!rolMute) {
            try {
                await interaction.reply({ content: 'Creando rol de mute... ⚙️', flags: MessageFlags.Ephemeral });
                rolMute = await interaction.guild.roles.create({
                    name: 'Muted',
                    color: '#2f3136',
                    permissions: [],
                    reason: 'Rol de mute para silenciar usuarios'
                });

                for (const [id, canal] of interaction.guild.channels.cache) {
                    await canal.permissionOverwrites.edit(rolMute, {
                        SendMessages: false,
                        Speak: false,
                        AddReactions: false
                    });
                }
            } catch (err) {
                console.error('Error al crear el rol de mute:', err);
                return interaction.editReply({ content: '❌ Hubo un error al crear el rol de mute. Revisa los permisos del bot.', flags: MessageFlags.Ephemeral });
            }
        }

        if (miembro.roles.cache.has(rolMute.id)) {
            return interaction.reply({ 
                content: '❌ Este usuario ya está muteado. ¡No le des más besitos! 💋', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Asignar el mute permanente
        try {
            await miembro.roles.add(rolMute, `Muteado por ${interaction.user.tag} - Razón: ${razon}`);

            const embedMute = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔇 Usuario muteado')
                .setDescription(`**${usuario.tag}** fue muteado permanentemente.`)
                .addFields(
                    { name: '📝 Razón', value: razon, inline: true },
                    { name: '👮 Moderador', value: interaction.user.tag, inline: true }
                )
                .setThumbnail(usuario.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Moderación | Mute', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embedMute] });

        } catch (err) {
            console.error('Error al mutear al usuario:', err);
            return interaction.reply({ 
                content: '❌ Ocurrió un error al mutear. Revisa mi jerarquía de roles o mis permisos. ¡Soy solo un gatito indefenso! 😿', 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};