// src/Services/SnipeConsentService.ts
import {
  Guild,
  TextChannel,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { SettingsManager } from "../Database/SettingsManager";

// ─────────────────────────────────────────────────────────────────────────────
// EMBED DE AVISO PÚBLICO
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR QUE EL CANAL ES PÚBLICO
// ─────────────────────────────────────────────────────────────────────────────

export function isPublicChannel(channel: TextChannel, guild: Guild): boolean {
  const everyoneRole = guild.roles.everyone;
  const perms = channel.permissionsFor(everyoneRole);
  return perms?.has(PermissionFlagsBits.ViewChannel) ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLICAR AVISO EN CANAL
// ─────────────────────────────────────────────────────────────────────────────

export async function publishSnipeNotice(
  guild: Guild,
  channelId: string,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel || channel.type !== ChannelType.GuildText) {
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

// ─────────────────────────────────────────────────────────────────────────────
// DM AL PRIMER BORRADO
// ─────────────────────────────────────────────────────────────────────────────

export async function sendFirstDeleteDM(
  userId: string,
  guild: Guild,
  client: any,
): Promise<void> {
  try {
    const user = await client.users.fetch(userId);
    if (!user || user.bot) return;

    const embed = new EmbedBuilder()
      .setColor(0xffb347)
      .setTitle("⚠️ Aviso de Snipe")
      .setDescription(
        `Acabas de borrar un mensaje en **${guild.name}**.\n\n` +
        "Este servidor tiene activado el comando `/snipe`, lo que significa que tu mensaje borrado **puede ser visto por otros miembros durante 1 hora**.\n\n" +
        "Pasada 1 hora se elimina automáticamente.\n\n" +
        "*Si no quieres que esto ocurra, contacta a un administrador del servidor.*",
      )
      .setFooter({ text: "Hoshiko • Solo recibirás este aviso una vez por servidor" })
      .setTimestamp();

    await user.send({ embeds: [embed] });
  } catch {
    // Usuario tiene DMs cerrados — ignorar silenciosamente
  }
}