const mongoose = require("mongoose");
const { ActivityType, REST, Routes } = require("discord.js");
const path = require("path");
const fs = require("fs");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    // ===== Conexión a MongoDB =====
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ Conexión exitosa a la base de datos de MongoDB!");
    } catch (err) {
      console.error("❌ Error al conectar a MongoDB:", err);
      process.exit(1);
    }

    // ===== Mensaje de inicio =====
    console.log(`🌸 Nyaa~ ${client.user.tag} está lista para ronronear 💖`);

    // ===== Actividades dinámicas =====
    const activities = [
      { name: "jugando contigo >w<", type: ActivityType.Playing },
      { name: "tus historias kawaii 😽", type: ActivityType.Listening },
      { name: "cómo crece tu servidor 🐾", type: ActivityType.Watching },
      { name: "trayendo diversión y mimos 💖", type: ActivityType.Playing }
    ];
    let i = 0;
    client.user.setPresence({
      activities: [{ name: activities[i].name, type: activities[i].type }],
      status: "online"
    });
    setInterval(() => {
      i = (i + 1) % activities.length;
      client.user.setPresence({
        activities: [{ name: activities[i].name, type: activities[i].type }],
        status: "online"
      });
    }, 15000);

    // ===== Registrar comandos en todos los servidores existentes =====
    const rest = new REST({ version: "10" }).setToken(client.config.token);
    const slashPath = path.join(__dirname, "../../Commands/SlashCmds");
    if (!fs.existsSync(slashPath)) return console.warn("⚠️ No existe la carpeta de comandos SlashCmds");

    const slashFolders = fs.readdirSync(slashPath);
    const commandsArray = [];

    for (const folder of slashFolders) {
      const folderPath = path.join(slashPath, folder);
      const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
      for (const file of commandFiles) {
        try {
          const command = require(path.join(folderPath, file));
          if (command.data && command.execute) {
            if (Array.isArray(command.data)) {
              command.data.forEach(cmdData => commandsArray.push(cmdData.toJSON()));
            } else {
              commandsArray.push(command.data.toJSON());
            }
          }
        } catch (err) {
          console.error(`❌ Error cargando comando ${file}:`, err.message);
        }
      }
    }

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        await rest.put(Routes.applicationGuildCommands(client.config.BotId, guildId), { body: commandsArray });
        console.log(`✅ Comandos cargados en ${guild.name} (${guildId})`);
      } catch (err) {
        console.error(`❌ Error cargando comandos en ${guild.name} (${guildId}):`, err.message);
      }
    }

    console.log("🌟 ¡Todo listo para ronronear con tus comandos! >w<");
  },
};
