import { AuditLogEvent, Events, Guild, EmbedBuilder } from "discord.js";
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

    const executor = await HoshikoLogger.fetchAuditExecutor(
      newGuild,
      AuditLogEvent.GuildUpdate,
    );

    const embed = new EmbedBuilder()
      .setTitle("🏠 Servidor modificado")
      .setColor(0x5865f2)
      .addFields(
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

    if (newGuild.iconURL()) embed.setThumbnail(newGuild.iconURL());

    await HoshikoLogger.sendToChannel(newGuild, "serverlog", embed);
  },
};
