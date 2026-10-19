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
