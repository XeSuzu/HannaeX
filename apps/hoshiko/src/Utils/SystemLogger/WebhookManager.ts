import { WebhookClient } from "discord.js";

export const webhooks = {
  say: process.env.SAY_LOGS_WEBHOOK_URL
    ? new WebhookClient({ url: process.env.SAY_LOGS_WEBHOOK_URL })
    : null,
  cmd: process.env.LOG_WEBHOOK_COMMANDS
    ? new WebhookClient({ url: process.env.LOG_WEBHOOK_COMMANDS })
    : null,
  sys: process.env.LOG_WEBHOOK_SYSTEM
    ? new WebhookClient({ url: process.env.LOG_WEBHOOK_SYSTEM })
    : null,
  sec: process.env.LOG_WEBHOOK_SECURITY
    ? new WebhookClient({ url: process.env.LOG_WEBHOOK_SECURITY })
    : null,
};

console.log("[Logger] Multi-webhook system initialized.");
