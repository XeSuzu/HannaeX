import { WebhookClient, EmbedBuilder, User } from "discord.js";
import "dotenv/config";

class HoshikoSystemLogger {
  // 🌟 1. Guardamos las instancias de los 4 webhooks
  private sayWebhook: WebhookClient | null = null;
  private cmdWebhook: WebhookClient | null = null;
  private sysWebhook: WebhookClient | null = null;
  private secWebhook: WebhookClient | null = null;

  constructor() {
    // 🌟 2. Leemos las 4 variables de tu .env
    const sayUrl = process.env.SAY_LOGS_WEBHOOK_URL;
    const cmdUrl = process.env.LOG_WEBHOOK_COMMANDS;
    const sysUrl = process.env.LOG_WEBHOOK_SYSTEM;
    const secUrl = process.env.LOG_WEBHOOK_SECURITY;

    // 🌟 3. Conectamos los que estén configurados
    if (sayUrl) this.sayWebhook = new WebhookClient({ url: sayUrl });
    if (cmdUrl) this.cmdWebhook = new WebhookClient({ url: cmdUrl });
    if (sysUrl) this.sysWebhook = new WebhookClient({ url: sysUrl });
    if (secUrl) this.secWebhook = new WebhookClient({ url: secUrl });

    console.log("✅ [Logger] Sistema Multi-Webhooks (4 Canales) inicializado.");
  }

  // ----------------------------------------------------------------
  // 🗣️ 1. LOG DE COMANDO /SAY (Va a SAY_LOGS_WEBHOOK_URL)
  // ----------------------------------------------------------------
  public async logSay(user: User, guildName: string, channelName: string, content: string) {
    if (!this.sayWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🗣️ Se usó el comando /say")
        .setColor("#FF5555")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "👤 Autor", value: `**${user.tag}**\nID: \`${user.id}\``, inline: true },
          { name: "📍 Ubicación", value: `**Server:** ${guildName}\n**Canal:** #${channelName}`, inline: true },
          { name: "💬 Mensaje", value: `\`\`\`${content}\`\`\``, inline: false }
        )
        .setTimestamp();

      await this.sayWebhook.send({
        username: "Hoshiko Echo", // Un nombre chulo para el webhook de say
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log say:", errorMessage);
    }
  }

  // ----------------------------------------------------------------
  // 🚨 2. LOG DE SEGURIDAD (Va a LOG_WEBHOOK_SECURITY)
  // ----------------------------------------------------------------
  public async logSecurityBreach(user: User, commandName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🚨 INTENTO DE ACCESO NO AUTORIZADO")
        .setColor(0xff0000) // ROJO FURIA
        .setDescription(`El usuario **${user.tag}** intentó ejecutar un comando de Dueño.`)
        .addFields(
          { name: "👤 Culpable", value: `\`${user.tag}\` (${user.id})`, inline: true },
          { name: "💻 Comando", value: `\`/${commandName}\``, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await this.secWebhook.send({
        content: `<@${process.env.BOT_OWNER_ID}> ⚠️ **ALERTA DE SEGURIDAD**`,
        username: "Hoshiko Security System",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log security:", errorMessage);
    }
  }

  // ----------------------------------------------------------------
  // 💎 3. LOG DE SISTEMA / TRANSACCIONES (Va a LOG_WEBHOOK_SYSTEM)
  // ----------------------------------------------------------------
  public async logTransaction(admin: User, details: string) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("💎 Gestión Premium Realizada")
        .setColor(0x00ff00) // Verde dinero
        .setDescription(details)
        .setFooter({ text: `Admin: ${admin.tag}`, iconURL: admin.displayAvatarURL() })
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Ventas",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log transaction:", errorMessage);
    }
  }

