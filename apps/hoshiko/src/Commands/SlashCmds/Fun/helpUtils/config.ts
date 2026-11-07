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
  return generateStandardInviteUrl(clientId || process.env.BOT_ID || "");
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
  Levels: {
    emoji: "📈",
    desc: "Niveles, experiencia y tarjetas",
    flavor: "Progresión en texto y voz con tarjetas Canvas y tablas de clasificación.",
    color: 0x5bc0be,
  },
  Utility: {
    emoji: EMOJI.utility,
    desc: "Utilidades y herramientas esenciales",
    flavor: "Enlaces de invitación, sincronización y recursos útiles para el servidor.",
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
    desc: "Inteligencia Artificial y memoria",
    flavor: "Conversación interactiva, cuotas diarias de 24h y memoria personal soberana.",
    color: 0x00d9ff,
  },
  IA: {
    emoji: EMOJI.ai,
    desc: "Inteligencia Artificial y memoria",
    flavor: "Conversación interactiva, cuotas diarias de 24h y memoria personal soberana.",
    color: 0x00d9ff,
  },
};

export const WELCOME_LINES = [
  "Hay muchas cositas que puedes descubrir por aquí. Elige una categoría y te mostraré qué puedes hacer con Hoshiko ✨",
  "Un poquito de Hoshiko 🌸 Aquí encontrarás información sobre mi versión, comandos y herramientas para cuidar de tu comunidad.",
  "Cada rincón de tu servidor cuenta. Explora mis secciones para descubrir todo lo que podemos construir juntos.",
  "Acompañando a tu comunidad con calidez, elegancia y precisión. Elige una categoría para comenzar ✨",
];

export const SEPARATOR = "╌".repeat(34);
