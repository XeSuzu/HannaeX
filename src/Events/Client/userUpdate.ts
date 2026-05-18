import { Events, User } from "discord.js";
import { AvatarHistoryManager } from "../../Database/AvatarHistoryManager";
import { UserHistoryManager } from "../../Database/UserHistoryManager";

export default {
  name: Events.UserUpdate,
  async execute(oldUser: User, newUser: User, client: any) {
    const hasRelevantChanges =
      oldUser.avatar !== newUser.avatar ||
      oldUser.username !== newUser.username ||
      oldUser.discriminator !== newUser.discriminator;

    if (!hasRelevantChanges) return;

    const avatarUrl = newUser.displayAvatarURL({
      size: 1024,
      extension: newUser.avatar?.startsWith("a_") ? "gif" : "png",
    });
    const bannerUrl = newUser.bannerURL({ size: 1024 });

    const sharedGuilds = client.guilds.cache.filter((guild: any) =>
      guild.members.cache.has(newUser.id),
    );

    if (oldUser.avatar !== newUser.avatar) {
      for (const [, guild] of sharedGuilds) {
        await AvatarHistoryManager.addAvatar(newUser.id, avatarUrl, {
          guildId: guild.id,
          guildName: guild.name,
          source: "guild",
        });
      }
    }

    for (const [, guild] of sharedGuilds) {
      await UserHistoryManager.addUser(newUser.id, {
        username: newUser.username,
        discriminator: newUser.discriminator,
        tag: newUser.tag,
        displayName: newUser.username,
        avatarUrl,
        bannerUrl,
        guildId: guild.id,
        guildName: guild.name,
        source: "guild",
      });
    }
  },
};
