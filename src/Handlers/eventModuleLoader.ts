import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const IGNORED_EVENT_DIRS = new Set(["handlers", "utils", "helpers"]);

export function findEventFiles(directory: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(directory)) return files;

  const items = fs.readdirSync(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(directory, item.name);

    if (item.isDirectory()) {
      if (item.name.startsWith("_") || IGNORED_EVENT_DIRS.has(item.name.toLowerCase())) {
        continue;
      }
      files.push(...findEventFiles(fullPath));
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

export async function loadEventModule(filePath: string): Promise<unknown> {
  delete require.cache[require.resolve(filePath)];

  const mod = await import(pathToFileURL(filePath).href);
  const eventModule = mod.default ?? mod;
  return eventModule?.default ?? eventModule;
}
