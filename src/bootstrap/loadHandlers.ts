import fs from "fs";
import path from "path";
import type { HoshikoClient } from "../client/HoshikoClient";

/** Loads the top-level handler modules, preserving the existing discovery rules. */
export interface LoadHandlersOptions {
  handlersDir?: string;
  loadHandlerModule?: (handlerPath: string) => unknown | Promise<unknown>;
  reportError?: (file: string, error: unknown) => void | Promise<void>;
}

async function reportHandlerError(file: string, error: unknown): Promise<void> {
  const { HoshikoLogger, LogLevel } = await import("../Security/index.js");
  await HoshikoLogger.log({
    level: LogLevel.ERROR,
    context: "System/Handlers",
    message: `Error loading handler ${file}`,
    metadata: error,
  });
}

function loadHandlerModule(handlerPath: string): unknown {
  delete require.cache[require.resolve(handlerPath)];
  return require(handlerPath);
}

export async function loadHandlers(
  client: HoshikoClient,
  options: LoadHandlersOptions = {},
): Promise<void> {
  const handlersDir =
    options.handlersDir ?? path.join(__dirname, "../Handlers");
  if (!fs.existsSync(handlersDir)) return;

  const handlerFiles = fs
    .readdirSync(handlersDir)
    .filter(
      (file) =>
        (file.endsWith(".js") || file.endsWith(".ts")) &&
        !file.endsWith(".map.js") &&
        !file.endsWith(".d.ts"),
    );

  for (const file of handlerFiles) {
    if (file.includes("database") || file.includes("mongo")) continue;

    try {
      const handlerPath = path.join(handlersDir, file);
      const handlerModule = await (
        options.loadHandlerModule ?? loadHandlerModule
      )(handlerPath);
      const handler =
        handlerModule &&
        typeof handlerModule === "object" &&
        "default" in handlerModule
          ? (handlerModule as { default?: unknown }).default || handlerModule
          : handlerModule;

      if (typeof handler === "function") {
        await handler(client);
      }
    } catch (error) {
      try {
        await (options.reportError ?? reportHandlerError)(file, error);
      } catch {
        console.error(`[Handlers] Failed to report handler error: ${file}`);
      }
    }
  }
}
