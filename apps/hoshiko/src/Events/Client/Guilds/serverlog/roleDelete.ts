import { AuditLogEvent, Events, Role, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
}

export default {
  name: Events.GuildRoleDelete,
  async execute(role: Role, client: any): Promise<void> {
    const executor = await HoshikoLogger.fetchAuditExecutor(
      role.guild,
      AuditLogEvent.RoleDelete,
      role.id,
    );

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Rol eliminado")
      .setColor(0xed4245)
      .addFields(
        { name: "Nombre", value: `\`${role.name}\``, inline: true },
        { name: "Color", value: toHex(role.color), inline: true },
        {
          name: "Responsable",
          value: executor
            ? `<@${executor.id}> (\`${executor.tag}\`)`
            : "Actor no disponible",
          inline: true,
        },
        { name: "ID", value: `\`${role.id}\``, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    await HoshikoLogger.sendToChannel(role.guild, "serverlog", embed);
  },
};
