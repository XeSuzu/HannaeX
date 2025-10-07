/**
 * Comando de prefijo: ping
 * Muestra la latencia del bot y la latencia de la API de Discord.
 * 
 * Uso: !ping
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Muestra la latencia del bot 🏓',

    /**
     * Ejecuta el comando ping.
     * @param {Message} message - El mensaje original del usuario.
     * @param {string[]} args - Argumentos del comando (no usados aquí).
     * @param {Client} client - Instancia del bot de Discord.
     */
    async execute(message, args, client) {
        if (!client) {
            return message.channel.send('⚠️ No tengo acceso al cliente para calcular la latencia.');
        }

        let sentMessage;
        try {
            // Envía un mensaje temporal para medir la latencia
            sentMessage = await message.channel.send('🏓 Calculando...');
        } catch {
            return; // Si falla el send, salimos silenciosamente
        }

        // Calcula la latencia del bot (tiempo entre el mensaje del usuario y la respuesta)
        const latency = sentMessage.createdTimestamp - message.createdTimestamp;
        // Obtiene la latencia de la API de Discord
        const apiLatency = Math.round(client.ws.ping);

        // Crea un embed bonito con los resultados
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
            // Edita el mensaje temporal con el embed de resultados
            await sentMessage.edit({ content: null, embeds: [embed] });
        } catch {
            // Si falla el edit, dejamos el mensaje de cálculo
        }
    }
};
