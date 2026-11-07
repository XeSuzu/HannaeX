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

// Conjunto en memoria O(1) de dominios de phishing e IP grabbers conocidos
const phishingDomains = new Set<string>([
  "discord-nitro.com",
  "dlscord.com",
  "discorcl.com",
  "dicsord.com",
  "discordgift.site",
  "discord-gift.com",
  "discord-airdrop.com",
  "steamcomminuty.com",
  "stearncommunity.com",
  "steamcommunity-gift.com",
  "grabify.link",
  "iplogger.org",
  "blasze.tk",
]);

const LEGIT_BRAND_DOMAINS = new Set<string>([
  "discord.com",
  "discordapp.com",
  "discord.gg",
  "discord.media",
  "discordapp.net",
  "discordstatus.com",
  "steamcommunity.com",
  "steampowered.com",
]);

const HEURISTIC_PHISHING_HOST_REGEX =
  /(?:free-?discord|discord-?nitro|free-?nitro|discord-?gift|dlscord|discorcl|dicsord|steamcomm|stearncomm|crypto-?giveaway|nitro-?claim|airdrop-?discord)/i;

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
      // Fallback silencioso a los dominios y heurística ya en memoria
    });
}

function extractHostname(rawUrl: string): string | null {
  try {
    const cleaned = rawUrl.replace(/[)>.,;'"!?\]]+$/, "");
    const normalized = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isKnownPhishingLink(url: string): boolean {
  syncPhishingListInBackground();
  const host = extractHostname(url);
  if (!host) return false;

  // Si es un dominio oficial legítimo de Discord/Steam, nunca es phishing de dominio
  if (LEGIT_BRAND_DOMAINS.has(host)) return false;
  for (const legit of LEGIT_BRAND_DOMAINS) {
    if (host.endsWith(`.${legit}`)) return false;
  }

  // 1. Coincidencia directa del host en el Set sincronizado (phish.sinking.yachts + semilla)
  if (phishingDomains.has(host)) return true;

  // 2. Coincidencia de dominios padre y subdominios (AUD-10)
  const parts = host.split(".");
  while (parts.length > 2) {
    parts.shift();
    const parentDomain = parts.join(".");
    if (phishingDomains.has(parentDomain)) {
      return true;
    }
  }

  // 3. Heurística local para dominios trampa de Nitro/Steam/Giveaways aun sin red
  if (HEURISTIC_PHISHING_HOST_REGEX.test(host)) {
    return true;
  }

  return false;
}

const URL_AND_INVITE_EXTRACT_REGEX =
  /(?:https?:\/\/[^\s]+)|(?:www\.[^\s]+)|(?:(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/[^\s]+)/gi;

const DISCORD_INVITE_REGEX =
  /(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9-]+/i;

/**
 * Comprueba mensajes para enlaces de phishing, invitaciones o dominios no permitidos.
 * - Ignora DMs, staff y canales/roles exentos.
 * - Devuelve `true` si el mensaje fue gestionado (borrado).
 */
export async function handleLinkProtection(
  message: Message,
  preloadedSettings?: any,
): Promise<boolean> {
  if (
    !message.guild ||
    !message.member ||
    message.guild.ownerId === message.author?.id ||
    message.member.permissions?.has?.(PermissionFlagsBits.ManageMessages) ||
    message.member.permissions?.has?.(PermissionFlagsBits.Administrator)
  )
    return false;

  const foundLinks = message.content?.match(URL_AND_INVITE_EXTRACT_REGEX);
  if (!foundLinks || foundLinks.length === 0) return false;

  // 1. Detección prioritaria de Phishing/Scam (actúa siempre que haya un link de estafa conocido)
  const phishingHit = foundLinks.find((l) => isKnownPhishingLink(l));

  let settings = preloadedSettings;
  if (!settings)
    settings = await SettingsManager.getLite(
      message.guild.id,
      "securityModules allowedLinks exemptChannels exemptRoles",
    );

  // Respetar canales y roles exentos configurados en el servidor
  const channelId = message.channelId || message.channel?.id || "";
  if (channelId && (settings?.exemptChannels || []).includes(channelId)) {
    return false;
  }

  const memberRoles: any = message.member?.roles?.cache;
  const hasExemptRole = memberRoles
    ? typeof memberRoles.some === "function"
      ? memberRoles.some((r: any) => (settings?.exemptRoles || []).includes(r.id))
      : Array.from(memberRoles.values ? memberRoles.values() : memberRoles).some(
          (r: any) => (settings?.exemptRoles || []).includes(r.id),
        )
    : false;
  if (hasExemptRole) return false;

  if (!phishingHit && !settings?.securityModules?.antiLinks) return false;

  const customAllowed = settings?.allowedLinks || [];
  const allAllowed = [...DEFAULT_ALLOWED, ...customAllowed].map((d) =>
    d.toLowerCase(),
  );

  const isInvite = DISCORD_INVITE_REGEX.test(message.content);

  const isForbidden =
    Boolean(phishingHit) ||
    foundLinks.some((link) => !isAllowedByDomain(link, allAllowed));

  if (isInvite || isForbidden) {
    HoshikoLogger.markBotMessageDelete(message.id);
    let deletedOk = true;
    await message.delete().catch(() => {
      deletedOk = false;
    });

    // Sumar estrés al servidor (+40 si es phishing, +15 si es link no permitido)
    const stressPoints = phishingHit ? 40 : 15;
    await addServerStress(message.guild.id, stressPoints);

    if (message.channel?.isTextBased?.()) {
      const warningText = phishingHit
        ? `🚨 **${message.author.username}**, enlace malicioso/phishing bloqueado.`
        : `**${message.author.username}**, enlaces no permitidos.`;
      const warning = await (message.channel as any)
        .send(`${warningText}${ADMIN_MARKER}`)
        .catch(() => null);
      if (warning) {
        if (warning.id) markAsAdminMessage(warning.id);
        setTimeout(() => {
          if (warning.id) HoshikoLogger.markBotMessageDelete(warning.id);
          warning.delete().catch(() => null);
        }, 5000);
      }
    }

    const logChannelId = channelId || "desconocido";
    const ruleLabel = phishingHit
      ? "🚨 Phishing / Dominio malicioso"
      : isInvite
        ? "Invitación de Discord externa"
        : "Dominio fuera de la lista permitida";

    // Enviar registro neutralizado a #links-logs (con fallback a #mod-log si no existe #links-logs)
    await HoshikoLogger.logLinkDetection(message.guild, {
      author: message.author,
      channelId: logChannelId,
      urls: foundLinks,
      rule: ruleLabel,
      actionTaken: "Eliminación de mensaje + Aviso temporal",
      result: deletedOk
        ? "Mensaje eliminado correctamente"
        : "Fallo al eliminar mensaje",
      severityColor: phishingHit ? 0xed4245 : 0xfaa61a,
    });

    return true;
  }

  return false;
}

