import { PersonalMemoryService } from "../Memory/PersonalMemoryService";
import type { IUserPreferences } from "../../../Database/ai/personalMemory.model";

export type LocalIntentType =
  | "greeting"
  | "farewell"
  | "memory_query"
  | "memory_clear"
  | "preferences_query"
  | "preferences_update";

export interface LocalResolutionResult {
  handled: boolean;
  intent: LocalIntentType;
  replyText: string;
}

export class LocalIntentResolver {
  private static normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!.,;:_()\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  static async resolve(userId: string, rawInput: string): Promise<LocalResolutionResult | null> {
    const clean = this.normalize(rawInput);

    if (!clean) return null;

    // 1. Saludos simples deterministas
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|holi|hey|hello|hi)$/.test(clean)) {
      return {
        handled: true,
        intent: "greeting",
        replyText: "¡Hola! Me alegra saludarte. ¿En qué puedo acompañarte o ayudarte hoy? ✨",
      };
    }

    // 2. Agradecimientos y despedidas deterministas
    if (/^(gracias|muchas gracias|muchisimas gracias|mil gracias|te lo agradezco)$/.test(clean)) {
      return {
        handled: true,
        intent: "farewell",
        replyText: "¡Con mucho gusto! Me hace feliz ser de ayuda. Estaré aquí si necesitas algo más ♡",
      };
    }

    if (/^(adios|chao|chau|hasta luego|hasta pronto|nos vemos|bye|goodbye)$/.test(clean)) {
      return {
        handled: true,
        intent: "farewell",
        replyText: "¡Hasta luego! Que tengas un lindo momento y cuídate mucho ✨",
      };
    }

    // 3. Consulta de memoria propia
    if (
      /^(que recuerdas de mi|que sabes de mi|que sabes sobre mi|que recuerdas sobre mi|mis recuerdos|que tienes guardado de mi|que tienes guardado sobre mi)$/.test(
        clean,
      )
    ) {
      const facts = await PersonalMemoryService.getFacts(userId);
      if (facts.length === 0) {
        return {
          handled: true,
          intent: "memory_query",
          replyText:
            "Aún no tengo recuerdos personales guardados sobre ti. Si deseas que recuerde algo importante para futuras conversaciones (como tu editor favorito o tus gustos), solo pídemelo explícitamente ♡",
        };
      }

      const list = facts.map((factStr, i) => `${i + 1}. ${factStr}`).join("\n");
      return {
        handled: true,
        intent: "memory_query",
        replyText: `Esto es lo que tengo guardado en mi memoria personal para ti:\n\n${list}\n\n*(Puedes pedirme olvidar todo o actualizar cualquier recuerdo cuando quieras)* ✨`,
      };
    }

    // 4. Borrado de recuerdos personales
    if (
      /^(olvida todo sobre mi|olvida todo de mi|borra mis recuerdos|borra todos mis recuerdos|limpia mi memoria|olvida mis recuerdos)$/.test(
        clean,
      )
    ) {
      await PersonalMemoryService.clearAllFacts(userId);
      return {
        handled: true,
        intent: "memory_clear",
        replyText:
          "He borrado todos tus recuerdos explícitos de mi memoria personal. Tu privacidad siempre es lo primero ♡",
      };
    }

    // 5. Consulta de preferencias personales
    if (
      /^(cuales son mis preferencias|como esta mi estilo|ver mis preferencias|cuales son mis ajustes|mis preferencias)$/.test(
        clean,
      )
    ) {
      const prefs = await PersonalMemoryService.getPreferences(userId);
      const visuales = prefs.allowVisuals ? "Permitidas" : "Desactivadas";
      const styleName =
        prefs.style === "concise"
          ? "Conciso"
          : prefs.style === "detailed"
            ? "Detallado"
            : "Balanceado";
      return {
        handled: true,
        intent: "preferences_query",
        replyText:
          `Estas son tus preferencias actuales de interacción:\n\n` +
          `• **Estilo:** \`${styleName}\`\n` +
          `• **Tono:** \`${prefs.tonePreference}\`\n` +
          `• **Imágenes ilustrativas:** \`${visuales}\`\n\n` +
          `Puedes modificarlas cuando quieras pidiéndomelo directamente o con el comando de ajustes ✨`,
      };
    }

    // 6. Actualización rápida de preferencias
    const matchStyle = clean.match(/^(?:cambia|pon|ajusta)\s+mi\s+estilo\s+a\s+(balanceado|conciso|detallado)$/);
    if (matchStyle) {
      const styleMap: Record<string, IUserPreferences["style"]> = {
        conciso: "concise",
        detallado: "detailed",
        balanceado: "balanced",
      };
      const newStyle = styleMap[matchStyle[1]] || "balanced";
      await PersonalMemoryService.updatePreferences(userId, { style: newStyle });
      return {
        handled: true,
        intent: "preferences_update",
        replyText: `¡Listo! He actualizado tu estilo de conversación a **${matchStyle[1]}** ♡`,
      };
    }

    if (/^(?:activa|habilitar?)\s+(?:las\s+)?imagenes$/.test(clean)) {
      await PersonalMemoryService.updatePreferences(userId, { allowVisuals: true });
      return {
        handled: true,
        intent: "preferences_update",
        replyText: "¡Entendido! Ahora podré complementar mis respuestas con imágenes ilustrativas cuando sea oportuno ✨",
      };
    }

    if (/^(?:desactiva|inhabilitar?)\s+(?:las\s+)?imagenes$/.test(clean)) {
      await PersonalMemoryService.updatePreferences(userId, { allowVisuals: false });
      return {
        handled: true,
        intent: "preferences_update",
        replyText: "¡Hecho! A partir de ahora responderé únicamente con texto, sin imágenes ilustrativas ♡",
      };
    }

    return null;
  }
}
