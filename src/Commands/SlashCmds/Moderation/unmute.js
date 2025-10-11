const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('🔊 Quita el mute a un usuario (rol Muted)')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('👤 Usuario a desmutear')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const usuario = interaction.options.getUser('usuario');
        const miembro = await interaction.guild.members.fetch(usuario.id);

        // Buscar el rol de mute
        const rolMute = interaction.guild.roles.cache.find(r => r.name === 'Muted');
        if (!rolMute) {
            return interaction.reply({ 
                content: '❌ No existe el rol de mute en este servidor.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (!miembro.roles.cache.has(rolMute.id)) {
            return interaction.reply({ 
                content: '❌ Este usuario no está muteado.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        try {
            await miembro.roles.remove(rolMute, `Unmuteado por ${interaction.user.tag}`);
            const embedUnmute = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔊 Usuario desmuteado')
                .setDescription(`**${usuario.tag}** ya puede hablar nuevamente.`)
                .addFields(
                    { name: '👮 Moderador', value: interaction.user.tag, inline: true }
                )
                .setThumbnail(usuario.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Moderación | Unmute', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embedUnmute] });
        } catch (err) {
            console.error('Error al quitar el mute:', err);
            return interaction.reply({ 
                content: '❌ Ocurrió un error al quitar el mute. Revisa mi jerarquía de roles o mis permisos.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
}