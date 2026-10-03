import dotenv from "dotenv";
import path from "path";

export function loadEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV || "development";
  const envPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);
  dotenv.config({ path: envPath, override: true });
  console.log(`.env.${nodeEnv} loaded from: ${envPath}`);
}
