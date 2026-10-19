import { PermissionsBitField } from "discord.js";
import {
  generateStandardInviteUrl,
  RECOMMENDED_INVITE_PERMISSIONS,
} from "../../../../Utils/inviteUtils";

export const SUPPORT_SERVER = process.env.SUPPORT_SERVER_INVITE || "";
export const BANNER_URL =
  process.env.BANNER_URL ||
  "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif";

export const INVITE_PERMISSIONS = PermissionsBitField.resolve(
  RECOMMENDED_INVITE_PERMISSIONS,
).toString();

export function getInviteLink(clientId: string | undefined): string {
  return generateStandardInviteUrl(clientId || "YOUR_CLIENT_ID");
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
  cmd: "🔹",
  warning: "⚠️",
  shield: "🛡️",
  beta: "🧪",
  check: "✅",
  cross: "❌",
  book: "📖",
  gear: "⚙️",
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
  Information: {
    emoji: EMOJI.information,
    desc: "Información y estado del servidor",
    flavor: "Datos, estadísticas y herramientas informativas de la comunidad.",
    color: 0xb5a4f5,
  },
  Moderation: {
    emoji: EMOJI.moderation,
    desc: "Herramientas de staff y seguridad",
    flavor: "Sanciones disciplinarias, filtros y protección activa.",
    color: 0xff6b6b,
    visibleTo: "Mod",
  },
  Confessions: {
    emoji: "💌",
    desc: "Buzón de confesiones anónimas",
    flavor: "Publicaciones con tarjetas Canvas elegantes y moderación segura.",
    color: 0xff9eb5,
  },
  Utility: {
    emoji: EMOJI.utility,
    desc: "Niveles, roles y herramientas",
    flavor: "Sistema de progresión de texto/voz y utilidades esenciales.",
    color: 0x7ec8e3,
  },
  Fun: {
    emoji: EMOJI.fun,
    desc: "Entretenimiento y rachas",
    flavor: "Rachas de mensajes, minijuegos y traducción rápida.",
    color: 0xff8fab,
  },
  Profiles: {
    emoji: "👤",
    desc: "Perfiles y seguimiento",
    flavor: "Actividad, historial de avatares y fichas de miembros.",
    color: 0x98d8aa,
  },
  Interactions: {
    emoji: EMOJI.paw,
    desc: "Interacciones sociales animadas",
    flavor: "Expresiones afectivas y acciones entre miembros.",
    color: 0xffb4d6,
  },
  Social: {
    emoji: "💞",
    desc: "Afinidad y vínculos",
    flavor: "Compatibilidad entre avatares y cálculos de afinidad.",
    color: 0xff7597,
  },
  Canvas: {
    emoji: "🎨",
    desc: "Generadores visuales y redes",
    flavor: "Renderizado dinámico de tarjetas y publicaciones.",
    color: 0xf9bc60,
  },
  Performance: {
    emoji: "📊",
    desc: "Salud y telemetría",
    flavor: "Métricas internas de latencia, memoria y recursos.",
    color: 0x5bc0be,
  },
  Setups: {
    emoji: EMOJI.admin,
    desc: "Configuración del servidor",
    flavor: "Ajustes de prefijo, roles automáticos y módulos.",
    color: 0x4a4a6a,
    visibleTo: "Admin",
  },
  Admin: {
    emoji: "🏛️",
    desc: "Administración avanzada",
    flavor: "Recompensas por estado y gestión de servidores.",
    color: 0x2e2f3e,
    visibleTo: "Admin",
  },
  Owner: {
    emoji: EMOJI.owner,
    desc: "Exclusivo de desarrollo",
    flavor: "Comandos restringidos para el propietario del bot.",
    color: 0x1a1a2e,
    visibleTo: "Owner",
  },
  Privado: {
    emoji: "🔒",
    desc: "Herramientas privadas de gestión",
    flavor: "Gestión interna y revisión de sugerencias.",
    color: 0x1a1a2e,
    visibleTo: "Owner",
  },
  AI: {
    emoji: EMOJI.ai,
    desc: "Inteligencia Artificial",
    flavor: "Gestión de memoria de usuario (conversación en mantenimiento).",
    color: 0x00d9ff,
  },
  IA: {
    emoji: EMOJI.ai,
    desc: "Inteligencia Artificial",
    flavor: "Gestión de memoria de usuario (conversación en mantenimiento).",
    color: 0x00d9ff,
  },
};

export const WELCOME_LINES = [
  "¿En qué puedo ayudarte hoy? Explora las secciones para conocer todo lo que puedo hacer por tu comunidad 🐾",
  "Aquí tienes el manual completo de Hoshiko: comandos, permisos y herramientas de protección.",
  "Cuidando de tu comunidad con precisión y elegancia. Elige una categoría para comenzar.",
  "Explora mis sistemas de moderación, niveles, confesiones y utilidades activas.",
];

export const SEPARATOR = "╌".repeat(34);
