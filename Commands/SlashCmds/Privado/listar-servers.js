const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servidores')
        .setDescription('Ve la lista de servidores en los que está el bot. (Solo para el dueño)'),

    async execute(interaction, client) {
        // Asegúrate de que solo la dueña del bot pueda usar este comando
        // El ID del bot_owner debe estar en tu archivo .env
        if (interaction.user.id !== process.env.BOT_OWNER_ID) {
            return interaction.reply({
                content: 'Nyaa... este es un comandito secreto solo para la dueña. ¡Lo siento mucho! 😿',
                ephemeral: true // Solo tú verás este mensaje
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guilds = client.guilds.cache.map(guild => `> **${guild.name}** (${guild.id})\n> Miembros: ${guild.memberCount}`);
            
            // Dividimos la lista si es muy larga para evitar el límite de caracteres de Discord
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
                .setColor(0x87ceeb) // Un color lindo como el cielo 🦋
                .setTitle(`🌟 ¡Estoy en ${client.guilds.cache.size} servidores! 🌟`)
                .setDescription('¡Aquí están todos los lugares donde puedo ronronear! 🐾')
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