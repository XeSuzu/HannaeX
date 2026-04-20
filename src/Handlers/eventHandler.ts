import { ClientEvents } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { HoshikoClient } from "../index";
import { HoshikoLogger, LogLevel } from "../Security";

export interface EventFile<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (
    ...args: [...ClientEvents[K], HoshikoClient]
  ) => void | Promise<void>;
}

function getFilesRecursively(directory: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(directory)) return files;

  const items = fs.readdirSync(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(directory, item.name);

    if (item.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      const isProd = process.env.NODE_ENV === "production";

      if (
        (isProd ? ext === ".js" : [".ts", ".js"].includes(ext)) &&
        !item.name.endsWith(".js.map") &&
        !item.name.endsWith(".d.ts")
      ) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export default async (client: HoshikoClient) => {
  const eventsPath = path.join(__dirname, "../Events");
  const allEventFiles = getFilesRecursively(eventsPath);

  let loaded = 0;
  let failed = 0;

  console.log("\n╭──────────────────────────────────────╮");
  console.log("│        ⚡ Event Handler Boot ⚡      │");
  console.log("╰──────────────────────────────────────╯");

  for (const filePath of allEventFiles) {
    try {
      delete require.cache[require.resolve(filePath)];

      const mod = await import(pathToFileURL(filePath).href);
      const eventModule = mod.default ?? mod;
      const event: EventFile = eventModule?.default ?? eventModule;

      if (!event || !event.name || typeof event.execute !== "function") {
        failed++;
        await HoshikoLogger.log({
          level: LogLevel.WARN,
          context: "EventHandler",
          message: `Estructura inválida: ${path.basename(filePath)}`,
        });
        continue;
      }

      const handler = (...args: ClientEvents[typeof event.name]) =>
        event.execute(...args, client);

      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }

      loaded++;

      console.log(
        `   ✨ ${event.name.padEnd(22)} | ${path.relative(eventsPath, filePath)}`,
      );
    } catch (error) {
      failed++;

      // 🔍 DEBUG — ver error completo para diagnosticar
      console.error(
        `\n[DEBUG] ❌ Error completo cargando ${path.basename(filePath)}:`,
        error,
      );

      await HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "EventHandler",
        message: `Error cargando evento: ${path.basename(filePath)}`,
        metadata:
          error instanceof Error
            ? `${error.message}\n${error.stack}`
            : String(error),
      });
    }
  }

  console.log("");
  console.log(`✨ EventHandler listo → ${loaded} cargados | ${failed} errores`);
  console.log("────────────────────────────────────────\n");

  await HoshikoLogger.log({
    level: LogLevel.SUCCESS,
    context: "EventHandler",
    message: `Inicialización completa (${loaded} eventos cargados, ${failed} errores)`,
  });
};
