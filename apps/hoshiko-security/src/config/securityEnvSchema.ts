import { z } from "zod";

const blankToUndefined = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().optional());

const booleanString = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off", ""].includes(normalized)) return false;
  }
  return value;
}, z.boolean().default(false));

export const securityEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  HOSHIKO_SECURITY_TOKEN: blankToUndefined,
  HOSHIKO_SECURITY_CLIENT_ID: blankToUndefined,
  SECURITY_PORT: z.coerce.number().int().positive().default(8082),
  SECURITY_HEALTH_HOST: z.string().default("127.0.0.1"),
  MONGO_URI: blankToUndefined,
  REDIS_URL: blankToUndefined,
  REDIS_ENABLED: booleanString,
});

export type SecurityEnvironment = z.infer<typeof securityEnvSchema>;

export function parseSecurityEnvironment(
  raw: NodeJS.ProcessEnv = process.env,
): SecurityEnvironment {
  return securityEnvSchema.parse(raw);
}
