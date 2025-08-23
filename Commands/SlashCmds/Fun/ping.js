const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra la latencia del bot y algunos detalles interesantes 😽'),

    async execute(interaction, client) {
        try {
            const sent = await interaction.reply({ content: '🏓 Calculando...', fetchReply: true });
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(client.ws.ping);
            const serverCount = client.guilds.cache.size;

            const uptime = Math.floor(client.uptime / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;

            // Color según latencia
            let color = 0x00ff00; // verde
            if (latency > 200) color = 0xffff00; // amarillo
            if (latency > 400) color = 0xff0000; // rojo

            const embed = new EmbedBuilder()
                .setTitle('🏓 Pong! Tiempo calculado 😽')
                .setColor(color)
                .addFields(
                    { name: '📡 Latencia Bot', value: `\`${latency}ms\``, inline: true },
                    { name: '🌐 Latencia API', value: `\`${apiLatency}ms\``, inline: true },
                    { name: '🏠 Servidores', value: `\`${serverCount}\``, inline: true },
                    { name: '⏱️ Tiempo activo', value: `\`${hours}h ${minutes}m ${seconds}s\``, inline: true }
                )
                .setFooter({ text: '💖 HannaeX siempre contigo >w<' })
                .setTimestamp();

            await interaction.editReply({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('Error en /ping:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: '❌ Ocurrió un error calculando el ping.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Ocurrió un error calculando el ping.', ephemeral: true });
            }
        }
    }
};
