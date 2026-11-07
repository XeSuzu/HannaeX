import dotenv from "dotenv";
import fs from "fs";
import path from "path";

export function resolveEnvFilePath(
  nodeEnv = process.env.NODE_ENV || "development",
  cwd = process.cwd(),
): string {
  const fileName = `.env.${nodeEnv}`;
  const cwdCandidate = path.resolve(cwd, fileName);
  if (fs.existsSync(cwdCandidate)) {
    return cwdCandidate;
  }

  const monorepoRootCandidate = path.resolve(__dirname, "../../../..", fileName);
  if (fs.existsSync(monorepoRootCandidate)) {
    return monorepoRootCandidate;
  }

  return cwdCandidate;
}

export function loadEnvironment(): string {
  const nodeEnv = process.env.NODE_ENV || "development";
  const envPath = resolveEnvFilePath(nodeEnv);
  dotenv.config({ path: envPath, override: false });
  console.log(`.env.${nodeEnv} loaded from: ${envPath}`);
  return envPath;
}
