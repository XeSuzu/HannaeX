import { loadEnvironment } from "../../config/loadEnvironment";
import { parseAppEnvironment, type AppEnvironment } from "./envSchema";

export class AppConfig {
  private static instance: AppEnvironment | null = null;

  static load(): AppEnvironment {
    loadEnvironment();
    this.instance = parseAppEnvironment(process.env);
    return this.instance;
  }

  static get(): AppEnvironment {
    if (this.instance === null) {
      return this.load();
    }

    return this.instance;
  }

  static getRuntimeDefaults(): Pick<AppEnvironment, "PORT" | "NODE_ENV" | "PREFIX"> {
    const env = this.get();
    return {
      PORT: env.PORT,
      NODE_ENV: env.NODE_ENV,
      PREFIX: env.PREFIX,
    };
  }

  static isRedisEnabled(): boolean {
    const env = this.get();
    return env.REDIS_ENABLED === true && typeof env.REDIS_URL === "string" && env.REDIS_URL.trim().length > 0;
  }
}