  // ----------------------------------------------------------------
  // 🎮 4. LOG DE COMANDOS GENERALES (Va a LOG_WEBHOOK_COMMANDS)
  // ----------------------------------------------------------------
  public async logCommandUsage(user: User, commandName: string, channelName: string) {
    if (!this.cmdWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("⚙️ Comando Ejecutado")
        .setColor(0x3498db) // Azul
        .setDescription(`**${user.tag}** usó \`/${commandName}\` en #${channelName}`)
        .setTimestamp();

      await this.cmdWebhook.send({
        username: "Hoshiko Auditoría",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log command usage:", errorMessage);
    }
  }

  public async logCommandError(user: User, commandName: string, error: string, channelName: string) {
    if (!this.cmdWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Error en Comando")
        .setColor(0xff9800) // Naranja
        .addFields(
          { name: "👤 Usuario", value: `${user.tag}`, inline: true },
          { name: "💻 Comando", value: `/${commandName}`, inline: true },
          { name: "📍 Canal", value: `#${channelName}`, inline: true },
          { name: "❌ Error", value: `\`\`\`${error.slice(0, 1024)}\`\`\``, inline: false }
        )
        .setTimestamp();

      await this.cmdWebhook.send({
        username: "Hoshiko Auditoría",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log command error:", errorMessage);
    }
  }

  // ================================================================
  // 🚨 LOGS DE SEGURIDAD - BANEOS, SILENCIAMIENTOS, ETC
  // ================================================================

  public async logBan(moderator: User, targetUser: User, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🔴 Usuario Baneado")
        .setColor(0xff0000) // Rojo puro
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "👤 Baneado", value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
          { name: "🔨 Moderador", value: `${moderator.tag}`, inline: true },
          { name: "📍 Servidor", value: guildName, inline: true },
          { name: "📝 Razón", value: reason || "Sin especificar", inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Seguridad",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log ban:", errorMessage);
    }
  }

  public async logMute(moderator: User, targetUser: User, duration: number, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const durationStr = duration > 0 ? `${(duration / 1000 / 60).toFixed(0)} minutos` : "Permanente";
      
      const embed = new EmbedBuilder()
        .setTitle("🟡 Usuario Silenciado")
        .setColor(0xffa500) // Naranja
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "👤 Silenciado", value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
          { name: "⏱️ Duración", value: durationStr, inline: true },
          { name: "🔨 Moderador", value: `${moderator.tag}`, inline: true },
          { name: "📍 Servidor", value: guildName, inline: true },
          { name: "📝 Razón", value: reason || "Sin especificar", inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Seguridad",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log mute:", errorMessage);
    }
  }

  public async logKick(moderator: User, targetUser: User, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("👢 Usuario Expulsado")
        .setColor(0xff6b6b) // Rojo suave
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "👤 Expulsado", value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
          { name: "🔨 Moderador", value: `${moderator.tag}`, inline: true },
          { name: "📍 Servidor", value: guildName, inline: true },
          { name: "📝 Razón", value: reason || "Sin especificar", inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Seguridad",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log kick:", errorMessage);
    }
  }

  public async logAntiRaid(detectedBots: number, guildName: string, bannedCount: number) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Anti-Raid Activado")
        .setColor(0xf39c12) // Naranja fuerte
        .addFields(
          { name: "🤖 Bots Detectados", value: `${detectedBots}`, inline: true },
          { name: "🔴 Bots Baneados", value: `${bannedCount}`, inline: true },
          { name: "📍 Servidor", value: guildName, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Defensa",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log anti-raid:", errorMessage);
    }
  }

