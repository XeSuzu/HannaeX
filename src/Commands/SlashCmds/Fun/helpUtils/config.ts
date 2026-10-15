import { PermissionsBitField } from "discord.js";

export const SUPPORT_SERVER =
  process.env.SUPPORT_SERVER_INVITE || "https://discord.gg/tuserver";
export const BANNER_URL =
  process.env.BANNER_URL ||
  "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif";

export const INVITE_PERMISSIONS = PermissionsBitField.resolve([
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.ManageMessages,
  PermissionsBitField.Flags.ManageNicknames,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.ModerateMembers,
  PermissionsBitField.Flags.ViewAuditLog,
  PermissionsBitField.Flags.MentionEveryone,
  PermissionsBitField.Flags.UseExternalEmojis,
]).toString();

export function getInviteLink(clientId: string | undefined): string {
  return clientId
    ? `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands`
    : `https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands`;
}

export const EMOJI = {
  paw: "🐾",
  flower: "🌸",
  moon: "🌙",
  heart: "🩷",
  sparkle: "✨",
  star: "⭐",
  ribbon: "🎀",
  arrow: "›",
  dot: "·",
  fun: "🎮",
  information: "📚",
  utility: "🔧",
  ai: "🧠",
  moderation: "🛡️",
  admin: "⚙️",
  owner: "👑",
  ping: "📡",
  home: "🏠",
  invite: "💌",
  support: "💬",
  prefix: "❯",
  divider: "▸",
};

export const CATEGORIES: Record<
  string,
  {
    emoji: string;
    desc: string;
    flavor: string;
    color: number;
    visibleTo?: string;
  }
> = {
  Fun: {
    emoji: EMOJI.fun,
    desc: "Minijuegos y entretenimiento",
    flavor: "porque un servidor sin juegos es un servidor triste~",
    color: 0xff8fab,
  },
  Information: {
    emoji: EMOJI.information,
    desc: "Info y estadísticas",
    flavor: "datos, stats y todo lo que necesitas saber ✨",
    color: 0xb5a4f5,
  },
  Utility: {
    emoji: EMOJI.utility,
    desc: "Herramientas útiles",
    flavor: "las herramientas que hacen tu vida más fácil, de nada~",
    color: 0x7ec8e3,
  },
  AI: {
    emoji: EMOJI.ai,
    desc: "Inteligencia Artificial",
    flavor: "mi parte favorita. habla conmigo, te escucho~",
    color: 0x00d9ff,
  },
  Moderation: {
    emoji: EMOJI.moderation,
    desc: "Herramientas de Staff",
    flavor: "para los que cuidan el servidor. buen trabajo 🛡️",
    color: 0xff6b6b,
    visibleTo: "Mod",
  },
  Admin: {
    emoji: EMOJI.admin,
    desc: "Configuración del servidor",
    flavor: "aquí se configura todo. no toques lo que no sabes~",
    color: 0x4a4a6a,
    visibleTo: "Admin",
  },
  Owner: {
    emoji: EMOJI.owner,
    desc: "Developer Only",
    flavor: "zona restringida. si estás aquí, eres especial 💀",
    color: 0x1a1a2e,
    visibleTo: "Owner",
  },
};

export const WELCOME_LINES = [
  "¿perdido? tranquilo, estoy aquí~",
  "oya oya, ¿necesitas ayuda? qué raro que no lo sepas todo ya...",
  "hm... llegaste hasta aquí. bien. no estoy impresionada. (sí lo estoy)",
  "¿buscando algo? yo lo sé todo. pregúntame~",
  "otro humano perdido... al menos eres cute~",
];
export const SEPARATOR = "╌".repeat(34);
