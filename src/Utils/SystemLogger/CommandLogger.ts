import { EmbedBuilder, User } from "discord.js";
import { webhooks } from "./WebhookManager";

export const CommandLogger = {
  async logCommandUsage(user: User, commandName: string, channelName: string) {
    if (!webhooks.cmd) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Command Executed")
        .setColor(0x3498db)
        .setDescription(
          `**${user.tag}** used \`/${commandName}\` in #${channelName}`,
        )
        .setTimestamp();
      await webhooks.cmd.send({ username: "Hoshiko Audit", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error in logCommandUsage:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },

  async logCommandError(
    user: User,
    commandName: string,
    error: string,
    channelName: string,
  ) {
    if (!webhooks.cmd) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Command Error")
        .setColor(0xff9800)
        .addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Command", value: `/${commandName}`, inline: true },
          { name: "Channel", value: `#${channelName}`, inline: true },
          {
            name: "Error",
            value: `\`\`\`${error.slice(0, 1024)}\`\`\``,
            inline: false,
          },
        )
        .setTimestamp();
      await webhooks.cmd.send({ username: "Hoshiko Audit", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error in logCommandError:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },
};
