import { Events, Guild, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildUpdate,
  async execute(oldGuild: Guild, newGuild: Guild, client: any): Promise<void> {
    const changes: string[] = [];

    if (oldGuild.name !== newGuild.name)
      changes.push(`**Nombre:** \`${oldGuild.name}\` → \`${newGuild.name}\``);

    if (oldGuild.icon !== newGuild.icon)
      changes.push(`**Ícono:** ${newGuild.iconURL() ? `[ver nuevo](${newGuild.iconURL()})` : "eliminado"}`);

    if (oldGuild.banner !== newGuild.banner)
      changes.push(`**Banner:** ${newGuild.bannerURL() ? `[ver nuevo](${newGuild.bannerURL()})` : "eliminado"}`);

    if (oldGuild.description !== newGuild.description)
      changes.push(`**Descripción:** \`${oldGuild.description ?? "vacía"}\` → \`${newGuild.description ?? "vacía"}\``);

    if (oldGuild.verificationLevel !== newGuild.verificationLevel)
      changes.push(`**Verificación:** \`${oldGuild.verificationLevel}\` → \`${newGuild.verificationLevel}\``);

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle("🏠 Servidor Modificado")
      .setColor(0x5865f2)
      .addFields({ name: "Cambios", value: changes.join("\n") })
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Server Log" });

    if (newGuild.iconURL()) embed.setThumbnail(newGuild.iconURL());

    await HoshikoLogger.sendToChannel(newGuild, "serverlog", embed);
  },
};
