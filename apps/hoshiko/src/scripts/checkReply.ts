import fs from "fs";
import path from "path";

const COMMANDS_DIR = path.join(__dirname, "../Commands/SlashCmds");
const IGNORE_PATTERNS = [".d.ts", ".js.map"];

// Patrones problemáticos — reply directo sin ser modal
const BAD_PATTERNS = [
  /interaction\.reply\s*\(/g,
  /interaction\.deferReply\s*\(/g,
];

// Excepciones legítimas — comandos que abren modales o son autocomplete
const MODAL_COMMANDS = ["sugerencia", "report"];

interface Result {
  file: string;
  lines: { line: number; content: string; pattern: string }[];
}

function getFilesRecursively(dir: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = [...files, ...getFilesRecursively(fullPath)];
    } else if (
      item.isFile() &&
      item.name.endsWith(".ts") &&
      !IGNORE_PATTERNS.some((p) => item.name.endsWith(p))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(filePath: string): Result | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const matches: Result["lines"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of BAD_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        matches.push({
          line: i + 1,
          content: line.trim(),
          pattern: pattern.source,
        });
      }
    }
  }

  if (matches.length === 0) return null;

  return {
    file: path.relative(COMMANDS_DIR, filePath),
    lines: matches,
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const allFiles = getFilesRecursively(COMMANDS_DIR);
const results: Result[] = [];

for (const file of allFiles) {
  const result = scanFile(file);
  if (result) results.push(result);
}

console.log("\n🔍 Escaneando comandos en busca de interaction.reply() / deferReply()...\n");

if (results.length === 0) {
  console.log("✅ Todo limpio — ningún comando usa reply() o deferReply() directo.\n");
} else {
  console.log(`⚠️  Se encontraron ${results.length} archivo(s) con posibles problemas:\n`);
  for (const result of results) {
    console.log(`📄 ${result.file}`);
    for (const match of result.lines) {
      console.log(`   └─ Línea ${match.line}: ${match.content}`);
    }
    console.log();
  }

  console.log("─".repeat(60));
  console.log("💡 RECUERDA:");
  console.log("   • Usa editReply() en lugar de reply()");
  console.log("   • Nunca uses deferReply() en los comandos — ya lo hace interactionCreate");
  console.log(`   • Excepciones legítimas: ${MODAL_COMMANDS.join(", ")} (abren modales)\n`);
}
