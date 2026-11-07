import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import {
  parseSecurityEnvironment,
  type SecurityEnvironment,
} from "./securityEnvSchema";

export class SecurityConfig {
  private static instance: SecurityEnvironment | null = null;

  static load(): SecurityEnvironment {
    const nodeEnv = process.env.NODE_ENV || "development";

    const monorepoRoot = path.resolve(__dirname, "../../..");
    const appRoot = path.resolve(__dirname, "../..");

    // 1. Cargar archivo específico .env.security si existe en cwd, en la app o en la raíz
    const securityCandidates = [
      path.resolve(process.cwd(), ".env.security"),
      path.resolve(appRoot, ".env.security"),
      path.resolve(monorepoRoot, ".env.security"),
    ];
    for (const candidate of securityCandidates) {
      if (fs.existsSync(candidate)) {
        dotenv.config({ path: candidate, override: false });
        break;
      }
    }

    // 2. Cargar .env.${nodeEnv} desde cwd o raíz del monorepo
    const envCandidates = [
      path.resolve(process.cwd(), `.env.${nodeEnv}`),
      path.resolve(monorepoRoot, `.env.${nodeEnv}`),
    ];
    for (const candidate of envCandidates) {
      if (fs.existsSync(candidate)) {
        dotenv.config({ path: candidate, override: false });
        break;
      }
    }

    this.instance = parseSecurityEnvironment(process.env);
    return this.instance;
  }

  static get(): SecurityEnvironment {
    if (this.instance === null) {
      return this.load();
    }
    return this.instance;
  }

  /**
   * Determina si Hoshiko Security dispone de configuración suficiente para iniciar.
   * Sin HOSHIKO_SECURITY_TOKEN, el bot de seguridad NO debe iniciar automáticamente.
   */
  static isConfigured(): boolean {
    const env = this.get();
    return (
      typeof env.HOSHIKO_SECURITY_TOKEN === "string" &&
      env.HOSHIKO_SECURITY_TOKEN.trim().length > 0
    );
  }

  static isRedisEnabled(): boolean {
    const env = this.get();
    return (
      env.REDIS_ENABLED === true &&
      typeof env.REDIS_URL === "string" &&
      env.REDIS_URL.trim().length > 0
    );
  }
}
