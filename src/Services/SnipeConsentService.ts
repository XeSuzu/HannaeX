import {
  Guild,
  TextChannel,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { SettingsManager } from "../Database/SettingsManager";

export const buildSnipeNoticeEmbed = (guildName: string) => (
  new EmbedBuilder()
    .setColor(0xffb6c1)
    .setTitle("🌸 A veces borrar no basta")
    .setDescription(
      `En **${guildName}** puedo guardar mensajes eliminados durante **1 hora**.\n\n` +
        "Si alguien borra algo… lo recuerdo por un ratito.\n" +
        "Cualquiera puede usar `/snipe` antes de que desaparezca.\n\n" +
        "• 📌 Solo dentro de este servidor.\n" +
        "• ⏳ Se elimina automáticamente tras 1 hora.\n" +
        "• 🙈 Si no quieres que lo lean… mejor no lo borres, ¿sí? nya~\n\n" +
        "*Al quedarte aquí, aceptas este funcionamiento.* ✨",
    )
    .setFooter({ text: "Hoshiko • Privacidad • ToS ✓ ♡" })
    .setTimestamp()
);

export function isPublicChannel(channel: TextChannel, guild: Guild): boolean {
  const everyoneRole = guild.roles.everyone;
  const perms = channel.permissionsFor(everyoneRole);
  return perms?.has(PermissionFlagsBits.ViewChannel) ?? false;
}

export async function publishSnipeNotice(
  guild: Guild,
  channelId: string,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
      return { ok: false, reason: "El canal no existe o no es de texto." };
    }

    if (!isPublicChannel(channel, guild)) {
      return { ok: false, reason: "El canal debe ser público (@everyone debe poder leerlo)." };
    }

    await channel.send({ embeds: [buildSnipeNoticeEmbed(guild.name)] });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "No tengo permisos para escribir en ese canal." };
  }
}

export async function sendFirstDeleteNotice(
  userId: string,
  guild: Guild,
  channelId: string,
  client: any,
): Promise<void> {
  try {
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xffb347)
      .setTitle("⚠️ Aviso de Snipe")
      .setDescription(
        "Este servidor tiene activado el comando `/snipe`, lo que significa que tu mensaje borrado **puede ser visto por otros miembros durante 1 hora**.\n\n" +
        "Pasada 1 hora se elimina automáticamente.\n\n" +
        "*Si no quieres que esto ocurra, contacta a un administrador del servidor.*",
      )
      .setFooter({ text: "Hoshiko • Solo recibirás este aviso una vez por servidor" })
      .setTimestamp();

    await channel.send({ content: `<@${userId}>`, embeds: [embed] });
  } catch {
    // Sin permisos — ignorar
  }
}
