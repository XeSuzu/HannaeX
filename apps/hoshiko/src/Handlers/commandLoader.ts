import fs from "fs";
import path from "path";

/** Loads valid command modules from a directory tree in filesystem order. */
export function loadCommands<T>(
  directoryPath: string,
  validator: (command: any) => boolean,
): T[] {
  const commands: T[] = [];
  const allFiles = getFilesRecursively(directoryPath);

  console.log(
    "[CMD HANDLER] Scanning: " + directoryPath + " (" + allFiles.length + " files)",
  );

  for (const filePath of allFiles) {
    try {
      const absolutePath = path.resolve(filePath);
      delete require.cache[require.resolve(absolutePath)];

      const mod = require(absolutePath);
      const command = mod.default || mod;

      if (validator(command)) {
        commands.push(command as T);
      } else {
        console.warn(
          "[WARNING] File " + path.basename(filePath) + " was ignored due to invalid structure (missing name, data, or execute).",
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error loading " + filePath + ":", errorMessage);
    }
  }

  return commands;
}

const IGNORED_COMMAND_DIRS = new Set([
  "renderer",
  "setup-levels",
  "flows",
  "utils",
  "helpers",
  "components",
]);

function isIgnoredDirectory(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    name.startsWith("_") ||
    IGNORED_COMMAND_DIRS.has(lower) ||
    lower.endsWith("utils") ||
    lower.endsWith("-levels")
  );
}

function isAuxiliaryFile(name: string): boolean {
  return (
    name.startsWith("_") ||
    /^(?:.*(?:Renderer|Primitives|Views|Flow))\.[jt]s$/i.test(name)
  );
}

function getFilesRecursively(directory: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(directory)) return files;

  const items = fs.readdirSync(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      if (isIgnoredDirectory(item.name)) continue;
      files = files.concat(getFilesRecursively(fullPath));
    } else if (item.isFile()) {
      if (isAuxiliaryFile(item.name)) continue;
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
