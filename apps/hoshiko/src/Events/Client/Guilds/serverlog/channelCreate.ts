import { AuditLogEvent, Events, GuildChannel, EmbedBuilder, ChannelType } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

function getChannelType(type: ChannelType): string {
  switch (type) {
    case ChannelType.GuildText: return "Texto";
    case ChannelType.GuildVoice: return "Voz";
    case ChannelType.GuildCategory: return "Categoría";
    case ChannelType.GuildAnnouncement: return "Anuncios";
    case ChannelType.GuildForum: return "Foro";
    case ChannelType.GuildStageVoice: return "Escenario";
    default: return "Otro";
  }
}

export default {
  name: Events.ChannelCreate,
  async execute(channel: GuildChannel, client: any): Promise<void> {
    const executor = await HoshikoLogger.fetchAuditExecutor(
      channel.guild,
      AuditLogEvent.ChannelCreate,
      channel.id,
    );

    const embed = new EmbedBuilder()
      .setTitle("📢 Canal creado")
      .setColor(0x57f287)
      .addFields(
        { name: "Canal", value: `<#${channel.id}> (\`${channel.name}\`)`, inline: true },
        { name: "Tipo", value: getChannelType(channel.type), inline: true },
        { name: "Categoría", value: channel.parent?.name ?? "Sin categoría", inline: true },
        {
          name: "Responsable",
          value: executor
            ? `<@${executor.id}> (\`${executor.tag}\`)`
            : "Actor no disponible",
          inline: true,
        },
        { name: "ID", value: `\`${channel.id}\``, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    await HoshikoLogger.sendToChannel(channel.guild, "serverlog", embed);
  },
};
