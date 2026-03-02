import { Events, Role, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
}

export default {
  name: Events.GuildRoleCreate,
  async execute(role: Role, client: any): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("✨ Rol Creado")
      .setColor(role.color || 0x5865f2)
      .addFields(
        { name: "Nombre", value: role.name, inline: true },
        { name: "Color", value: toHex(role.color), inline: true },
        { name: "Mencionable", value: role.mentionable ? "Sí" : "No", inline: true },
        { name: "Separador (hoist)", value: role.hoist ? "Sí" : "No", inline: true },
        { name: "ID", value: `\`${role.id}\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Server Log" });

    await HoshikoLogger.sendToChannel(role.guild, "serverlog", embed);
  },
};
