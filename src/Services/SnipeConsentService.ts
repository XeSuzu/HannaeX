import {
  Guild,
  TextChannel,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { SettingsManager } from "../Database/SettingsManager";

export const buildSnipeNoticeEmbed = (guildName: string) =>
  new EmbedBuilder()
    .setColor(0xff8fab)
    .setTitle("🕵️ Aviso de Privacidad — Sistema Snipe")
    .setDescription(
      `**${guildName}** tiene activado el comando \`/snipe\`.\n\n` +
      "**¿Qué significa esto?**\n" +
      "› Cuando borras un mensaje, Hoshiko lo guarda temporalmente.\n" +
      "› Cualquier miembro puede verlo con `/snipe` durante **1 hora**.\n" +
      "› Pasada 1 hora se elimina automáticamente y de forma permanente.\n" +
      "› No se comparte fuera de este servidor.\n\n" +
      "**¿No quieres que tus mensajes sean visibles?**\n" +
      "› Evita borrar mensajes o contacta a un administrador.\n\n" +
      "*Al permanecer en este servidor aceptas este funcionamiento.*",
    )
    .setFooter({ text: "Hoshiko • Aviso de Privacidad • Cumple con los ToS de Discord" })
    .setTimestamp();

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
