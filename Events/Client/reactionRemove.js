const Meme = require('../../Database/meme');
const ServerConfig = require('../../Models/serverConfig');

module.exports = {
  name: 'messageReactionRemove',
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

    // Definimos los emojis y sus valores
    const emojisConPuntos = {
      '👍': 1,
      '👎': -1
    };

    const emojiName = reaction.emoji.name;
    if (!emojisConPuntos[emojiName]) return;

    const pointsToRevert = emojisConPuntos[emojiName];
    const message = reaction.message;

    try {
        const updatedMeme = await Meme.findOneAndUpdate(
            { messageId: message.id, guildId: guildId },
            { $inc: { points: -pointsToRevert } },
            { new: true }
        );
        
        if (updatedMeme && updatedMeme.points < 0) {
          updatedMeme.points = 0;
          await updatedMeme.save();
        }

        console.log(`Puntos revertidos para el meme ${message.id}. Total: ${updatedMeme ? updatedMeme.points : 0}`);
    } catch (error) {
        console.error('Error al revertir los puntos del meme:', error);
    }
  },
};