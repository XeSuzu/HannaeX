import { EmbedBuilder, WebhookClient } from "discord.js";

// Webhook URL configured via ERROR_WEBHOOK_URL environment variable
const webhookUrl = process.env.ERROR_WEBHOOK_URL;
const webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;

/**
 * Loads anti-crash handlers to capture unhandled errors.
 * Sends error reports to a configured webhook if available.
 */
export const loadAntiCrash = () => {
  // 1. Unhandled promise rejections
  process.on("unhandledRejection", (reason: any, promise) => {
    console.log("[AntiCrash] Unhandled Rejection");
    console.log(reason);
    sendErrorLog("Unhandled Rejection", reason);
  });

  // 2. Uncaught exceptions
  process.on("uncaughtException", (err, origin) => {
    console.log("[AntiCrash] Uncaught Exception");
    console.log(err, origin);
    sendErrorLog("Uncaught Exception", err);
  });

  // 3. Uncaught exception monitoring
  process.on("uncaughtExceptionMonitor", (err, origin) => {
    console.log("[AntiCrash] Uncaught Exception Monitor");
    console.log(err, origin);
  });
};

/**
 * Sends an error report to the configured webhook.
 * @param type - Error type classification
 * @param error - Error object or message
 */
function sendErrorLog(type: string, error: any) {
  if (!webhook) return;

  const errString =
    (error instanceof Error ? error.stack : String(error)) ||
    "Error without details";

  const embed = new EmbedBuilder()
    .setTitle(`Critical Error: ${type}`)
    .setDescription(`\`\`\`js\n${errString.substring(0, 4000)}\n\`\`\``)
    .setColor(0xff0000)
    .setTimestamp();

  webhook
    .send({ embeds: [embed] })
    .catch(() => console.error("Failed to send log to webhook"));
}