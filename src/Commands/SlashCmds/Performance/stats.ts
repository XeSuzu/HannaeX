import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PerformanceMonitor } from '../../../Security'; // Ajusta la ruta según tu carpeta

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Muestra las estadísticas de salud y rendimiento de Hoshiko 📊'),

    async execute(interaction: any) {
        // 1. Obtenemos las estadísticas frescas
        const stats = PerformanceMonitor.getSystemStats();
        
        // 2. Calculamos el ping de Discord
        const ping = interaction.client.ws.ping;

        // 3. Creamos un Embed bonito
        const statsEmbed = new EmbedBuilder()
            .setTitle('📊 Estado del Sistema - Sentinel')
            .setColor(0x2f3136)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: '🔌 Latencia API', value: `\`${ping}ms\``, inline: true },
                { name: '🧠 Memoria RAM', value: `\`${stats.ramUsage}\``, inline: true },
                { name: '⚡ Carga CPU', value: `\`${stats.cpuLoad}\``, inline: true },
                { name: '⏱️ Tiempo Activo', value: `\`${stats.uptime}\``, inline: false },
            )
            .setFooter({ text: 'Hoshiko Security System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [statsEmbed] });
    },
};