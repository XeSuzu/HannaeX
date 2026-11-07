import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";

/**
 * Delimitador invisible (Zero-Width Space + Zero-Width Non-Joiner) que viaja
 * en el payload de Discord de mensajes administrativos (como /say) para sobrevivir
 * a reinicios del bot sin alterar la interfaz gráfica del usuario.
 */
export const ADMIN_MARKER = "\u200B\u200C";

/**
 * Caché local en memoria de IDs de mensajes administrativos emitidos por el bot.
 * TTL de 48 horas con actualización desactivada en lecturas para evitar retención infinita.
 */
const adminMessageCache = new LocalCacheService<{ isAdmin: boolean }>(
  "ai_admin_messages",
  {
    max: 2000,
    ttlMs: 48 * 60 * 60 * 1000,
    updateAgeOnGet: false,
  },
);

/**
 * Caché local en memoria de IDs de respuestas conversacionales legítimas emitidas por la IA.
 * TTL de 48 horas con actualización desactivada en lecturas.
 */
const aiMessageCache = new LocalCacheService<{ isAi: boolean }>(
  "ai_legit_messages",
  {
    max: 2000,
    ttlMs: 48 * 60 * 60 * 1000,
    updateAgeOnGet: false,
  },
);

/**
 * Registra un ID de mensaje como emitido por un comando administrativo (/say, etc.).
 */
export function markAsAdminMessage(messageId: string): void {
  if (!messageId) return;
  adminMessageCache.set(messageId, { isAdmin: true });
}

/**
 * Registra un ID de mensaje como emitido por el motor conversacional de la IA.
 */
export function markAsAiMessage(messageId: string): void {
  if (!messageId) return;
  aiMessageCache.set(messageId, { isAi: true });
}

/**
 * Comprueba si un ID de mensaje fue generado por la IA en la sesión activa.
 */
export function isAiMessage(messageId?: string | null): boolean {
  if (!messageId) return false;
  return !!aiMessageCache.get(messageId)?.isAi;
}

/**
 * Determina si un mensaje fue generado por un comando administrativo, automático o utilitario,
 * y no por la personalidad conversacional de Hoshiko.
 *
 * Utiliza un enfoque centralizado de defensa en profundidad:
 * 1. Si el ID figura en la caché de mensajes conversacionales de IA -> false (es legítimo de IA).
 * 2. Si el mensaje contiene embeds o componentes (botones, menús) -> true (es administrativo/utilitario).
 * 3. Si el ID figura en la caché de mensajes administrativos -> true.
 * 4. Si el contenido contiene el marcador invisible ADMIN_MARKER -> true.
 * 5. Si el contenido comienza con indicadores inequívocos de alertas de comandos (❌, ⚠️, 🚨, 🚫, etc.) -> true.
 */
export function isAdminMessage(
  message?: {
    id?: string;
    content?: string;
    embeds?: readonly any[] | any[];
    components?: readonly any[] | any[];
  } | null,
): boolean {
  if (!message) return false;

  // 1. Si está explícitamente registrado como mensaje de la IA conversacional
  if (message.id && isAiMessage(message.id)) {
    return false;
  }

  // 2. Mensajes estructurados con embeds o componentes interactivos son siempre administrativos/utilitarios
  if (message.embeds && message.embeds.length > 0) {
    if (message.id) adminMessageCache.set(message.id, { isAdmin: true });
    return true;
  }
  if (message.components && message.components.length > 0) {
    if (message.id) adminMessageCache.set(message.id, { isAdmin: true });
    return true;
  }

  // 3. Registro en caché de comandos administrativos
  if (message.id && adminMessageCache.get(message.id)?.isAdmin) {
    return true;
  }

  // 4. Marcador invisible persistente entre reinicios
  if (message.content && message.content.includes(ADMIN_MARKER)) {
    if (message.id) adminMessageCache.set(message.id, { isAdmin: true });
    return true;
  }

  // 5. Notificaciones y alertas de utilidades/moderación en texto plano
  if (message.content) {
    const trimmed = message.content.trim();
    if (/^(?:❌|⚠️|🚨|🚫|🌸\s*¡Oye!)/.test(trimmed)) {
      if (message.id) adminMessageCache.set(message.id, { isAdmin: true });
      return true;
    }
  }

  return false;
}

/**
 * Retira cualquier marcador técnico invisible del texto antes de pasarlo a Gemini o al historial.
 */
export function stripAdminMarker(text: string): string {
  if (!text) return "";
  return text.split(ADMIN_MARKER).join("");
}
