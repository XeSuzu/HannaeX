import { EmbedBuilder, User } from "discord.js";
import { webhooks } from "./WebhookManager";

export const SecurityLogger = {
  async logSecurityBreach(user: User, commandName: string) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("UNAUTHORIZED ACCESS ATTEMPT")
        .setColor(0xff0000)
        .setDescription(
          `User **${user.tag}** attempted to execute an owner command.`,
        )
        .addFields(
          { name: "User", value: `\`${user.tag}\` (${user.id})`, inline: true },
          { name: "Command", value: `\`/${commandName}\``, inline: true },
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      await webhooks.sec.send({
        content: `<@${process.env.BOT_OWNER_ID}> ALERT: Unauthorized access attempt`,
        username: "Hoshiko Security System",
        embeds: [embed],
      });
    } catch (e) {
      console.error(
        "Error logSecurityBreach:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logBan(
    moderator: User,
    targetUser: User,
    reason: string,
    guildName: string,
  ) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("User Banned")
        .setColor(0xff0000)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: "Target",
            value: `${targetUser.tag}\n\`${targetUser.id}\``,
            inline: true,
          },
          { name: "Moderator", value: `${moderator.tag}`, inline: true },
          { name: "Server", value: guildName, inline: true },
          { name: "Reason", value: reason || "Not specified", inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({
        username: "Hoshiko Security",
        embeds: [embed],
      });
    } catch (e) {
      console.error(
        "Error logBan:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logMute(
    moderator: User,
    targetUser: User,
    duration: number,
    reason: string,
    guildName: string,
  ) {
    if (!webhooks.sec) return;
    try {
      const durationStr =
        duration > 0
          ? `${(duration / 1000 / 60).toFixed(0)} minutes`
          : "Permanent";
      const embed = new EmbedBuilder()
        .setTitle("User Muted")
        .setColor(0xffa500)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: "Target",
            value: `${targetUser.tag}\n\`${targetUser.id}\``,
            inline: true,
          },
          { name: "Duration", value: durationStr, inline: true },
          { name: "Moderator", value: `${moderator.tag}`, inline: true },
          { name: "Server", value: guildName, inline: true },
          { name: "Reason", value: reason || "Not specified", inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({
        username: "Hoshiko Security",
        embeds: [embed],
      });
    } catch (e) {
      console.error(
        "Error logMute:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logKick(
    moderator: User,
    targetUser: User,
    reason: string,
    guildName: string,
  ) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("User Kicked")
        .setColor(0xff6b6b)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: "Target",
            value: `${targetUser.tag}\n\`${targetUser.id}\``,
            inline: true,
          },
          { name: "Moderator", value: `${moderator.tag}`, inline: true },
          { name: "Server", value: guildName, inline: true },
          { name: "Reason", value: reason || "Not specified", inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({
        username: "Hoshiko Security",
        embeds: [embed],
      });
    } catch (e) {
      console.error(
        "Error logKick:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logAntiRaid(
    detectedBots: number,
    guildName: string,
    bannedCount: number,
  ) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Anti-Raid Activated")
        .setColor(0xf39c12)
        .addFields(
          { name: "Bots Detected", value: `${detectedBots}`, inline: true },
          { name: "Bots Banned", value: `${bannedCount}`, inline: true },
          { name: "Server", value: guildName, inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({ username: "Hoshiko Defense", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logAntiRaid:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logAntiNuke(suspiciousUsers: string[], guildName: string) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Anti-Nuke: Suspicious Activity Detected")
        .setColor(0xe74c3c)
        .addFields(
          {
            name: "Suspicious Users (Top 10)",
            value: suspiciousUsers.slice(0, 10).join("\n") || "None",
            inline: false,
          },
          { name: "Server", value: guildName, inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({ username: "Hoshiko Defense", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logAntiNuke:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logConfessionReported(
    confessionId: string,
    reporter: User,
    reason: string,
    guildName: string,
  ) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Confession Reported")
        .setColor(0x9b59b6)
        .addFields(
          { name: "Confession ID", value: `\`${confessionId}\``, inline: true },
          { name: "Reporter", value: `${reporter.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Server", value: guildName, inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({
        username: "Hoshiko Moderation",
        embeds: [embed],
      });
    } catch (e) {
      console.error(
        "Error logConfessionReported:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logBlacklistGlobal(user: User, reason: string) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("User Added to Global Blacklist")
        .setColor(0x2c3e50)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${user.tag}\n\`${user.id}\``, inline: true },
          { name: "Time", value: new Date().toLocaleString(), inline: true },
          { name: "Reason", value: reason, inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({
        username: "Hoshiko Global Security",
        embeds: [embed],
      });
    } catch (e) {
      console.error(
        "Error logBlacklistGlobal:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logAnomalyDetected(
    type: string,
    description: string,
    serverName: string,
  ) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Anomaly Detected")
        .setColor(0xe67e22)
        .addFields(
          { name: "Type", value: type, inline: true },
          { name: "Server", value: serverName, inline: true },
          { name: "Details", value: description, inline: false },
        )
        .setTimestamp();
      await webhooks.sec.send({ username: "Hoshiko Monitor", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logAnomaly:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logCriticalError(
    errorType: string,
    errorMessage: string,
    stackTrace?: string,
  ) {
    if (!webhooks.sec) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Critical Error")
        .setColor(0xc0392b)
        .addFields(
          { name: "Type", value: errorType, inline: true },
          { name: "Timestamp", value: new Date().toISOString(), inline: true },
          {
            name: "Message",
            value: `\`\`\`${errorMessage.slice(0, 512)}\`\`\``,
            inline: false,
          },
          {
            name: "Stack Trace",
            value: `\`\`\`${(stackTrace || "N/A").slice(0, 1024)}\`\`\``,
            inline: false,
          },
        )
        .setTimestamp();
      await webhooks.sec.send({
        content: `<@${process.env.BOT_OWNER_ID}> CRITICAL ERROR DETECTED`,
        username: "Hoshiko Emergency",
        embeds: [embed],
      });
    } catch (e) {
      console.error(
        "Error logCritical:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },
};
