const mongoose = require('mongoose');
const Meme = require('./Database/meme');
const ServerConfig = require('./Models/serverConfig');

// Cambia la URI por la de tu base de datos
const MONGO_URI = 'mongodb+srv://AmyXs:8Sm2POmjeHRCDo7T@kissdatabase.apzliex.mongodb.net/?retryWrites=true&w=majority&appName=KissDataBase';

async function migrar() {
  await mongoose.connect(MONGO_URI);

  const memesSinChannel = await Meme.find({ channelId: { $exists: false } });

  let actualizados = 0;
  for (const meme of memesSinChannel) {
    const config = await ServerConfig.findOne({ guildId: meme.guildId });
    if (config && config.memeChannelId) {
      meme.channelId = config.memeChannelId;
      await meme.save();
      actualizados++;
    }
  }

  console.log(`Memes migrados: ${actualizados}`);
  await mongoose.disconnect();
}

migrar().catch(console.error);