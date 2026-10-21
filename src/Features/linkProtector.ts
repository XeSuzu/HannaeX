import axios from "axios";
import { Message, PermissionFlagsBits } from "discord.js";
import { SettingsManager } from "../Database/guild/SettingsManager";
import { HoshikoLogger } from "../Security/Logger/HoshikoLogger";
import { addServerStress } from "./automod/automodState";
import { isAllowedByDomain } from "./linkAllowlist";
import { ADMIN_MARKER, markAsAdminMessage } from "./ai/adminMessageTracker";

const DEFAULT_ALLOWED = [
  "youtube.com",
  "youtu.be",
  "spotify.com",
  "tenor.com",
  "pinterest.com",
  "giphy.com",
  "google.com",
];

// Conjunto en memoria O(1) de dominios de phishing conocidos de Discord
const phishingDomains = new Set<string>([
  "discord-nitro.com",
  "dlscord.com",
  "discorcl.com",
  "discordgift.site",
  "steamcomminuty.com",
  "stearncommunity.com",
]);
let lastPhishingSync = 0;
const PHISHING_SYNC_INTERVAL_MS = 1000 * 60 * 60 * 6; // 6 horas

function syncPhishingListInBackground(): void {
  const now = Date.now();
  if (now - lastPhishingSync < PHISHING_SYNC_INTERVAL_MS) return;
  lastPhishingSync = now;

  void axios
    .get<string[]>("https://phish.sinking.yachts/v2/all", {
      timeout: 5000,
      headers: { "X-Identity": "Hoshiko-Discord-Bot" },
    })
    .then((res) => {
      if (Array.isArray(res.data)) {
        for (const domain of res.data) {
          if (typeof domain === "string") {
            phishingDomains.add(domain.toLowerCase());
          }
        }
      }
    })
    .catch(() => {
      // Fallback silencioso a los dominios ya en memoria
    });
}

function extractHostname(rawUrl: string): string | null {
  try {
    const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isKnownPhishingLink(url: string): boolean {
  syncPhishingListInBackground();
  const host = extractHostname(url);
  if (!host) return false;
  return phishingDomains.has(host);
}

/**
 * Comprueba mensajes para enlaces de phishing, invitaciones o dominios no permitidos.
 * - Ignora DMs y miembros con permisos de moderación.
 * - Devuelve `true` si el mensaje fue gestionado (borrado).
 */
export async function handleLinkProtection(
  message: Message,
  preloadedSettings?: any,
): Promise<boolean> {
  if (
    !message.guild ||
    !message.member ||
    message.member.permissions.has(PermissionFlagsBits.ManageMessages)
  )
    return false;

  const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  const foundLinks = message.content.match(linkRegex);
  if (!foundLinks) return false;

  // 1. Detección prioritaria de Phishing/Scam (actúa siempre que haya un link de estafa conocido)
  const phishingHit = foundLinks.find((l) => isKnownPhishingLink(l));

  let settings = preloadedSettings;
  if (!settings)
    settings = await SettingsManager.getLite(
      message.guild.id,
      "securityModules allowedLinks",
    );

  if (!phishingHit && !settings?.securityModules?.antiLinks) return false;

  const customAllowed = settings?.allowedLinks || [];
  const allAllowed = [...DEFAULT_ALLOWED, ...customAllowed].map((d) =>
    d.toLowerCase(),
  );

  const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/i;
  const isInvite = inviteRegex.test(message.content);

  const isForbidden =
    Boolean(phishingHit) ||
    foundLinks.some((link) => !isAllowedByDomain(link, allAllowed));

  if (isInvite || isForbidden) {
    await message.delete().catch(() => null);

    // Sumar estrés al servidor (+40 si es phishing, +15 si es link no permitido)
    const stressPoints = phishingHit ? 40 : 15;
    const stressStatus = await addServerStress(message.guild.id, stressPoints);

    if (message.channel.isTextBased()) {
      const warningText = phishingHit
        ? `🚨 **${message.author.username}**, enlace malicioso/phishing bloqueado.`
        : `**${message.author.username}**, enlaces no permitidos.`;
      const warning = await (message.channel as any)
        .send(`${warningText}${ADMIN_MARKER}`)
        .catch(() => null);
      if (warning) {
        if (warning.id) markAsAdminMessage(warning.id);
        setTimeout(() => warning.delete().catch(() => null), 5000);
      }
    }

    // Enviar alerta interactiva al Centro de Comando (#mod-logs) con botones de sanción rápida
    void HoshikoLogger.sendLog(
      message.guild,
      "AUTOMOD",
      `**Acción:** Mensaje eliminado (${phishingHit ? "🚨 Phishing detectado" : isInvite ? "Invitación externa" : "Enlace no permitido"})\n**Canal:** <#${message.channelId}>\n**Estrés del Servidor:** \`${stressStatus.score}/${stressStatus.threshold} pts\`\n**Fragmento:** \`\`\`${message.content.slice(0, 300)}\`\`\``,
      message.author,
    );

    return true;
  }

  return false;
}