  public async logAntiNuke(suspiciousUsers: string[], guildName: string) {
    if (!this.secWebhook) return;

    try {
      const userList = suspiciousUsers.slice(0, 10).join("\n");
      const embed = new EmbedBuilder()
        .setTitle("💣 Anti-Nuke Detectó Actividad Sospechosa")
        .setColor(0xe74c3c) // Rojo oscuro
        .addFields(
          { name: "👥 Usuarios Sospechosos (Top 10)", value: userList || "Ninguno", inline: false },
          { name: "📍 Servidor", value: guildName, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Defensa",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log anti-nuke:", errorMessage);
    }
  }

  public async logConfessionReported(confessionId: string, reporter: User, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("📋 Confesión Reportada")
        .setColor(0x9b59b6) // Púrpura
        .addFields(
          { name: "📝 ID", value: `\`${confessionId}\``, inline: true },
          { name: "👤 Reportador", value: `${reporter.tag}`, inline: true },
          { name: "❌ Motivo", value: reason, inline: false },
          { name: "📍 Servidor", value: guildName, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Moderación",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log confession reported:", errorMessage);
    }
  }

  public async logBlacklistGlobal(user: User, reason: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🚫 Usuario en Blacklist Global")
        .setColor(0x2c3e50) // Gris oscuro
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "👤 Usuario", value: `${user.tag}\n\`${user.id}\``, inline: true },
          { name: "⏰ Hora", value: new Date().toLocaleString(), inline: true },
          { name: "📝 Razón", value: reason, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Seguridad Global",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log blacklist global:", errorMessage);
    }
  }

  public async logAnomalyDetected(type: string, description: string, serverName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🔔 Anomalía Detectada")
        .setColor(0xe67e22) // Naranja quemado
        .addFields(
          { name: "🎯 Tipo", value: type, inline: true },
          { name: "📍 Servidor", value: serverName, inline: true },
          { name: "📋 Detalles", value: description, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Monitor",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log anomaly:", errorMessage);
    }
  }

  public async logCriticalError(errorType: string, errorMessage: string, stackTrace?: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🔥 Error Crítico")
        .setColor(0xc0392b) // Rojo crítico
        .addFields(
          { name: "⚠️ Tipo", value: errorType, inline: true },
          { name: "⏰ Timestamp", value: new Date().toISOString(), inline: true },
          { name: "💬 Mensaje", value: `\`\`\`${errorMessage.slice(0, 512)}\`\`\`` , inline: false },
          { name: "📍 Stack", value: `\`\`\`${(stackTrace || "N/A").slice(0, 1024)}\`\`\``, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        content: `<@${process.env.BOT_OWNER_ID}> 🔥 **ERROR CRÍTICO DETECTADO**`,
        username: "Hoshiko Emergencia",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log critical:", errorMessage);
    }
  }

  // ================================================================
  // 💎 LOGS DE SISTEMA - TRANSACCIONES, PREMIUM, CONFIG
  // ================================================================

  public async logPremiumActivated(user: User, plan: string, duration: number) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("💎 Premium Activado")
        .setColor(0xf1c40f) // Dorado
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "👤 Usuario", value: `${user.tag}`, inline: true },
          { name: "📦 Plan", value: plan, inline: true },
          { name: "⏰ Duración", value: `${duration} días`, inline: true }
        )
        .setFooter({ text: `Expira: ${new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleDateString()}` })
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Ventas",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log premium activated:", errorMessage);
    }
  }

  public async logPremiumExpired(userId: string, expiryDate: Date) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("⏰ Premium Expirado")
        .setColor(0x95a5a6) // Gris
        .addFields(
          { name: "👤 Usuario ID", value: `\`${userId}\``, inline: true },
          { name: "📅 Fecha Expiración", value: expiryDate.toLocaleDateString(), inline: true }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Ventas",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log premium expired:", errorMessage);
    }
  }

  public async logSetupConfigured(admin: User, serverName: string, changes: Record<string, string>) {
    if (!this.sysWebhook) return;

    try {
      let changesList = "";
      for (const [key, value] of Object.entries(changes)) {
        changesList += `**${key}:** ${value}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle("⚙️ Configuración Actualizada")
        .setColor(0x3498db) // Azul
        .addFields(
          { name: "🛠️ Admin", value: `${admin.tag}`, inline: true },
          { name: "📍 Servidor", value: serverName, inline: true },
          { name: "📝 Cambios", value: changesList || "Ninguno", inline: false }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Admin",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log setup configured:", errorMessage);
    }
  }

  public async logBotRestart(reason: string) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🔄 Bot Reiniciado")
        .setColor(0x2ecc71) // Verde
        .addFields(
          { name: "📝 Razón", value: reason || "Mantenimiento automático", inline: false },
          { name: "⏰ Timestamp", value: new Date().toISOString(), inline: false }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Sistema",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log bot restart:", errorMessage);
    }
  }

  public async logViralMeme(memeAuthor: User, likes: number, serverName: string, memeLink?: string) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🚀 Meme Viral Detectado")
        .setColor(0xe91e63) // Rosa
        .setThumbnail(memeAuthor.displayAvatarURL())
        .addFields(
          { name: "👤 Autor", value: `${memeAuthor.tag}`, inline: true },
          { name: "❤️ Reacciones", value: `${likes}`, inline: true },
          { name: "📍 Servidor", value: serverName, inline: true },
          { name: "🔗 Link", value: memeLink || "N/A", inline: false }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Trends",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error log viral meme:", errorMessage);
    }
  }

}

// 🌟 Exportamos LA MISMA instancia para todo el proyecto
export const Logger = new HoshikoSystemLogger();