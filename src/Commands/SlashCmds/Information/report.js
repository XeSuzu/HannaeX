const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// ==========================================================
// 1. CAMBIO IMPORTANTE: Importamos la versión de promesas de 'fs'
// ==========================================================
const fs = require('fs/promises');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Envía un reporte sobre un bug o problema con el bot.')
        .addStringOption(option =>
            option.setName('descripcion')
                .setDescription('Describe el problema de la forma más detallada posible.')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const descripcion = interaction.options.getString('descripcion');
        const user = interaction.user;

        const nuevoReporte = {
            id: Date.now(),
            userId: user.id,
            userTag: user.tag,
            timestamp: new Date().toISOString(),
            descripcion: descripcion,
        };

        const filePath = path.join(__dirname, '../../reports.json');
        let reportes = [];

        try {
            // ==========================================================
            // 2. CAMBIO IMPORTANTE: Leemos el archivo de forma asíncrona
            // ==========================================================
            const data = await fs.readFile(filePath, 'utf8');
            reportes = JSON.parse(data);
        } catch (error) {
            // Si el error es que el archivo no existe, lo ignoramos y continuamos.
            // El archivo se creará más adelante.
            if (error.code !== 'ENOENT') {
                console.error("Error al leer reports.json:", error);
                return interaction.editReply({ content: 'Hubo un error al procesar la base de datos de reportes.' });
            }
        }

        reportes.push(nuevoReporte);

        try {
            // ==========================================================
            // 3. CAMBIO IMPORTANTE: Escribimos el archivo de forma asíncrona
            // ==========================================================
            await fs.writeFile(filePath, JSON.stringify(reportes, null, 2));
        } catch (error) {
            console.error("Error al escribir en reports.json:", error);
            return interaction.editReply({ content: 'Hubo un error al guardar tu reporte.' });
        }

        const embedConfirmacion = new EmbedBuilder()
            .setColor(0x3ba55c)
            .setTitle('✅ ¡Reporte Enviado!')
            .setDescription('Gracias por tu ayuda para mejorar el bot. Tu reporte ha sido recibido y será revisado pronto.')
            .addFields({ name: 'Tu Reporte', value: `\`\`\`${descripcion}\`\`\`` })
            .setFooter({ text: `Gracias por tu feedback, ${user.username}` })
            .setTimestamp();

        // El editReply se mantiene igual
        await interaction.editReply({ embeds: [embedConfirmacion] });
    },
};