import { Events, Guild, REST, Routes } from "discord.js";
import path from "path";
import fs from "fs";
import { HoshikoClient } from "../../../index";
import "dotenv/config"; // Aseguramos variables de entorno

export = {
  name: Events.GuildCreate,

  async execute(guild: Guild, client: HoshikoClient) {
    console.log(`🌸 Bot unido al servidor: ${guild.name} (${guild.id})`);

    // Ajustamos la ruta para que funcione tanto en 'src' como en 'dist'
    const slashPath = path.join(__dirname, "../../../Commands/SlashCmds");

    if (!fs.existsSync(slashPath)) {
      return console.warn(
        `⚠️ No se encontró la carpeta de comandos en: ${slashPath}`,
      );
    }

    const publicCommands: any[] = [];
    const ownerCommands: any[] = [];

    const folders = fs.readdirSync(slashPath);

    for (const folder of folders) {
      const folderPath = path.join(slashPath, folder);

      // ✅ CORRECCIÓN: Buscamos .js (producción) O .ts (desarrollo), ignorando definiciones .d.ts
      const commandFiles = fs
        .readdirSync(folderPath)
        .filter(
          (f) =>
            (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts"),
        );

      for (const file of commandFiles) {
        try {
          const filePath = path.join(folderPath, file);
          // Limpiar caché para asegurar carga fresca
          delete require.cache[require.resolve(filePath)];

          const commandModule = require(filePath);
          const command = commandModule.default || commandModule;

          if (command && command.data) {
            const cmdJson = command.data.toJSON();

            // 🔍 FILTRO DE SEGURIDAD
            if (command.category === "Owner" || folder === "Owner") {
              ownerCommands.push(cmdJson);
            } else {
              publicCommands.push(cmdJson);
            }
          }
        } catch (err: any) {
          console.error(`❌ Error cargando ${file}:`, err.message);
        }
      }
    }

    const rest = new REST({ version: "10" }).setToken(client.config.token!);
    const ownerGuildId = process.env.GUILD_ID;

    // 🧠 LÓGICA DE INSTALACIÓN
    let payload = publicCommands;
    let typeLog = "PÚBLICOS";

    // Si es TU servidor privado, incluimos los comandos de dueño
    if (ownerGuildId && guild.id === ownerGuildId) {
      payload = [...publicCommands, ...ownerCommands];
      typeLog = "TOTALES (Incluye Admin)";
    }

    try {
      console.log(`   📤 Instalando ${payload.length} comandos ${typeLog}...`);

      await rest.put(
        Routes.applicationGuildCommands(client.config.BotId!, guild.id),
        { body: payload },
      );
      console.log(`✅ Registro exitoso en ${guild.name}`);
    } catch (err: any) {
      console.error(
        `❌ Error registrando comandos en ${guild.name}:`,
        err.message,
      );
    }
  },
};
