import { AuditLogEvent, Events, GuildChannel, EmbedBuilder, ChannelType } from "discord.js";
import { SettingsManager } from "../../../../Database/guild/SettingsManager";
import { isServerLockedDown } from "../../../../Features/automod/aiModeration";
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

    // Pilar 4 (Nivel 4): durante El Torniquete se detiene la creación de canales
    if (executor && !executor.bot && executor.id !== channel.guild.ownerId) {
      const settings = await SettingsManager.getSettings(channel.guild.id);
      if (
        settings?.securityModules?.securityLevel === 4 &&
        (await isServerLockedDown(channel.guild.id)) &&
        channel.deletable
      ) {
        await channel
          .delete("Hoshiko Nivel 4: creación de canales bloqueada durante Lockdown")
          .catch(() => null);
        await HoshikoLogger.sendLog(
          channel.guild,
          "SECURITY",
          `🧱 **Canal bloqueado (Lockdown Nvl 4):** \`#${channel.name}\` creado por ${executor.tag} fue eliminado.`,
          executor,
        );
        return;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("📢 Canal Creado")
      .setColor(0x57f287)
      .addFields(
        { name: "Nombre", value: channel.name, inline: true },
        { name: "Tipo", value: getChannelType(channel.type), inline: true },
        { name: "Categoría", value: channel.parent?.name ?? "Sin categoría", inline: true },
        { name: "ID", value: `\`${channel.id}\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Server Log" });

    if (executor) {
      embed.addFields({
        name: "Creado por",
        value: `${executor.tag} \`(${executor.id})\``,
        inline: true,
      });
    }

    await HoshikoLogger.sendToChannel(channel.guild, "serverlog", embed);
  },
};
