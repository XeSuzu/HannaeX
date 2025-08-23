const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const process = require('process');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('🌸 Muestra información adorable y completa del bot~'),

    async execute(interaction, client) {
        const creatorId = '727583213253558373';
        let creatorUser;

        try {
            creatorUser = await client.users.fetch(creatorId);
        } catch (error) {
            console.error('No se pudo encontrar al creador:', error);
            creatorUser = { username: 'Desconocido', id: creatorId, displayAvatarURL: () => null };
        }

        // Frases aleatorias neko uwu
        const frasesNeko = [
            'Nyaa~ ¿Me estabas buscando? 🐾',
            'UwU ¡Estoy feliz de verte, senpai~! 💖',
            'M-meow~ ¡Aquí tienes mi información! 🌸',
            'Nyan~ ¡Listo para ayudarte cuando quieras! 🐱',
            'Kawaii mode activado, nya~ 💕'
        ];
        const fraseRandom = frasesNeko[Math.floor(Math.random() * frasesNeko.length)];

        const gifUrl = 'https://i.gifer.com/8Va3.gif';
        const creatorAvatar = creatorUser.displayAvatarURL?.() || null;
        const numberFormat = new Intl.NumberFormat('es-ES');

        const commandsCount = client.commands ? client.commands.size : 0;
        const uptime = `<t:${Math.floor(Date.now() / 1000 - (client.uptime / 1000))}:R>`;

        // Barra de energía kawaii
        const energiaBot = '💖💖💖💖💖💖💖💖💖💖';

        const infoEmbed = new EmbedBuilder()
            .setColor('#FFB6C1')
            .setTitle(`🌸 ${client.user.username} - Perfil Neko 🐾`)
            .setDescription(`${fraseRandom}\n\n💌 *Soy un bot tierno que quiere ayudarte y ser tu amigo.*`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setImage(gifUrl)

            .addFields(
                { name: '💌 Creador/a', value: `**Nombre:** \`${creatorUser.username}\`\n**ID:** \`${creatorUser.id}\`\n[Perfil lindo~](https://discordapp.com/users/${creatorId})`, inline: true },
                { name: '📊 Estadísticas', value: `🏠 **Servidorecitos:** \`${numberFormat.format(client.guilds.cache.size)}\`\n👥 **Amiguitos:** \`${numberFormat.format(client.users.cache.size)}\`\n💓 **Latencia:** \`${Math.round(client.ws.ping)}ms\``, inline: true },
                { name: '📜 Comanditos', value: `Tengo **${commandsCount}** comandos~\nUsa \`/help\` para verlos todos, nya~`, inline: false },
                { name: '⏳ Tiempo despiertita', value: uptime, inline: true },
                { name: '⚡ Energía', value: energiaBot, inline: true },
                { name: '💻 Datos Técnicos', value: `🖥 **SO:** \`${os.type()} ${os.release()}\`\n🛠 **Node.js:** \`${process.version}\`\n📦 **discord.js:** \`${djsVersion}\``, inline: false }
            )

            .setTimestamp()
            .setFooter({
                text: 'Arigatou por usarme~ 💕 Nya~',
                iconURL: creatorAvatar || client.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [infoEmbed] });
    }
};
