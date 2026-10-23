import { z } from "zod";

const blankToUndefined = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().optional());

const booleanString = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  HEALTH_HOST: z.string().default("127.0.0.1"),
  TOKEN: blankToUndefined,
  BOT_ID: blankToUndefined,
  PREFIX: z.string().default("!"),
  GUILD_ID: blankToUndefined,
  MONGO_URI: blankToUndefined,
  REDIS_URL: blankToUndefined,
  REDIS_ENABLED: booleanString.default(false),
  WORKER_ENABLED: booleanString.default(false),
  HEALTH_DETAILS_TOKEN: blankToUndefined,
  GEMINI_MODERATION_API_KEY: blankToUndefined,
  GOOGLE_SAFE_BROWSING_KEY: blankToUndefined,
  SUPPORT_SERVER_INVITE: blankToUndefined,
});

export type AppEnvironment = z.infer<typeof envSchema>;

export function parseAppEnvironment(raw: NodeJS.ProcessEnv = process.env): AppEnvironment {
  return envSchema.parse(raw);
}
