const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('🤗 Envía un abrazo cálido a alguien especial')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('El usuario que recibirá el abrazo')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('usuario');
    const authorUser = interaction.user;

    const hugGifs = [
      'https://i.imgur.com/MCvMErV.gif',
      'https://i.imgur.com/7X7HPs4.gif',
      'https://i.redd.it/mesqxxfffeva1.gif',
      'https://c.tenor.com/IpGw3LOZi2wAAAAC/tenor.gif',
      'https://c.tenor.com/rTKIBe2qtxsAAAAC/tenor.gif',
    ];

    const mensajes = [
      `✨ ${authorUser} te envuelve en un abrazo que es pura magia y cariño, ${targetUser}. 💖`,
      `🌟 ${authorUser} te da un abrazo estelar que ilumina tu noche, ${targetUser}. 💫`,
      `💖 ${authorUser} te abraza con una energía tan fuerte que te hace brillar, ${targetUser}. ✨`,
      `🍥 ${authorUser} te ofrece un abrazo cálido, dulce y muy reconfortante, ${targetUser}. ☕️`,
      `🌷 ${authorUser} te da un abrazo hecho con todos los buenos deseos del mundo, ${targetUser}. 🥰`,
      `🍃 Un abrazo suave de ${authorUser} para ti, ${targetUser}, tan fresco como una brisa tranquila. 😌`,
      `🐻 ${authorUser} te da un abrazo de oso, pero con toda la ternura del mundo, ${targetUser}. 🤗`,
      `🌈 ${authorUser} te rodea con un abrazo que es un arcoíris de alegría, ${targetUser}. 🌻`,
      `🌌 ${authorUser} te envía un abrazo que es un universo de amor para ti, ${targetUser}. 🚀`,
      `💌 ${authorUser} te da un abrazo lleno de cariño y las mejores vibras, ${targetUser}. 💕`,
    ];

    const autoMensajes = [
      `🌸 ${authorUser}, abrazarte a ti mism@ es el mejor acto de amor propio que puedes hacer. ¡Sigue brillando! ✨💖`,
      `💖 ¡Un abrazo gigante para ti, ${authorUser}! Nunca olvides que mereces todo el cariño del mundo. 🌈🤗`,
      `🌟 ¡Ey, ${authorUser}! Este autoabrazo es un recordatorio de que eres fuerte, dulce y única. 🌷💫`,
      `🍥 ${authorUser}, envuélvete en tu propio cariño y siéntete increíble. ¡Te lo mereces! 🥰🌸`,
      `🌼 ¿Sabías que el mejor abrazo es el que te das a ti mism@? ¡Ámate mucho, ${authorUser}! 💞✨`,
    ];

    function getRandomAndRemove(arr) {
      const idx = Math.floor(Math.random() * arr.length);
      const item = arr.splice(idx, 1)[0];
      return item;
    }

    if (targetUser.id === authorUser.id) {
      const mensajesAuto = [...autoMensajes];
      const hugGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];
      const mensajeAuto = getRandomAndRemove(mensajesAuto);

      const embedAuto = new EmbedBuilder()
        .setColor('#f48fb1')
        .setTitle('🤗 ¡Autoabrazo!')
        .setDescription(mensajeAuto)
        .setImage(hugGif)
        .setTimestamp()
        .setFooter({
          text: `Eres increíble, ${authorUser.tag} 💕`,
          iconURL: authorUser.displayAvatarURL({ dynamic: true }),
        });

      return interaction.reply({ embeds: [embedAuto] });
    }

    const mensajesCopy = [...mensajes];
    const randomMensaje = getRandomAndRemove(mensajesCopy);
    const randomHugGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

    const embed = new EmbedBuilder()
      .setColor('#f48fb1')
      .setTitle('🤗 ¡Un abrazo lleno de amor!')
      .setDescription(
        `✨ ${randomMensaje} ✨\n\n*“Los abrazos son el lenguaje silencioso del cariño.”* 🌸`
      )
      .setImage(randomHugGif)
      .setThumbnail(authorUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({
        text: `Solicitado por ${authorUser.tag} 💖`,
        iconURL: authorUser.displayAvatarURL({ dynamic: true }),
      });

    const devolverBtn = new ButtonBuilder()
      .setCustomId('devolver_abrazo')
      .setLabel('🤗 Devolver abrazo')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(devolverBtn);

    await interaction.reply({ embeds: [embed], components: [row] });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    collector.on('collect', async i => {
      if (i.customId === 'devolver_abrazo') {
        if (i.user.id !== targetUser.id) {
          return i.reply({
            content: '❌ Solo la persona que recibió el abrazo puede devolverlo.',
            flags: MessageFlags.Ephemeral,
          });
        }

        const mensajesDevolucion = [
          `${targetUser} te abraza de vuelta, ${authorUser}! 🥰🤗`,
          `${targetUser} te envía un abrazo cálido, ${authorUser}! 🌸✨`,
          `¡Abrazo recíproco de ${targetUser} para ${authorUser}! 💖🫂`,
        ];

        const gifsDevolucion = [
          'https://i.pinimg.com/originals/85/dc/ef/85dcef131af84b515106955e142df54e.gif',
          'https://usagif.com/wp-content/uploads/gif/anime-hug-12.gif',
          'https://i.pinimg.com/originals/c2/65/d5/c265d5457bf2e9ba76a9c9bf8b58c031.gif',
          'https://c.tenor.com/L2wfKcX_6RIAAAAC/tenor.gif',
          'https://c.tenor.com/FgLRE4gi5VoAAAAC/tenor.gif',
        ];

        const mensajesDevolucionCopy = [...mensajesDevolucion];
        const randomMensajeDevolucion = getRandomAndRemove(mensajesDevolucionCopy);
        const randomGifDevolucion =
          gifsDevolucion[Math.floor(Math.random() * gifsDevolucion.length)];

        const embedDevolucion = new EmbedBuilder()
          .setColor('#f06292')
          .setTitle('💖 ¡Abrazo devuelto con amor!')
          .setDescription(
            `${randomMensajeDevolucion}\n\n*“Un abrazo compartido es doble alegría.”* 🌟`
          )
          .setImage(randomGifDevolucion)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({
            text: `Respondido por ${targetUser.tag} 💕`,
            iconURL: targetUser.displayAvatarURL({ dynamic: true }),
          });

        await i.deferUpdate();
        await interaction.followUp({ embeds: [embedDevolucion] });
        await interaction.editReply({ components: [] });

        collector.stop();
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  },
};
