import fs from "fs";
import path from "path";
import { HoshikoLogger, LogLevel } from "../index";

export class BackupManager {
  private static backupPath = path.join(process.cwd(), "backups");

  /**
   * Crea una copia de seguridad de la carpeta de logs
   */
  static async createLogBackup() {
    const sourceDir = path.join(process.cwd(), "logs");
    const date = new Date().toISOString().split("T")[0];
    const targetDir = path.join(this.backupPath, `logs-${date}`);

    try {
      if (!fs.existsSync(sourceDir)) return;

      // Crear carpeta de backups si no existe
      if (!fs.existsSync(this.backupPath)) fs.mkdirSync(this.backupPath);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

      // Copiar archivos de logs
      const files = fs.readdirSync(sourceDir);
      for (const file of files) {
        fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
      }

      HoshikoLogger.log({
        level: LogLevel.SUCCESS,
        context: "System/Backup",
        message: `Respaldo de seguridad creado con éxito: logs-${date}`,
      });
    } catch (error) {
      HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "System/Backup",
        message: "Error al crear el respaldo de archivos",
        metadata: error,
      });
    }
  }
}
