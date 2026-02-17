import { Message, PermissionFlagsBits } from "discord.js";
import { InfractionManager } from "./InfractionManager";
import { SettingsManager } from "../Database/SettingsManager";

const DEFAULT_ALLOWED = [
  "youtube.com",
  "youtu.be",
  "spotify.com",
  "tenor.com",
  "pinterest.com",
  "giphy.com",
  "google.com",
];

/**
 * Comprueba mensajes para enlaces no permitidos o invitaciones de Discord.
 * - Ignora DMs y miembros con permisos de moderación.
 * - Usa `preloadedSettings` si está disponible; si no, recupera una versión "lite" de la DB.
 * - Devuelve `true` si el mensaje fue gestionado (borrado / sanción registrada).
 */
export async function handleLinkProtection(
  message: Message,
  preloadedSettings?: any,
): Promise<boolean> {
  // Inmunidad: DMs o usuarios con permiso de gestionar mensajes
  if (
    !message.guild ||
    !message.member ||
    message.member.permissions.has(PermissionFlagsBits.ManageMessages)
  )
    return false;

  // Obtener configuración: preferir datos pre-cargados para reducir lecturas a la DB
  let settings = preloadedSettings;
  if (!settings)
    settings = await SettingsManager.getLite(
      message.guild.id,
      "securityModules allowedLinks",
    );
  if (!settings?.securityModules?.antiLinks) return false;

  // Construir whitelist de dominios permitidos
  const customAllowed = settings.allowedLinks || [];
  const allAllowed = [...DEFAULT_ALLOWED, ...customAllowed].map((d) =>
    d.toLowerCase(),
  );

  // Detectar links e invitaciones
  const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  const foundLinks = message.content.match(linkRegex);
  if (!foundLinks) return false;

  const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/i;
  const isInvite = inviteRegex.test(message.content);

  // Determinar si existe algún link fuera de la whitelist
  const isForbidden = foundLinks.some((link) => {
    const lowerLink = link.toLowerCase();
    return !allAllowed.some((domain) => lowerLink.includes(domain));
  });

  // Si hay invitaciones o links no permitidos, eliminar y registrar
  if (isInvite || isForbidden) {
    await message.delete().catch(() => null);

    if (message.channel.isTextBased()) {
      const warning = await (message.channel as any)
        .send(`**${message.author.username}**, enlaces no permitidos.`)
        .catch(() => null);
      if (warning) setTimeout(() => warning.delete().catch(() => null), 5000);
    }

    const reason = isInvite ? "Spam de invitaciones" : "Enlace no autorizado";
    InfractionManager.addPoints(message.member, reason, message).catch((err) =>
      console.error("Error guardando infracción:", err),
    );

    return true;
  }

  return false;
}
