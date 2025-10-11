const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const process = require('process');
const path = require('path');

/**
 * ----------------------------------------------------------------
 * INFO COMMAND - v2.0 (Diseño Mejorado)
 * ----------------------------------------------------------------
 * Este comando muestra información completa del bot y del sistema
 * con un diseño visualmente atractivo.
 * * Dependencias:
 * - El paquete 'dotenv' debe estar configurado en tu index.js.
 * - Un archivo .env con la variable CREATOR_ID="tu_id_de_usuario".
 * ----------------------------------------------------------------
 */

// --- Constantes y Configuración ---
const CREATOR_ID = process.env.BOT_OWNER_ID;

const NEKO_PHRASES = [
    'Nyaa~ ¿Me estabas buscando? 🐾',
    'M-meow~ ¡Aquí tienes mi información! 🌸',
    'Nyan~ ¡Listo para ayudarte cuando quieras! 🐱',
];

const NEKO_GIF = 'https://i.gifer.com/8Va3.gif';

// --- Funciones de Utilidad ---

/**
 * Formatea los bytes a un tamaño más legible (KB, MB, GB).
 * @param {number} bytes El número de bytes a formatear.
 * @returns {string} El tamaño formateado.
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Crea un indicador visual basado en la latencia del bot.
 * @param {number} ping La latencia en ms.
 * @returns {string} Un string con un emoji y un estado.
 */
function createStatusVisual(ping) {
    if (ping < 150) return `💖 \`Excelente\``;
    if (ping < 250) return `💛 \`Estable\``;
    return `💔 \`Lento\``;
}

/**
 * Reúne todas las estadísticas del bot y del sistema.
 * @param {import('discord.js').Client} client El cliente de Discord.
 * @returns {Promise<object>} Un objeto con todas las estadísticas.
 */
async function gatherStats(client) {
    let creator = null;
    if (CREATOR_ID) {
        creator = await client.users.fetch(CREATOR_ID).catch(() => null);
    }

    const numberFormat = new Intl.NumberFormat('es-ES');
    const ping = Math.round(client.ws.ping);

    return {
        creator: {
            tag: creator ? creator.tag : 'Desconocido',
            id: CREATOR_ID || 'No definido',
            avatar: creator ? creator.displayAvatarURL() : client.user.displayAvatarURL(),
        },
        bot: {
            status: createStatusVisual(ping),
            ping: `${ping}ms`,
            uptime: `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`,
            servers: numberFormat.format(client.guilds.cache.size),
            commands: client.slashCommands?.size || 0,
        },
        system: {
            platform: os.platform().replace('win32', 'Windows'),
            cpu: os.cpus()[0].model.split('@')[0].trim(),
            ram: formatBytes(process.memoryUsage().rss),
            nodeVersion: process.version,
            djsVersion: djsVersion,
        },
    };
}

/**
 * Crea y formatea el Embed con la información del bot y un diseño mejorado.
 * @param {import('discord.js').ClientUser} botUser El usuario del bot.
 * @param {object} stats El objeto de estadísticas generado por gatherStats.
 * @returns {EmbedBuilder} El EmbedBuilder listo para ser enviado.
 */
function createInfoEmbed(botUser, stats) {
    const randomPhrase = NEKO_PHRASES[Math.floor(Math.random() * NEKO_PHRASES.length)];

    return new EmbedBuilder()
        .setColor('#FFB6C1') // Rosa pastel
        .setTitle(`🌸 ${botUser.username} - Perfil Neko`)
        .setThumbnail(botUser.displayAvatarURL({ dynamic: true }))
        .setDescription(`> ${randomPhrase}`)
        .setImage(NEKO_GIF)
        .addFields(
            // Primera Fila: Estadísticas Generales
            {
                name: '📊 Estadísticas',
                value: `
                    > 💖 **Estado:** ${stats.bot.status}
                    > 핑 **Latencia:** \`${stats.bot.ping}\`
                    > サーバー **Servidores:** \`${stats.bot.servers}\`
                    > ⏱️ **Activo desde:** ${stats.bot.uptime}
                `,
                inline: false,
            },
            // Segunda Fila: Host y Versiones
            {
                name: '💻 Información del Host',
                value: `
                    > ⚙️ **Plataforma:** \`${stats.system.platform}\`
                    > 🐏 **RAM en uso:** \`${stats.system.ram}\`
                    > 💽 **CPU:** \`${stats.system.cpu}\`
                `,
                inline: true,
            },
            {
                name: '🛠️ Versiones',
                value: `
                    > **Node.js:** \`${stats.system.nodeVersion}\`
                    > **Discord.js:** \`v${stats.system.djsVersion}\`
                    > **Comandos:** \`${stats.bot.commands}\`
                `,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({
            text: `Hecho con amor por ${stats.creator.tag}`,
            iconURL: stats.creator.avatar,
        });
}

// --- Comando Principal ---

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('🌸 Muestra información adorable y completa del bot~'),

    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            
            const stats = await gatherStats(client);
            const infoEmbed = createInfoEmbed(client.user, stats);

            await interaction.editReply({ embeds: [infoEmbed] });
        } catch (error) {
            console.error(`Error en el comando '${path.basename(__filename)}':`, error);
            await interaction.editReply({ 
                content: '😿 ¡Miau! Algo salió mal al intentar obtener mi información. Por favor, inténtalo de nuevo.',
                ephemeral: true
            });
        }
    }
};