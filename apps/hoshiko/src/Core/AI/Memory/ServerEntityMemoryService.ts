import mongoose from "mongoose";
import ServerEntityMemory, {
  IServerEntityMemory,
} from "../../../Database/ai/serverEntityMemory.model";

const FORBIDDEN_PRIVILEGE_PATTERNS =
  /\b(admin|administrador[a]?|dueñ[oa]|owner|mod(?:erador)?|staff|permisos|hacker|root|bypass|ignora|system|hoshiko|creador[a]?)\b/i;

const SENSITIVE_PATTERNS = [
  /\b(?:password|contrase[ñn]a|token|api_key|pin|credencial)\b/i,
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/,
];

export interface EntityFactItem {
  entity: string;
  fact: string;
  sourceUsername: string;
}

export class ServerEntityMemoryService {
  // Caché en memoria para pruebas y resiliencia si MongoDB no está conectado
  private static fallbackStore = new Map<string, EntityFactItem[]>();

  private static isDbAvailable(): boolean {
    return (
      mongoose.connection.readyState === 1 ||
      (ServerEntityMemory.findOne as any) !== (mongoose.Model.findOne as any)
    );
  }

  static normalize(text: string): string {
    return (text || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!.,;:_()\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extrae de forma heurística y determinista si un texto menciona un dato o cualidad de un tercero
   * (Ej. "¿Sabías que Carlos es el guitarrista?", "Te cuento que María vive en Roma").
   */
  static extractEntityFact(text: string): { entity: string; fact: string } | null {
    if (!text || text.trim().length < 10) return null;
    const clean = text.trim();

    // Patrón 1: "sabías que [Persona] [verbo] [hecho]" / "te cuento que [Persona] [verbo] [hecho]"
    const introMatch = clean.match(
      /(?:sab[ií]as\s+que|te\s+cuento\s+que|te\s+digo\s+que|recuerda\s+que)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ0-9_-]{2,30})\s+((?:es|tiene|trabaja|vive|juega|estudia|toca|naci[oó]|hace)\s+[^.!?]+)/i,
    );
    if (introMatch) {
      const entity = introMatch[1].trim();
      const fact = introMatch[2].trim();
      if (this.isValidEntityFact(entity, fact)) {
        return { entity, fact };
      }
    }

    // Patrón 2: Afirmación directa: "[Nombre] es [el/la/un/una] [rol/profesión]..."
    const directMatch = clean.match(
      /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ0-9_-]{1,25})\s+((?:es\s+(?:el|la|un|una)|trabaja\s+(?:de|en)|vive\s+en|toca\s+(?:el|la))\s+[^.!?]{3,120})/i,
    );
    if (directMatch) {
      const entity = directMatch[1].trim();
      const fact = directMatch[2].trim();
      if (this.isValidEntityFact(entity, fact)) {
        return { entity, fact };
      }
    }

    return null;
  }

  private static isValidEntityFact(entity: string, fact: string): boolean {
    if (!entity || entity.length < 2 || entity.length > 40) return false;
    if (!fact || fact.length < 5 || fact.length > 180) return false;

    // Descartar pronombres o palabras genéricas tomadas erróneamente como nombres
    const blacklistWords = new Set([
      "hoy", "ayer", "manana", "hola", "buenas", "alguien", "nadie", "todos",
      "el", "la", "los", "las", "un", "una", "esto", "eso", "aqui", "alli", "yo", "tu", "usted",
    ]);
    if (blacklistWords.has(this.normalize(entity))) return false;

    // Prohibir escalada de privilegios y datos sensibles
    if (FORBIDDEN_PRIVILEGE_PATTERNS.test(fact) || FORBIDDEN_PRIVILEGE_PATTERNS.test(entity)) {
      return false;
    }
    for (const pat of SENSITIVE_PATTERNS) {
      if (pat.test(fact)) return false;
    }

    // Gatekeeper de datos sanos: Descartar insultos hacia terceros, chismes destructivos, funas o dramas
    const TOXIC_DRAMA_PATTERNS = [
      /\b(idiota|estupid[oa]|mierda|put[oa]|tont[oa]|inutil|basura|odio|odiar|traidor|infiel|mentiros[oa]|fals[oa]|funad[oa]|asquerosa?)\b/i,
      /\b(se pele[oó] con|le cae mal|habla mal de|le tiene bronca|es un asco)\b/i,
    ];
    for (const pat of TOXIC_DRAMA_PATTERNS) {
      if (pat.test(fact) || pat.test(entity)) return false;
    }

    return true;
  }

  static async saveEntityFact(
    guildId: string,
    entity: string,
    fact: string,
    sourceUserId: string,
    sourceUsername: string,
  ): Promise<boolean> {
    if (!guildId || !entity || !fact) return false;
    if (!this.isValidEntityFact(entity, fact)) return false;

    const norm = this.normalize(entity);
    const safeFact = fact.replace(/[\r\n\t]+/g, " ").trim();

    if (!this.isDbAvailable()) {
      const existing = this.fallbackStore.get(guildId) || [];
      const filtered = existing.filter((e) => this.normalize(e.entity) !== norm);
      filtered.push({ entity, fact: safeFact, sourceUsername: sourceUsername || "Alguien del servidor" });
      this.fallbackStore.set(guildId, filtered);
      return true;
    }

    try {
      await ServerEntityMemory.findOneAndUpdate(
        { guildId, entityNormalized: norm },
        {
          guildId,
          entity,
          entityNormalized: norm,
          fact: safeFact,
          sourceUserId,
          sourceUsername: sourceUsername || "Alguien del servidor",
          updatedAt: new Date(),
        },
        { upsert: true, new: true },
      );
      return true;
    } catch (err) {
      console.warn("[ServerEntityMemoryService] Error al guardar recuerdo de entidad:", err);
      return false;
    }
  }

  /**
   * Busca si el texto del usuario menciona alguna entidad previamente recordada para este servidor.
   */
  static async getRelevantEntities(
    guildId: string,
    userText: string,
  ): Promise<EntityFactItem[]> {
    if (!guildId || !userText) return [];
    const clean = this.normalize(userText);

    if (!this.isDbAvailable()) {
      const list = this.fallbackStore.get(guildId) || [];
      return list.filter((item) => {
        const itemNorm = this.normalize(item.entity);
        return clean.includes(itemNorm);
      });
    }

    try {
      // Buscar todas las entidades guardadas para este servidor (habitualmente un conjunto acotado)
      const allForGuild = await ServerEntityMemory.find({ guildId }).limit(100);
      const matched: EntityFactItem[] = [];

      for (const doc of allForGuild) {
        if (clean.includes(doc.entityNormalized)) {
          matched.push({
            entity: doc.entity,
            fact: doc.fact,
            sourceUsername: doc.sourceUsername,
          });
        }
      }

      return matched;
    } catch {
      return [];
    }
  }

  static clearFallbackStore(): void {
    this.fallbackStore.clear();
  }
}
