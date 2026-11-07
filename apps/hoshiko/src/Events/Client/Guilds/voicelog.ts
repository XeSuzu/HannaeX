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

    let title: string | null = null;
    let color = 0x5865f2;
    let actionLabel = "";
    const channelFields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (oldChannel?.id !== newChannel?.id) {
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

      if (!oldChannel && newChannel) {
        title = "🎙️ Entrada a canal de voz";
        color = 0x57f287;
        actionLabel = "Conexión a voz";
        channelFields.push({
          name: "Canal",
          value: `<#${newChannel.id}> (\`${newChannel.name}\`)`,
          inline: true,
        });
      } else if (oldChannel && !newChannel) {
        title = "🔇 Salida de canal de voz";
        color = 0xed4245;
        actionLabel = "Desconexión de voz";
        channelFields.push({
          name: "Canal",
          value: `<#${oldChannel.id}> (\`${oldChannel.name}\`)`,
          inline: true,
        });
      } else if (oldChannel && newChannel) {
        title = "🔀 Cambio de canal de voz";
        color = 0xfaa61a;
        actionLabel = "Cambio de canal";
        channelFields.push(
          {
            name: "Canal de origen",
            value: `<#${oldChannel.id}> (\`${oldChannel.name}\`)`,
            inline: true,
          },
          {
            name: "Canal de destino",
            value: `<#${newChannel.id}> (\`${newChannel.name}\`)`,
            inline: true,
          },
        );
      }
    } else if (newChannel) {
      const currentChannelField = {
        name: "Canal",
        value: `<#${newChannel.id}> (\`${newChannel.name}\`)`,
        inline: true,
      };

      if (Boolean(oldState.serverMute) !== Boolean(newState.serverMute)) {
        title = newState.serverMute
          ? "🔇 Silenciado de servidor (Voz)"
          : "🔊 Silencio de servidor retirado (Voz)";
        color = newState.serverMute ? 0xed4245 : 0x57f287;
        actionLabel = newState.serverMute ? "Mute de servidor" : "Unmute de servidor";
        channelFields.push(currentChannelField);
      } else if (Boolean(oldState.serverDeaf) !== Boolean(newState.serverDeaf)) {
        title = newState.serverDeaf
          ? "🙉 Ensordecido de servidor (Voz)"
          : "🎧 Ensordecimiento de servidor retirado (Voz)";
        color = newState.serverDeaf ? 0xed4245 : 0x57f287;
        actionLabel = newState.serverDeaf ? "Deafen de servidor" : "Undeafen de servidor";
        channelFields.push(currentChannelField);
      } else if (Boolean(oldState.selfMute) !== Boolean(newState.selfMute)) {
        title = newState.selfMute ? "🎙️ Micrófono silenciado" : "🎙️ Micrófono activado";
        color = 0x5865f2;
        actionLabel = newState.selfMute ? "Mute propio" : "Unmute propio";
        channelFields.push(currentChannelField);
      } else if (Boolean(oldState.selfDeaf) !== Boolean(newState.selfDeaf)) {
        title = newState.selfDeaf ? "🎧 Audio ensordecido" : "🎧 Audio reactivado";
        color = 0x5865f2;
        actionLabel = newState.selfDeaf ? "Deafen propio" : "Undeafen propio";
        channelFields.push(currentChannelField);
      } else if (Boolean(oldState.selfVideo) !== Boolean(newState.selfVideo)) {
        title = newState.selfVideo ? "📹 Cámara encendida" : "📹 Cámara apagada";
        color = 0x5865f2;
        actionLabel = newState.selfVideo ? "Cámara activada" : "Cámara desactivada";
        channelFields.push(currentChannelField);
      } else if (Boolean(oldState.streaming) !== Boolean(newState.streaming)) {
        title = newState.streaming
          ? "🖥️ Transmisión iniciada"
          : "🖥️ Transmisión finalizada";
        color = 0x5865f2;
        actionLabel = newState.streaming
          ? "Inicio de pantalla compartida"
          : "Fin de pantalla compartida";
        channelFields.push(currentChannelField);
      }
    }

    if (!title) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "Usuario",
          value: `<@${member.id}> (\`${member.user.tag}\`)`,
          inline: true,
        },
        {
          name: "Acción",
          value: actionLabel,
          inline: true,
        },
        ...channelFields,
        {
          name: "ID de usuario",
          value: `\`${member.id}\``,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    await HoshikoLogger.sendToChannel(guild, "voicelog", embed);
  },
};
