import path from "path";
import fs from "fs";
import { HoshikoClient } from "../index";
import { SlashCommand, PrefixCommand } from "../Interfaces/Command";

function getFilesRecursively(directory: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(directory)) return files;

  const items = fs.readdirSync(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      files = files.concat(getFilesRecursively(fullPath));
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (
        [".ts", ".js"].includes(ext) &&
        !item.name.endsWith(".js.map") &&
        !item.name.endsWith(".d.ts")
      ) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function loadCommands<T>(directoryPath: string, validator: (cmd: any) => boolean): T[] {
  const commands: T[] = [];
  const allFiles = getFilesRecursively(directoryPath);

  console.log(`[CMD HANDLER] Escaneando: ${directoryPath} (${allFiles.length} archivos)`);

  for (const filePath of allFiles) {
    try {
      delete require.cache[require.resolve(filePath)];
      
      const mod = require(path.resolve(filePath));
      const command = mod.default || mod;

      if (validator(command)) {
        commands.push(command as T); 
      } else {
        console.warn(`⚠️ [WARNING] El archivo ${path.basename(filePath)} fue ignorado porque no tiene la estructura correcta (le falta name, data o execute).`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error al cargar ${filePath}:`, errorMessage);
    }
  }
  return commands;
}

export default (client: HoshikoClient) => {
  const prefixPath = path.join(__dirname, "../Commands/PrefixCmds");
  
  const prefixCommands = loadCommands<PrefixCommand>(prefixPath, (cmd) => {
    return cmd && typeof cmd.name === "string" && typeof cmd.execute === "function";
  });
  
  for (const c of prefixCommands) {
    client.commands.set(c.name, c);
  }
  console.log(`📜 Prefijos validados y cargados: ${client.commands.size}`);

  const slashPath = path.join(__dirname, "../Commands/SlashCmds");
  
  const slashCommands = loadCommands<SlashCommand>(slashPath, (cmd) => {
    return cmd && cmd.data && typeof cmd.execute === "function";
  });

  for (const command of slashCommands) {
    const name = command.data.name; 
    
    if (name) {
      client.slashCommands.set(name, command);
    }
  }

  console.log(`✨ Slash validados y cargados: ${client.slashCommands.size}`);
};