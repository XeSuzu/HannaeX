import { Events, GuildMember } from "discord.js";
import { AvatarHistoryManager } from "../../../Database/AvatarHistoryManager";

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    if (oldMember.avatar === newMember.avatar) return;

    const avatarUrl = newMember.displayAvatarURL({
      size: 1024,
      extension: newMember.avatar?.startsWith("a_") ? "gif" : "png",
    });

    await AvatarHistoryManager.addAvatar(newMember.id, avatarUrl, {
      guildId: newMember.guild.id,
      guildName: newMember.guild.name,
      source: "guild",
    });
  },
};
