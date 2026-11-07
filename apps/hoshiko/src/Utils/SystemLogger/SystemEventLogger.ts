import { EmbedBuilder, User } from "discord.js";
import { webhooks } from "./WebhookManager";

export const SystemEventLogger = {
  async logTransaction(admin: User, details: string) {
    if (!webhooks.sys) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Premium Transaction")
        .setColor(0x00ff00)
        .setDescription(details)
        .setFooter({
          text: `Admin: ${admin.tag}`,
          iconURL: admin.displayAvatarURL(),
        })
        .setTimestamp();
      await webhooks.sys.send({ username: "Hoshiko Sales", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logTransaction:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logPremiumActivated(user: User, plan: string, duration: number) {
    if (!webhooks.sys) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Premium Activated")
        .setColor(0xf1c40f)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Plan", value: plan, inline: true },
          { name: "Duration", value: `${duration} days`, inline: true },
        )
        .setFooter({
          text: `Expires: ${new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
        })
        .setTimestamp();
      await webhooks.sys.send({ username: "Hoshiko Sales", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logPremiumActivated:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logPremiumExpired(userId: string, expiryDate: Date) {
    if (!webhooks.sys) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Premium Expired")
        .setColor(0x95a5a6)
        .addFields(
          { name: "User ID", value: `\`${userId}\``, inline: true },
          {
            name: "Expiry Date",
            value: expiryDate.toLocaleDateString(),
            inline: true,
          },
        )
        .setTimestamp();
      await webhooks.sys.send({ username: "Hoshiko Sales", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logPremiumExpired:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logSetupConfigured(
    admin: User,
    serverName: string,
    changes: Record<string, string>,
  ) {
    if (!webhooks.sys) return;
    try {
      let changesList = "";
      for (const [key, value] of Object.entries(changes))
        changesList += `**${key}:**${value}\n`;
      const embed = new EmbedBuilder()
        .setTitle("Configuration Updated")
        .setColor(0x3498db)
        .addFields(
          { name: "Admin", value: `${admin.tag}`, inline: true },
          { name: "Server", value: serverName, inline: true },
          { name: "Changes", value: changesList || "None", inline: false },
        )
        .setTimestamp();
      await webhooks.sys.send({ username: "Hoshiko Admin", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logSetupConfigured:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logBotRestart(reason: string) {
    if (!webhooks.sys) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Bot Restarted")
        .setColor(0x2ecc71)
        .addFields(
          {
            name: "Reason",
            value: reason || "Scheduled maintenance",
            inline: false,
          },
          { name: "Timestamp", value: new Date().toISOString(), inline: false },
        )
        .setTimestamp();
      await webhooks.sys.send({ username: "Hoshiko System", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logBotRestart:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logViralMeme(
    memeAuthor: User,
    likes: number,
    serverName: string,
    memeLink?: string,
  ) {
    if (!webhooks.sys) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Viral Meme Detected")
        .setColor(0xe91e63)
        .setThumbnail(memeAuthor.displayAvatarURL())
        .addFields(
          { name: "Author", value: `${memeAuthor.tag}`, inline: true },
          { name: "Reactions", value: `${likes}`, inline: true },
          { name: "Server", value: serverName, inline: true },
          { name: "Link", value: memeLink || "N/A", inline: false },
        )
        .setTimestamp();
      await webhooks.sys.send({ username: "Hoshiko Trends", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error logViralMeme:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },
};
