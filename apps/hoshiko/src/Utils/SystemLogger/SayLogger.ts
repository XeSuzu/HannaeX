import { EmbedBuilder, User } from "discord.js";
import { webhooks } from "./WebhookManager";

export const SayLogger = {
  async logSay(
    user: User,
    guildName: string,
    channelName: string,
    content: string,
  ) {
    if (!webhooks.say) return;
    try {
      const embed = new EmbedBuilder()
        .setTitle("Command Used: /say")
        .setColor("#FF5555")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          {
            name: "User",
            value: `**${user.tag}**\nID: \`${user.id}\``,
            inline: true,
          },
          {
            name: "Location",
            value: `**Server:** ${guildName}\n**Channel:** #${channelName}`,
            inline: true,
          },
          { name: "Content", value: `\`\`\`${content}\`\`\``, inline: false },
        )
        .setTimestamp();
      await webhooks.say.send({ username: "Hoshiko Echo", embeds: [embed] });
    } catch (e) {
      console.error(
        "Error in logSay:",
        e instanceof Error ? e.message : String(e),
      );
    }
  },
};
