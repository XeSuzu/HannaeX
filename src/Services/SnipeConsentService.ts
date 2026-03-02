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

    const settings = await SettingsManager.getSettings(guild.id);
    const prefix = settings?.prefix || "x";

    const embed = new EmbedBuilder()
      .setColor(0xffb347)
      .setTitle("🌸 ¡Ups! Se te cayó un mensaje")
      .setDescription(
        `¡Oye! Acabas de borrar un mensaje en **${guild.name}**, pero que sepas que tengo buena memoria, nya~\n\n` +
          "Tu mensaje se ha guardado temporalmente y **puede ser visto por otros durante 1 hora** usando:\n" +
          `> • \`/snipe\` (Comando Slash)\n` +
          `> • \`${prefix}snipe\` (Comando de texto)\n` +
          `> • \`hoshi snipe\`\n\n` +
          "Después de una hora, lo olvidaré por completo, ¡lo prometo! ✨",
      )
      .setFooter({ text: "Solo recibirás este aviso una vez por servidor. | Hoshiko" })
      .setTimestamp();

    // Enviar mensaje efímero (se borra automáticamente después de 15 segundos)
    const msg = await channel.send({ content: `<@${userId}>`, embeds: [embed] });
    if (msg) setTimeout(() => msg.delete().catch(() => {}), 15000);
  } catch {
    // Sin permisos — ignorar
  }
}
