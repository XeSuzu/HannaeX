import { WebhookClient, EmbedBuilder, User } from "discord.js";

/**
 * Centralized logging system with multiple webhook channels.
 * Supports separate channels for: command usage, system events, security alerts, and say logs.
 */
class HoshikoSystemLogger {
  // Webhook instances for different log channels
  private sayWebhook: WebhookClient | null = null;
  private cmdWebhook: WebhookClient | null = null;
  private sysWebhook: WebhookClient | null = null;
  private secWebhook: WebhookClient | null = null;

  constructor() {
    // Initialize webhooks from environment variables
    const sayUrl = process.env.SAY_LOGS_WEBHOOK_URL;
    const cmdUrl = process.env.LOG_WEBHOOK_COMMANDS;
    const sysUrl = process.env.LOG_WEBHOOK_SYSTEM;
    const secUrl = process.env.LOG_WEBHOOK_SECURITY;

    if (sayUrl) this.sayWebhook = new WebhookClient({ url: sayUrl });
    if (cmdUrl) this.cmdWebhook = new WebhookClient({ url: cmdUrl });
    if (sysUrl) this.sysWebhook = new WebhookClient({ url: sysUrl });
    if (secUrl) this.secWebhook = new WebhookClient({ url: secUrl });

    console.log("[Logger] Multi-webhook system initialized.");
  }

  /**
   * Logs usage of the /say command.
   */
  public async logSay(user: User, guildName: string, channelName: string, content: string) {
    if (!this.sayWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Command Used: /say")
        .setColor("#FF5555")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "User", value: `**${user.tag}**\nID: \`${user.id}\``, inline: true },
          { name: "Location", value: `**Server:** ${guildName}\n**Channel:** #${channelName}`, inline: true },
          { name: "Content", value: `\`\`\`${content}\`\`\``, inline: false }
        )
        .setTimestamp();

      await this.sayWebhook.send({
        username: "Hoshiko Echo",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logSay:", errorMessage);
    }
  }

  /**
   * Logs security breaches (unauthorized access to owner commands).
   */
  public async logSecurityBreach(user: User, commandName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("UNAUTHORIZED ACCESS ATTEMPT")
        .setColor(0xff0000)
        .setDescription(`User **${user.tag}** attempted to execute an owner command.`)
        .addFields(
          { name: "User", value: `\`${user.tag}\` (${user.id})`, inline: true },
          { name: "Command", value: `\`/${commandName}\``, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await this.secWebhook.send({
        content: `<@${process.env.BOT_OWNER_ID}> ALERT: Unauthorized access attempt`,
        username: "Hoshiko Security System",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logSecurityBreach:", errorMessage);
    }
  }

  /**
   * Logs premium-related transactions.
   */
  public async logTransaction(admin: User, details: string) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Premium Transaction")
        .setColor(0x00ff00)
        .setDescription(details)
        .setFooter({ text: `Admin: ${admin.tag}`, iconURL: admin.displayAvatarURL() })
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Sales",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logTransaction:", errorMessage);
    }
  }

  /**
   * Logs general command usage.
   */
  public async logCommandUsage(user: User, commandName: string, channelName: string) {
    if (!this.cmdWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Command Executed")
        .setColor(0x3498db)
        .setDescription(`**${user.tag}** used \`/${commandName}\` in #${channelName}`)
        .setTimestamp();

      await this.cmdWebhook.send({
        username: "Hoshiko Audit",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logCommandUsage:", errorMessage);
    }
  }

  /**
   * Logs command execution errors.
   */
  public async logCommandError(user: User, commandName: string, error: string, channelName: string) {
    if (!this.cmdWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Command Error")
        .setColor(0xff9800)
        .addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Command", value: `/${commandName}`, inline: true },
          { name: "Channel", value: `#${channelName}`, inline: true },
          { name: "Error", value: `\`\`\`${error.slice(0, 1024)}\`\`\``, inline: false }
        )
        .setTimestamp();

      await this.cmdWebhook.send({
        username: "Hoshiko Audit",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logCommandError:", errorMessage);
    }
  }

  /**
   * Logs user ban actions.
   */
  public async logBan(moderator: User, targetUser: User, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("User Banned")
        .setColor(0xff0000)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "Target", value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
          { name: "Moderator", value: `${moderator.tag}`, inline: true },
          { name: "Server", value: guildName, inline: true },
          { name: "Reason", value: reason || "Not specified", inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Security",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logBan:", errorMessage);
    }
  }

  /**
   * Logs user mute actions.
   */
  public async logMute(moderator: User, targetUser: User, duration: number, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const durationStr = duration > 0 ? `${(duration / 1000 / 60).toFixed(0)} minutes` : "Permanent";

      const embed = new EmbedBuilder()
        .setTitle("User Muted")
        .setColor(0xffa500)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "Target", value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
          { name: "Duration", value: durationStr, inline: true },
          { name: "Moderator", value: `${moderator.tag}`, inline: true },
          { name: "Server", value: guildName, inline: true },
          { name: "Reason", value: reason || "Not specified", inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Security",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logMute:", errorMessage);
    }
  }

  /**
   * Logs user kick actions.
   */
  public async logKick(moderator: User, targetUser: User, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("User Kicked")
        .setColor(0xff6b6b)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "Target", value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
          { name: "Moderator", value: `${moderator.tag}`, inline: true },
          { name: "Server", value: guildName, inline: true },
          { name: "Reason", value: reason || "Not specified", inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Security",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logKick:", errorMessage);
    }
  }

