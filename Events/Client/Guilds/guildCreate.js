const { REST, Routes } = require("discord.js");
const path = require("path");
const fs = require("fs");

module.exports = {
  name: "guildCreate",
  async execute(guild, client) {
    console.log(`🌸 Bot unido a servidor: ${guild.name} (${guild.id})`);

    const slashPath = path.join(__dirname, "../../Commands/SlashCmds");
    if (!fs.existsSync(slashPath)) return console.warn("⚠️ No existe la carpeta de comandos SlashCmds");

    const slashFolders = fs.readdirSync(slashPath);
    const slashCommandsArray = [];

    for (const folder of slashFolders) {
      const folderPath = path.join(slashPath, folder);
      const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
      for (const file of commandFiles) {
        try {
          const command = require(path.join(folderPath, file));
          if (command.data && command.execute) {
            if (Array.isArray(command.data)) {
              command.data.forEach(cmdData => slashCommandsArray.push(cmdData.toJSON()));
            } else {
              slashCommandsArray.push(command.data.toJSON());
            }
          }
        } catch (err) {
          console.error(`❌ Error cargando comando ${file}:`, err.message);
        }
      }
    }

    const rest = new REST({ version: "10" }).setToken(client.config.token);
    try {
      await rest.put(Routes.applicationGuildCommands(client.config.BotId, guild.id), { body: slashCommandsArray });
      console.log(`✅ ${slashCommandsArray.length} comandos registrados correctamente en ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`❌ Error registrando comandos en ${guild.name}:`, err.message);
    }
  },
};
