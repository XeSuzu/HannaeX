import { EmbedBuilder, WebhookClient } from "discord.js";

const webhookUrl = process.env.ERROR_WEBHOOK_URL;
const webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(
        /(mongodb(?:\+srv)?:\/\/)([^:@/\s]+)(?::([^@/\s]*))?@/gi,
        "$1[REDACTED]@",
      )
      .replace(/(https?:\/\/[^\s:]+:)([^@\s/]+)(@)/gi, "$1[REDACTED]$3")
      .replace(/(Authorization\s*[:=]\s*Bearer\s+)[^\s]+/gi, "$1[REDACTED]")
      .replace(/(Cookie\s*[:=]\s*)[^\s;]+/gi, "$1[REDACTED]")
      .replace(
        /(token|secret|password|key|uri|webhook|mongodb)(\s*[:=]\s*)([^\s,;]+)/gi,
        "$1$2[REDACTED]",
      );
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }

  if (value && typeof value === "object") {
    const cloned: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("cookie") ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("uri") ||
        lowerKey.includes("webhook") ||
        lowerKey.includes("mongodb") ||
        lowerKey.includes("key")
      ) {
        cloned[key] = "[REDACTED]";
        continue;
      }

      cloned[key] = redactValue(nestedValue);
    }

    return cloned;
  }

  return value;
}

export const loadAntiCrash = () => {
  process.on("unhandledRejection", (reason: unknown) => {
    console.log("[AntiCrash] Unhandled Rejection");
    console.log(reason);
    sendErrorLog("Unhandled Rejection", reason);
  });

  process.on("uncaughtException", (error: Error, _origin: unknown) => {
    console.log("[AntiCrash] Uncaught Exception");
    console.log(error);
    sendErrorLog("Uncaught Exception", error);
  });

  process.on("uncaughtExceptionMonitor", (error: Error, _origin: unknown) => {
    console.log("[AntiCrash] Uncaught Exception Monitor");
    console.log(error);
  });
};

function sendErrorLog(type: string, error: unknown) {
  if (!webhook) {
    return;
  }

  const sanitizedError = redactValue(error);
  const errString =
    error instanceof Error
      ? (error.stack ?? "Error without details")
      : typeof sanitizedError === "string"
        ? sanitizedError
        : JSON.stringify(
            sanitizedError ?? { message: "Error without details" },
          );

  const embed = new EmbedBuilder()
    .setTitle(`Critical Error: ${type}`)
    .setDescription(`\`\`\`js\n${errString.substring(0, 4000)}\n\`\`\``)
    .setColor(0xff0000)
    .setTimestamp();

  webhook
    .send({ embeds: [embed] })
    .catch(() => console.error("[AntiCrash] Failed to send log to webhook"));
}