  /**
   * Logs anti-raid system activations.
   */
  public async logAntiRaid(detectedBots: number, guildName: string, bannedCount: number) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Anti-Raid Activated")
        .setColor(0xf39c12)
        .addFields(
          { name: "Bots Detected", value: `${detectedBots}`, inline: true },
          { name: "Bots Banned", value: `${bannedCount}`, inline: true },
          { name: "Server", value: guildName, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Defense",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logAntiRaid:", errorMessage);
    }
  }

  /**
   * Logs anti-nuke detections.
   */
  public async logAntiNuke(suspiciousUsers: string[], guildName: string) {
    if (!this.secWebhook) return;

    try {
      const userList = suspiciousUsers.slice(0, 10).join("\n");
      const embed = new EmbedBuilder()
        .setTitle("Anti-Nuke: Suspicious Activity Detected")
        .setColor(0xe74c3c)
        .addFields(
          { name: "Suspicious Users (Top 10)", value: userList || "None", inline: false },
          { name: "Server", value: guildName, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Defense",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logAntiNuke:", errorMessage);
    }
  }

  /**
   * Logs reported confessions.
   */
  public async logConfessionReported(confessionId: string, reporter: User, reason: string, guildName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Confession Reported")
        .setColor(0x9b59b6)
        .addFields(
          { name: "Confession ID", value: `\`${confessionId}\``, inline: true },
          { name: "Reporter", value: `${reporter.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Server", value: guildName, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Moderation",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logConfessionReported:", errorMessage);
    }
  }

  /**
   * Logs global blacklist additions.
   */
  public async logBlacklistGlobal(user: User, reason: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("User Added to Global Blacklist")
        .setColor(0x2c3e50)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${user.tag}\n\`${user.id}\``, inline: true },
          { name: "Time", value: new Date().toLocaleString(), inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Global Security",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logBlacklistGlobal:", errorMessage);
    }
  }

  /**
   * Logs detected anomalies.
   */
  public async logAnomalyDetected(type: string, description: string, serverName: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Anomaly Detected")
        .setColor(0xe67e22)
        .addFields(
          { name: "Type", value: type, inline: true },
          { name: "Server", value: serverName, inline: true },
          { name: "Details", value: description, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        username: "Hoshiko Monitor",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logAnomaly:", errorMessage);
    }
  }

  /**
   * Logs critical errors to the security webhook.
   */
  public async logCriticalError(errorType: string, errorMessage: string, stackTrace?: string) {
    if (!this.secWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Critical Error")
        .setColor(0xc0392b)
        .addFields(
          { name: "Type", value: errorType, inline: true },
          { name: "Timestamp", value: new Date().toISOString(), inline: true },
          { name: "Message", value: `\`\`\`${errorMessage.slice(0, 512)}\`\`\``, inline: false },
          { name: "Stack Trace", value: `\`\`\`${(stackTrace || "N/A").slice(0, 1024)}\`\`\``, inline: false }
        )
        .setTimestamp();

      await this.secWebhook.send({
        content: `<@${process.env.BOT_OWNER_ID}> CRITICAL ERROR DETECTED`,
        username: "Hoshiko Emergency",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logCritical:", errorMessage);
    }
  }

  /**
   * Logs premium activation events.
   */
  public async logPremiumActivated(user: User, plan: string, duration: number) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Premium Activated")
        .setColor(0xf1c40f)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Plan", value: plan, inline: true },
          { name: "Duration", value: `${duration} days`, inline: true }
        )
        .setFooter({ text: `Expires: ${new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleDateString()}` })
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Sales",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logPremiumActivated:", errorMessage);
    }
  }

  /**
   * Logs premium expiration events.
   */
  public async logPremiumExpired(userId: string, expiryDate: Date) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Premium Expired")
        .setColor(0x95a5a6)
        .addFields(
          { name: "User ID", value: `\`${userId}\``, inline: true },
          { name: "Expiry Date", value: expiryDate.toLocaleDateString(), inline: true }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Sales",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logPremiumExpired:", errorMessage);
    }
  }

  /**
   * Logs server configuration changes.
   */
  public async logSetupConfigured(admin: User, serverName: string, changes: Record<string, string>) {
    if (!this.sysWebhook) return;

    try {
      let changesList = "";
      for (const [key, value] of Object.entries(changes)) {
        changesList += `**${key}:** ${value}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle("Configuration Updated")
        .setColor(0x3498db)
        .addFields(
          { name: "Admin", value: `${admin.tag}`, inline: true },
          { name: "Server", value: serverName, inline: true },
          { name: "Changes", value: changesList || "None", inline: false }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Admin",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logSetupConfigured:", errorMessage);
    }
  }

  /**
   * Logs bot restart/reboot events.
   */
  public async logBotRestart(reason: string) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Bot Restarted")
        .setColor(0x2ecc71)
        .addFields(
          { name: "Reason", value: reason || "Scheduled maintenance", inline: false },
          { name: "Timestamp", value: new Date().toISOString(), inline: false }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko System",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logBotRestart:", errorMessage);
    }
  }

  /**
   * Logs viral meme detection.
   */
  public async logViralMeme(memeAuthor: User, likes: number, serverName: string, memeLink?: string) {
    if (!this.sysWebhook) return;

    try {
      const embed = new EmbedBuilder()
        .setTitle("Viral Meme Detected")
        .setColor(0xe91e63)
        .setThumbnail(memeAuthor.displayAvatarURL())
        .addFields(
          { name: "Author", value: `${memeAuthor.tag}`, inline: true },
          { name: "Reactions", value: `${likes}`, inline: true },
          { name: "Server", value: serverName, inline: true },
          { name: "Link", value: memeLink || "N/A", inline: false }
        )
        .setTimestamp();

      await this.sysWebhook.send({
        username: "Hoshiko Trends",
        embeds: [embed],
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in logViralMeme:", errorMessage);
    }
  }
}

// Export singleton instance
export const Logger = new HoshikoSystemLogger();
