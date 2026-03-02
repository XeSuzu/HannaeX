import { Events, GuildChannel, EmbedBuilder, TextChannel, VoiceChannel } from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.ChannelUpdate,
  async execute(oldChannel: GuildChannel, newChannel: GuildChannel, client: any): Promise<void> {
    const changes: string[] = [];

    if (oldChannel.name !== newChannel.name)
      changes.push(`**Nombre:** \`${oldChannel.name}\` → \`${newChannel.name}\``);

    if (oldChannel.parent?.id !== newChannel.parent?.id)
      changes.push(`**Categoría:** \`${oldChannel.parent?.name ?? "Ninguna"}\` → \`${newChannel.parent?.name ?? "Ninguna"}\``);

    // Topic — solo en canales de texto
    const oldTopic = (oldChannel as TextChannel).topic ?? null;
    const newTopic = (newChannel as TextChannel).topic ?? null;
    if (oldTopic !== newTopic)
      changes.push(`**Topic:** \`${oldTopic ?? "vacío"}\` → \`${newTopic ?? "vacío"}\``);

    // Slowmode — solo en canales de texto
    const oldSlowmode = (oldChannel as TextChannel).rateLimitPerUser ?? 0;
    const newSlowmode = (newChannel as TextChannel).rateLimitPerUser ?? 0;
    if (oldSlowmode !== newSlowmode)
      changes.push(`**Slowmode:** \`${oldSlowmode}s\` → \`${newSlowmode}s\``);

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle("✏️ Canal Modificado")
      .setColor(0xffa500)
      .addFields(
        { name: "Canal", value: `<#${newChannel.id}> \`(${newChannel.id})\``, inline: true },
        { name: "Cambios", value: changes.join("\n") }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Server Log" });

    await HoshikoLogger.sendToChannel(newChannel.guild, "serverlog", embed);
  },
};
