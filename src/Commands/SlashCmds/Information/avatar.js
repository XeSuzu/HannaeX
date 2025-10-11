// commands/avatar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼 Muestra el avatar de un usuario con un toque de arte.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('👤 Usuario del que deseas ver el avatar')
                .setRequired(false)
        ),

    async execute(interaction) {
        const usuario = interaction.options.getUser('usuario') || interaction.user;

        // Avatar en calidad HD (GIF si es animado)
        const avatarURL = usuario.displayAvatarURL({ size: 1024, dynamic: true });

        // Embed con diseño limpio y frase inspiradora
        const embed = new EmbedBuilder()
            .setColor('#ffb6c1') // Rosita suave
            .setTitle(`✨ Avatar de ${usuario.username}`)
            .setDescription(`> *"Detrás de cada avatar hay un mundo, una historia y una chispa única..."* 🌌`)
            .setImage(avatarURL)
            .setFooter({
                text: `ID: ${usuario.id} • Compartiendo estilo desde ${usuario.username}`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
