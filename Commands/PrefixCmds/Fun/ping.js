const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Muestra la latencia del bot 🏓',

    async execute(message, args, client) {
        if (!client) {
            return message.channel.send('⚠️ No tengo acceso al cliente para calcular la latencia.');
        }

        let sentMessage;
        try {
            sentMessage = await message.channel.send('🏓 Calculando...');
        } catch {
            return; // Si falla el send, salimos silenciosamente
        }

        const latency = sentMessage.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(0xffc0cb)
            .addFields(
                { name: '📡 Latencia Bot', value: `\`${latency}ms\``, inline: true },
                { name: '🌐 Latencia API', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setFooter({ text: 'Nyaa~ Estoy lista para jugar uwu 😽' })
            .setTimestamp();

        try {
            await sentMessage.edit({ content: null, embeds: [embed] });
        } catch {
            // Si falla el edit, dejamos el mensaje de cálculo
        }
    }
};
