import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OAuth2Scopes,
  PermissionFlagsBits,
  PermissionsBitField,
} from "discord.js";

/**
 * Permisos estrictamente necesarios para el funcionamiento de Hoshiko:
 * - Comunicación y render: ViewChannel, SendMessages, EmbedLinks, AttachFiles, ReadMessageHistory
 * - Limpieza y filtros: ManageMessages, UseExternalEmojis
 * - Niveles y roles: ManageRoles
 * - Moderación activa: ModerateMembers, KickMembers, BanMembers, ViewAuditLog
 */
export const RECOMMENDED_INVITE_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ViewAuditLog,
  PermissionFlagsBits.UseExternalEmojis,
];

export const REQUIRED_OAUTH_SCOPES = [
  OAuth2Scopes.Bot,
  OAuth2Scopes.ApplicationsCommands,
];

export function getRecommendedPermissionsBitfield(): bigint {
  return PermissionsBitField.resolve(RECOMMENDED_INVITE_PERMISSIONS);
}

export function resolveClientId(clientOrId: unknown): string {
  if (typeof clientOrId === "string" && clientOrId.trim().length > 0) {
    return clientOrId.trim();
  }
  if (clientOrId && typeof clientOrId === "object") {
    const candidate =
      (clientOrId as any).user?.id ||
      (clientOrId as any).application?.id ||
      (clientOrId as any).id;
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return process.env.BOT_ID || "";
}

export function generateStandardInviteUrl(clientOrId: unknown): string {
  const clientId = resolveClientId(clientOrId);
  const perms = getRecommendedPermissionsBitfield().toString();
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot%20applications.commands`;
}

export function generateAdminInviteUrl(clientOrId: unknown): string {
  const clientId = resolveClientId(clientOrId);
  const perms = PermissionsBitField.resolve([
    PermissionFlagsBits.Administrator,
  ]).toString();
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot%20applications.commands`;
}

const DISCORD_INVITE_REGEX =
  /^https:\/\/(?:www\.)?(?:discord\.gg\/[a-zA-Z0-9_-]{2,32}|discord(?:app)?\.com\/invite\/[a-zA-Z0-9_-]{2,32})\/?$/;

const PLACEHOLDER_PATTERNS = [
  "tuserver",
  "your_invite",
  "your-server",
  "ejemplo",
  "example",
  "placeholder",
];

export function isValidSupportUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  for (const placeholder of PLACEHOLDER_PATTERNS) {
    if (lower.includes(placeholder)) return false;
  }

  return DISCORD_INVITE_REGEX.test(trimmed);
}

export function buildSupportButton(supportUrl?: string | null): ButtonBuilder {
  if (isValidSupportUrl(supportUrl)) {
    return new ButtonBuilder()
      .setLabel("Servidor de Soporte")
      .setStyle(ButtonStyle.Link)
      .setURL(supportUrl!.trim())
      .setEmoji("💬");
  }

  return new ButtonBuilder()
    .setCustomId("invite_support_soon")
    .setLabel("Soporte · Muy pronto")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("💬")
    .setDisabled(true);
}

export function buildInviteActionRow(
  clientOrId: unknown,
  supportUrl?: string | null,
): ActionRowBuilder<ButtonBuilder> {
  const standardUrl = generateStandardInviteUrl(clientOrId);
  const adminUrl = generateAdminInviteUrl(clientOrId);

  const standardBtn = new ButtonBuilder()
    .setLabel("Invitar a Hoshiko")
    .setStyle(ButtonStyle.Link)
    .setURL(standardUrl)
    .setEmoji("🌸");

  const adminBtn = new ButtonBuilder()
    .setLabel("Permisos Completos (Admin)")
    .setStyle(ButtonStyle.Link)
    .setURL(adminUrl)
    .setEmoji("⚙️");

  const supportBtn = buildSupportButton(supportUrl);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    standardBtn,
    adminBtn,
    supportBtn,
  );
}
