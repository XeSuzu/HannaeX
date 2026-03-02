import { Events, Role, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
}

export default {
  name: Events.GuildRoleUpdate,
  async execute(oldRole: Role, newRole: Role, client: any): Promise<void> {
    const changes: string[] = [];

    if (oldRole.name !== newRole.name)
      changes.push(`**Nombre:** \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color)
      changes.push(`**Color:** \`${toHex(oldRole.color)}\` → \`${toHex(newRole.color)}\``);
    if (oldRole.hoist !== newRole.hoist)
      changes.push(`**Separador:** ${oldRole.hoist ? "Sí" : "No"} → ${newRole.hoist ? "Sí" : "No"}`);
    if (oldRole.mentionable !== newRole.mentionable)
      changes.push(`**Mencionable:** ${oldRole.mentionable ? "Sí" : "No"} → ${newRole.mentionable ? "Sí" : "No"}`);

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle("✏️ Rol Modificado")
      .setColor(newRole.color || 0xffa500)
      .addFields(
        { name: "Rol", value: `${newRole.name} \`(${newRole.id})\``, inline: true },
        { name: "Cambios", value: changes.join("\n") }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Server Log" });

    await HoshikoLogger.sendToChannel(newRole.guild, "serverlog", embed);
  },
};
