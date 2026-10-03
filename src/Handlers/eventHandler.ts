import type { ClientEvents } from "discord.js";
import path from "path";
import type { HoshikoClient } from "../client/HoshikoClient";
import { HoshikoLogger, LogLevel } from "../Security";
import { findEventFiles, loadEventModule } from "./eventModuleLoader";

export interface EventFile<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (
    ...args: [...ClientEvents[K], HoshikoClient]
  ) => void | Promise<void>;
}

export default async (client: HoshikoClient) => {
  const eventsPath = path.join(__dirname, "../Events");
  const allEventFiles = findEventFiles(eventsPath);

  let loaded = 0;
  let failed = 0;

  console.log("\n----------------------------------------");
  console.log("     Event Handler Boot");
  console.log("----------------------------------------");

  for (const filePath of allEventFiles) {
    try {
      const event: EventFile = (await loadEventModule(filePath)) as EventFile;

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

      // DEBUG — full error for diagnostics
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
  console.log(`EventHandler ready -> ${loaded} loaded | ${failed} errors`);
  console.log("----------------------------------------\n");

  await HoshikoLogger.log({
    level: LogLevel.SUCCESS,
    context: "EventHandler",
    message: `Inicialización completa (${loaded} eventos cargados, ${failed} errores)`,
  });
};
