import { Events, GuildChannel, EmbedBuilder, ChannelType } from "discord.js";
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
  name: Events.ChannelDelete,
  async execute(channel: GuildChannel, client: any): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Canal Eliminado")
      .setColor(0xff6b6b)
      .addFields(
        { name: "Nombre", value: channel.name, inline: true },
        { name: "Tipo", value: getChannelType(channel.type), inline: true },
        { name: "Categoría", value: channel.parent?.name ?? "Sin categoría", inline: true },
        { name: "ID", value: `\`${channel.id}\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Server Log" });

    await HoshikoLogger.sendToChannel(channel.guild, "serverlog", embed);
  },
};
