import { EmbedBuilder, WebhookClient } from "discord.js";
import { AppConfig } from "../App/config/AppConfig";

let webhook: WebhookClient | null | undefined;
export type FatalErrorHandler = (error: Error) => Promise<void> | void;
let fatalErrorHandler: FatalErrorHandler | null = null;

export function setFatalErrorHandler(handler: FatalErrorHandler | null): void {
  fatalErrorHandler = handler;
}

function redactString(value: string): string {
  const sensitiveEnvironmentKey =
    /(secret|token|password|passwd|key|webhook|mongo.*uri|redis.*uri)/i;
  const secrets = Object.entries(process.env)
    .filter(
      ([key, secret]) =>
        sensitiveEnvironmentKey.test(key) &&
        typeof secret === "string" &&
        secret.length > 0,
    )
    .map(([, secret]) => secret as string)
    .sort((left, right) => right.length - left.length);

  let redacted = value;
  for (const secret of secrets) {
    redacted = redacted.split(secret).join("[REDACTED]");
  }

  return redacted
    .replace(
      /mongodb(?:\+srv)?:\/\/[^\s"'`<>]+/gi,
      "[REDACTED_MONGODB_URI]",
    )
    .replace(/rediss?:\/\/[^\s"'`<>]+/gi, "[REDACTED_REDIS_URL]")
    .replace(
      /https?:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/[^\s"'`<>]+/gi,
      "[REDACTED_WEBHOOK_URL]",
    )
    .replace(/(Authorization\s*[:=]\s*Bearer\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/(Cookie\s*[:=]\s*)[^\s;]+/gi, "$1[REDACTED]")
    .replace(
      /(["']?(?:token|secret|password|passwd|key|uri|webhook|mongodb|redis_url)["']?\s*[:=]\s*["']?)[^"'`\s,;}]+/gi,
      "$1[REDACTED]",
    );
}

function redactValue(
  value: unknown,
  seen = new WeakMap<object, unknown>(),
): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  const cloned: Record<string, unknown> | unknown[] = Array.isArray(value)
    ? []
    : {};
  seen.set(value, cloned);

  if (Array.isArray(value)) {
    for (const entry of value) {
      (cloned as unknown[]).push(redactValue(entry, seen));
    }

    return cloned;
  }

  const entries = Object.entries(value);
  if (value instanceof Error) {
    const errorWithCause = value as Error & { cause?: unknown };
    entries.push(
      ["name", value.name],
      ["message", value.message],
      ["stack", value.stack],
      ["cause", errorWithCause.cause],
    );
  }

  for (const [key, nestedValue] of entries) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("password") ||
      lowerKey.includes("passwd") ||
      lowerKey.includes("cookie") ||
      lowerKey.includes("authorization") ||
      lowerKey.includes("uri") ||
      lowerKey.includes("webhook") ||
      lowerKey.includes("mongodb") ||
      lowerKey.includes("redis_url") ||
      lowerKey.includes("key")
    ) {
      (cloned as Record<string, unknown>)[key] = "[REDACTED]";
      continue;
    }

    (cloned as Record<string, unknown>)[key] = redactValue(nestedValue, seen);
  }

  return cloned;
}

function serializeRedactedError(error: unknown): string {
  try {
    const redacted = redactValue(error);
    if (typeof redacted === "string") {
      return redacted;
    }

    return (
      JSON.stringify(
        redacted,
        (_key, value: unknown) =>
          typeof value === "bigint" ? value.toString() : value,
        2,
      ) ?? String(redacted ?? "Error without details")
    );
  } catch {
    return "[Error could not be safely serialized]";
  }
}

function getWebhook(): WebhookClient | null {
  if (webhook !== undefined) {
    return webhook;
  }

  try {
    AppConfig.get();
    const webhookUrl = process.env.ERROR_WEBHOOK_URL;
    webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;
  } catch {
    webhook = null;
  }

  return webhook;
}

export const loadAntiCrash = (): void => {
  process.on("unhandledRejection", (reason: unknown) => {
    void sendErrorLog("Unhandled Rejection", reason);
  });

  process.on("uncaughtException", (error: Error, _origin: unknown) => {
    void (async () => {
      try {
        await sendErrorLog("Uncaught Exception", error);
      } catch (e) {
        console.error(
          "[AntiCrash] Error enviando log de excepción no capturada:",
          e,
        );
      }

      if (fatalErrorHandler) {
        try {
          await fatalErrorHandler(error);
        } catch {
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    })();
  });

  process.on("uncaughtExceptionMonitor", (error: Error, _origin: unknown) => {
    console.error(
      `[AntiCrash] Uncaught Exception Monitor: ${serializeRedactedError(error)}`,
    );
  });
};

async function sendErrorLog(type: string, error: unknown): Promise<void> {
  const safeType = redactString(type);
  const safeError = serializeRedactedError(error);
  console.error(`[AntiCrash] ${safeType}: ${safeError}`);

  const errorWebhook = getWebhook();
  if (!errorWebhook) {
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Critical Error: ${safeType}`)
    .setDescription(`\`\`\`js\n${safeError.substring(0, 4000)}\n\`\`\``)
    .setColor(0xff0000)
    .setTimestamp();

  const webhookPromise = errorWebhook
    .send({ embeds: [embed] })
    .then(() => undefined)
    .catch(() => console.error("[AntiCrash] Failed to send log to webhook"));

  await Promise.race([
    webhookPromise,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}
