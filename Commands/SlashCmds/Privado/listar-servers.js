const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servidores')
        .setDescription('Ve la lista de servidores en los que está el bot. (Solo para el dueño)'),

    async execute(interaction, client) {
        if (interaction.user.id !== process.env.BOT_OWNER_ID) {
            return interaction.reply({
                content: 'Nyaa... este es un comando solo para el propietario del bot. ¡Lo siento mucho! 😿',
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guilds = client.guilds.cache.map(guild => `> **${guild.name}** (${guild.id})\n> Miembros: ${guild.memberCount}`);
            
            const guildsList = [];
            let currentList = '';

            for (const guild of guilds) {
                if (currentList.length + guild.length + 1 > 1024) {
                    guildsList.push(currentList);
                    currentList = guild;
                } else {
                    currentList += (currentList ? '\n' : '') + guild;
                }
            }
            if (currentList) guildsList.push(currentList);

            // Crear el embed principal
            const embed = new EmbedBuilder()
                .setColor(0x87ceeb) 
                .setTitle(`🌟 ¡Estoy en ${client.guilds.cache.size} servidores! 🌟`)
                .setDescription('¡Servidores donde me han incluido! 🐾')
                .setTimestamp()
                .setFooter({ text: 'Nyaa~ 💕' });

            // Añadir los campos con la lista de servidores
            for (let i = 0; i < guildsList.length; i++) {
                embed.addFields({
                    name: `Lista de Servidores (${i + 1}/${guildsList.length})`,
                    value: guildsList[i],
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error al obtener la lista de servidores:', error);
            await interaction.editReply({
                content: '¡Ups! Algo salió mal al intentar obtener la lista de servidores. 😿',
                ephemeral: true
            });
        }
    },
};