import { Events, VoiceState, EmbedBuilder } from "discord.js";
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

    let title: string;
    let color: number;
    let description: string;

    if (!oldChannel && newChannel) {
      // 🟢 Entró a un canal de voz
      title = "🎙️ Entró a voz";
      color = 0x57f287; // verde
      description = `**${member.user.tag}** entró a **${newChannel.name}**`;
    } else if (oldChannel && !newChannel) {
      // 🔴 Salió de un canal de voz
      title = "🔇 Salió de voz";
      color = 0xff6b6b; // rojo
      description = `**${member.user.tag}** salió de **${oldChannel.name}**`;
    } else if (oldChannel && newChannel) {
      // 🔄 Cambió de canal
      title = "🔀 Cambió de canal";
      color = 0xffa500; // naranja
      description = `**${member.user.tag}** se movió de **${oldChannel.name}** → **${newChannel.name}**`;
    } else {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields({
        name: "Usuario",
        value: `${member.user.tag} \`(${member.user.id})\``,
        inline: true,
      })
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Voice Log" });

    await HoshikoLogger.sendToChannel(guild, "voicelog", embed);
  },
};
