import { WebhookClient, EmbedBuilder, User } from "discord.js";

// URL del webhook para logs del sistema (puede usarse para diferentes tipos de logs)
const systemWebhookUrl = process.env.SYSTEM_LOGS_WEBHOOK_URL;
// const sayWebhookUrl = process.env.SAY_LOGS_WEBHOOK_URL; // Si quieres separarlos

export const Logger = {
  // ----------------------------------------------------------------
  // 1. LOG DE COMANDO /SAY (El que hicimos antes)
  // ----------------------------------------------------------------
  async logSay(
    user: User,
    guildName: string,
    channelName: string,
    content: string,
  ) {
    if (!systemWebhookUrl) return;

    try {
      const webhook = new WebhookClient({ url: systemWebhookUrl });
      const embed = new EmbedBuilder()
        .setTitle("🗣️ Se usó el comando /say")
        .setColor("#FF5555")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          {
            name: "👤 Autor",
            value: `**${user.tag}**\nID: \`${user.id}\``,
            inline: true,
          },
          {
            name: "📍 Ubicación",
            value: `**Server:** ${guildName}\n**Canal:** #${channelName}`,
            inline: true,
          },
          {
            name: "💬 Mensaje",
            value: `\`\`\`${content}\`\`\``,
            inline: false,
          },
        )
        .setTimestamp();

      await webhook.send({
        username: "Hoshiko Auditoría",
        embeds: [embed],
      });
    } catch (e) {
      console.error("Error log say", e);
    }
  },

  // ----------------------------------------------------------------
  // 2. Log de seguridad: notifica intentos de acceso no autorizados
  // ----------------------------------------------------------------
  async logSecurityBreach(user: User, commandName: string) {
    if (!systemWebhookUrl) return;

    try {
      const webhook = new WebhookClient({ url: systemWebhookUrl });
      const embed = new EmbedBuilder()
        .setTitle("🚨 INTENTO DE ACCESO NO AUTORIZADO")
        .setColor(0xff0000) // ROJO FURIA
        .setDescription(
          `El usuario **${user.tag}** intentó ejecutar un comando de Dueño.`,
        )
        .addFields(
          {
            name: "👤 Culpable",
            value: `\`${user.tag}\` (${user.id})`,
            inline: true,
          },
          { name: "💻 Comando", value: `\`/${commandName}\``, inline: true },
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      // Enviamos mención al dueño fuera del embed para que notifique
      await webhook.send({
        content: `<@${process.env.BOT_OWNER_ID}> ⚠️ **ALERTA DE SEGURIDAD**`,
        username: "Hoshiko Security System",
        embeds: [embed],
      });
    } catch (e) {
      console.error("Error log security", e);
    }
  },

  // ----------------------------------------------------------------
  // 3. Log de transacciones relacionadas con premium
  // ----------------------------------------------------------------
  async logTransaction(admin: User, details: string) {
    if (!systemWebhookUrl) return;

    try {
      const webhook = new WebhookClient({ url: systemWebhookUrl });
      const embed = new EmbedBuilder()
        .setTitle("💎 Gestión Premium Realizada")
        .setColor(0x00ff00) // Verde dinero
        .setDescription(details)
        .setFooter({
          text: `Admin: ${admin.tag}`,
          iconURL: admin.displayAvatarURL(),
        })
        .setTimestamp();

      await webhook.send({
        username: "Hoshiko Ventas",
        embeds: [embed],
      });
    } catch (e) {
      console.error("Error log transaction", e);
    }
  },
};
