import fs from "fs";
import path from "path";
import { HoshikoClient } from "../client/HoshikoClient";
import { HoshikoLogger, LogLevel } from "../Security";

/** Loads the top-level handler modules, preserving the existing discovery rules. */
export function loadHandlers(client: HoshikoClient): void {
  const handlersDir = path.join(__dirname, "../Handlers");
  if (!fs.existsSync(handlersDir)) return;

  const handlerFiles = fs
    .readdirSync(handlersDir)
    .filter(
      (file) =>
        (file.endsWith(".js") || file.endsWith(".ts")) &&
        !file.endsWith(".map.js") &&
        !file.endsWith(".d.ts"),
    );

  handlerFiles.forEach((file) => {
    if (file.includes("database") || file.includes("mongo")) return;

    try {
      const handlerPath = path.join(handlersDir, file);
      delete require.cache[require.resolve(handlerPath)];
      const handlerModule = require(handlerPath);
      const handler = handlerModule.default || handlerModule;

      if (typeof handler === "function") {
        handler(client);
      }
    } catch (error) {
      HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "System/Handlers",
        message: `Error loading handler ${file}`,
        metadata: error,
      });
    }
  });
}
