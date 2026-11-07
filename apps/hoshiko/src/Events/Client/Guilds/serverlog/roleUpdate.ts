import { AuditLogEvent, Events, Role, EmbedBuilder } from "discord.js";
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

    if (
      oldRole.permissions &&
      newRole.permissions &&
      oldRole.permissions.bitfield !== newRole.permissions.bitfield
    ) {
      const added = newRole.permissions.missing(oldRole.permissions);
      const removed = oldRole.permissions.missing(newRole.permissions);
      if (added.length > 0) {
        changes.push(`**Permisos concedidos:** \`${added.slice(0, 8).join("`, `")}\``);
      }
      if (removed.length > 0) {
        changes.push(`**Permisos revocados:** \`${removed.slice(0, 8).join("`, `")}\``);
      }
    }

    if (changes.length === 0) return;

    const executor = await HoshikoLogger.fetchAuditExecutor(
      newRole.guild,
      AuditLogEvent.RoleUpdate,
      newRole.id,
    );

    const embed = new EmbedBuilder()
      .setTitle("✏️ Rol modificado")
      .setColor(newRole.color || 0xfaa61a)
      .addFields(
        { name: "Rol", value: `<@&${newRole.id}> (\`${newRole.name}\`)`, inline: true },
        {
          name: "Responsable",
          value: executor
            ? `<@${executor.id}> (\`${executor.tag}\`)`
            : "Actor no disponible",
          inline: true,
        },
        { name: "Cambios", value: changes.join("\n"), inline: false },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    await HoshikoLogger.sendToChannel(newRole.guild, "serverlog", embed);
  },
};
