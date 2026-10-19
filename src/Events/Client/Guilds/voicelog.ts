import { Events, VoiceState, EmbedBuilder } from "discord.js";
import { checkVoiceThrashing } from "../../../Features/automod/automodState";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState, client: any): Promise<void> {
    // Ignoramos bots
    if (newState.member?.user.bot) return;

    const member = newState.member ?? oldState.member;
    if (!member) return;

    const guild = newState.guild;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    // Sin cambio de canal (mute/deafen/etc) — ignorar
    if (oldChannel?.id === newChannel?.id) return;

    // Entropía de Acción: detectar saltos frenéticos de canal de voz (VC Thrashing)
    if (newChannel) {
      const thrash = await checkVoiceThrashing(guild.id, member.id);
      if (thrash.triggered) {
        await HoshikoLogger.sendLog(
          guild,
          "AUTOMOD",
          `🎙️ **VC Thrashing detectado:** <@${member.id}> cambió de canal de voz 4+ veces en menos de 15s (\`+${thrash.stressAdded} pts de estrés\`).`,
          member.user,
        );
      }
    }

    let title: string;
    let color: number;
    let description: string;
    const channelFields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (!oldChannel && newChannel) {
      // 🟢 Entró a un canal de voz
      title = "🎙️ Conexión a Voz";
      color = 0x57f287; // verde
      description = `<@${member.id}> se conectó a <#${newChannel.id}>`;
      channelFields.push({ name: "🔊 Canal", value: `<#${newChannel.id}>\n\`${newChannel.name}\``, inline: true });
    } else if (oldChannel && !newChannel) {
      // 🔴 Salió de un canal de voz
      title = "🔇 Desconexión de Voz";
      color = 0xff6b6b; // rojo
      description = `<@${member.id}> se desconectó de <#${oldChannel.id}>`;
      channelFields.push({ name: "🔊 Canal", value: `<#${oldChannel.id}>\n\`${oldChannel.name}\``, inline: true });
    } else if (oldChannel && newChannel) {
      // 🔄 Cambió de canal
      title = "🔀 Cambio de Canal de Voz";
      color = 0xffa500; // naranja
      description = `<@${member.id}> se movió de <#${oldChannel.id}> ➔ <#${newChannel.id}>`;
      channelFields.push(
        { name: "🔊 Canal Anterior", value: `<#${oldChannel.id}>\n\`${oldChannel.name}\``, inline: true },
        { name: "🔊 Canal Nuevo", value: `<#${newChannel.id}>\n\`${newChannel.name}\``, inline: true },
      );
    } else {
      return;
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL(),
      })
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "👤 Usuario",
          value: `<@${member.id}>\n\`${member.user.tag}\``,
          inline: true,
        },
        ...channelFields,
        {
          name: "🆔 ID de Usuario",
          value: `\`${member.id}\``,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Voice Log" });

    await HoshikoLogger.sendToChannel(guild, "voicelog", embed);
  },
};
