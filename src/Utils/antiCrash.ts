import { EmbedBuilder, WebhookClient } from "discord.js";

// Si quieres recibir alertas en un canal privado, pon la URL del Webhook en tu .env
// Ejemplo en .env: ERROR_WEBHOOK_URL="https://discord.com/api/webhooks/..."
const webhookUrl = process.env.ERROR_WEBHOOK_URL;
const webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;

export const loadAntiCrash = () => {
  // 1. Promesas rechazadas no manejadas (El error más común)
  process.on("unhandledRejection", (reason: any, promise) => {
    console.log("🚨 [AntiCrash] Unhandled Rejection/Catch");
    console.log(reason);

    // Enviamos el reporte
    sendErrorLog("Unhandled Rejection", reason);
  });

  // 2. Excepciones no capturadas (Código roto crítico)
  process.on("uncaughtException", (err, origin) => {
    console.log("🚨 [AntiCrash] Uncaught Exception/Catch");
    console.log(err, origin);

    sendErrorLog("Uncaught Exception", err);
  });

  // 3. Monitoreo de excepciones (Opcional, pero útil)
  process.on("uncaughtExceptionMonitor", (err, origin) => {
    console.log("🚨 [AntiCrash] Uncaught Exception Monitor");
    console.log(err, origin);
  });
};

function sendErrorLog(type: string, error: any) {
  if (!webhook) return; // Si no hay webhook, solo queda en consola

  const errString =
    (error instanceof Error ? error.stack : String(error)) ||
    "Error sin detalles";

  const embed = new EmbedBuilder()
    .setTitle(`💀 Error Crítico: ${type}`)
    .setDescription(`\`\`\`js\n${errString.substring(0, 4000)}\n\`\`\``)
    .setColor(0xff0000)
    .setTimestamp();

  webhook
    .send({ embeds: [embed] })
    .catch(() => console.error("No se pudo enviar el log al webhook"));
}
