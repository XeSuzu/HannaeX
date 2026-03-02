import { Events, GuildMember, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember, client: any): Promise<void> {
    if (member.user.bot) return;

    // Roles que tenía al salir (excluimos @everyone)
    const roles = member.roles.cache
      .filter((r) => r.id !== member.guild.id)
      .map((r) => `\`${r.name}\``)
      .join(", ") || "Ninguno";

    // Tiempo que estuvo en el servidor
    const joinedAt = member.joinedAt;
    const duration = joinedAt
      ? formatDuration(Date.now() - joinedAt.getTime())
      : "Desconocido";

    const embed = new EmbedBuilder()
      .setTitle("👋 Miembro salió del servidor")
      .setColor(0xff6b6b)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "Usuario", value: `${member.user.tag} \`(${member.user.id})\``, inline: true },
        { name: "Tiempo en el servidor", value: duration, inline: true },
        { name: "Roles que tenía", value: roles }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Join Log" });

    await HoshikoLogger.sendToChannel(member.guild, "joinlog", embed);
  },
};

// Helper — convierte ms a texto legible
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
