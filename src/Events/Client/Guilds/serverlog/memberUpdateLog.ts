import { Events, GuildMember, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember, newMember: GuildMember, client: any): Promise<void> {
    if (newMember.user.bot) return;

    const changes: string[] = [];

    // ─── Nickname ────────────────────────────────────────────────────────────
    if (oldMember.nickname !== newMember.nickname)
      changes.push(
        `**Nickname:** \`${oldMember.nickname ?? "ninguno"}\` → \`${newMember.nickname ?? "ninguno"}\``
      );

    // ─── Roles añadidos ──────────────────────────────────────────────────────
    const addedRoles = newMember.roles.cache
      .filter((r) => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id)
      .map((r) => `\`${r.name}\``);

    if (addedRoles.length > 0)
      changes.push(`**Roles añadidos:** ${addedRoles.join(", ")}`);

    // ─── Roles removidos ─────────────────────────────────────────────────────
    const removedRoles = oldMember.roles.cache
      .filter((r) => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id)
      .map((r) => `\`${r.name}\``);

    if (removedRoles.length > 0)
      changes.push(`**Roles removidos:** ${removedRoles.join(", ")}`);

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle("👤 Miembro Actualizado")
      .setColor(0x5865f2)
      .setThumbnail(newMember.user.displayAvatarURL())
      .addFields(
        {
          name: "Usuario",
          value: `${newMember.user.tag} \`(${newMember.user.id})\``,
          inline: true,
        },
        { name: "Cambios", value: changes.join("\n") }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Server Log" });

    await HoshikoLogger.sendToChannel(newMember.guild, "serverlog", embed);
  },
};
