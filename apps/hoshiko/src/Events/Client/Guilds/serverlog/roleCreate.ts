import { AuditLogEvent, Events, Role, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
}

export default {
  name: Events.GuildRoleCreate,
  async execute(role: Role, client: any): Promise<void> {
    const executor = await HoshikoLogger.fetchAuditExecutor(
      role.guild,
      AuditLogEvent.RoleCreate,
      role.id,
    );

    const embed = new EmbedBuilder()
      .setTitle("✨ Rol creado")
      .setColor(role.color || 0x57f287)
      .addFields(
        { name: "Rol", value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
        { name: "Color", value: toHex(role.color), inline: true },
        {
          name: "Responsable",
          value: executor
            ? `<@${executor.id}> (\`${executor.tag}\`)`
            : "Actor no disponible",
          inline: true,
        },
        { name: "Mencionable", value: role.mentionable ? "Sí" : "No", inline: true },
        { name: "Separador (hoist)", value: role.hoist ? "Sí" : "No", inline: true },
        { name: "ID", value: `\`${role.id}\``, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    await HoshikoLogger.sendToChannel(role.guild, "serverlog", embed);
  },
};
