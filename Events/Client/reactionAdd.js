const Meme = require('../../Database/meme');
const ServerConfig = require('../../Models/serverConfig');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('No se pudo buscar el mensaje:', error);
        return;
      }
    }

    const guildId = reaction.message.guild.id;
    const config = await ServerConfig.findOne({ guildId: guildId });

    if (!config || reaction.message.channel.id !== config.memeChannelId) {
      return;
    }

    // Definimos los emojis que nos interesan y sus valores
    const emojisConPuntos = {
      '👍': 1,
      '👎': -1
    };
    
    const emojiName = reaction.emoji.name;

    // Si el emoji no está en nuestra lista, salimos
    if (!emojisConPuntos[emojiName]) return;

    const pointsToAdd = emojisConPuntos[emojiName];
    const message = reaction.message;

    try {
        const updatedMeme = await Meme.findOneAndUpdate(
            { messageId: message.id, guildId: guildId },
            {
                $inc: { points: pointsToAdd },
                $setOnInsert: {
                    authorId: message.author.id,
                    memeUrl: message.attachments.first()?.url,
                    channelId: message.channel.id
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`Puntos actualizados para el meme ${message.id}. Total: ${updatedMeme.points}`);
    } catch (error) {
        console.error('Error al actualizar los puntos del meme:', error);
    }
  },
};