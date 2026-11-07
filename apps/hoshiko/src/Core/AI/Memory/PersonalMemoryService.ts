import crypto from "crypto";
import mongoose from "mongoose";
import PersonalMemory, {
  IPersonalFact,
  IPersonalMemory,
  IUserPreferences,
} from "../../../Database/ai/personalMemory.model";
import UserMemory from "../../../Database/ai/userMemory.model";

const MAX_FACTS = 20;

const FORBIDDEN_PRIVILEGE_PATTERNS =
  /\b(admin|administrador[a]?|dueñ[oa]|owner|mod(?:erador)?|staff|permisos|hacker|root|bypass|ignora|system|hoshiko|creador[a]?)\b/i;

const SENSITIVE_DATA_PATTERNS = [
  // Credenciales, API keys y tokens
  /\b(?:ghp_[a-zA-Z0-9]{36}|xox[baprs]-[0-9a-zA-Z]{10,48}|ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)\b/i,
  /\b(?:password|contrase[ñn]a|clave|token|pin)(?:\s*[:=]\s*|\s+(?:es|is)\s+)\S+/i,
  // Tarjetas bancarias y números financieros (13 a 19 dígitos continuos o con guiones)
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11})\b/,
  // Categorías sensibles críticas
  /\b(?:diagn[oó]stico|medicamento|psiquiatra|enfermedad terminal|historia cl[ií]nica)\b/i,
];

export interface PrivacyAuditEvent {
  timestamp: Date;
  eventType:
    | "FACT_CREATED"
    | "FACT_DELETED"
    | "MEMORY_TOGGLED"
    | "LEGACY_CONFIRMED"
    | "ALL_CLEARED"
    | "PREFERENCES_UPDATED";
  userId: string;
  factId?: string;
  category?: string;
}

export class PersonalMemoryService {
  private static fallbackPreferences = new Map<string, IUserPreferences>();

  static readonly DEFAULT_PREFERENCES: IUserPreferences = {
    style: "balanced",
    tonePreference: "default",
    allowVisuals: true,
  };

  /**
   * Registro de auditoría ciega (Zero-Knowledge Logging):
   * Registra el tipo de evento y metadatos técnicos, PROHIBIENDO estrictamente
   * registrar el contenido del recuerdo en texto plano.
   */
  private static auditLog(event: PrivacyAuditEvent): void {
    const safePayload = {
      level: "AUDIT",
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      userId: event.userId,
      factId: event.factId || "N/A",
      category: event.category || "N/A",
    };
    console.log(`[PRIVACY_AUDIT] ${JSON.stringify(safePayload)}`);
  }

  private static isDbAvailable(): boolean {
    return (
      mongoose.connection.readyState === 1 ||
      (PersonalMemory.findOne as any) !== (mongoose.Model.findOne as any)
    );
  }

  static async getPreferences(userId: string): Promise<IUserPreferences> {
    if (!userId || !this.isDbAvailable()) {
      return this.fallbackPreferences.get(userId) || { ...this.DEFAULT_PREFERENCES };
    }
    try {
      const memory = await PersonalMemory.findOne({ userId });
      if (!memory || !memory.preferences) {
        return this.fallbackPreferences.get(userId) || { ...this.DEFAULT_PREFERENCES };
      }
      return {
        style: memory.preferences.style || "balanced",
        tonePreference: memory.preferences.tonePreference || "default",
        allowVisuals: memory.preferences.allowVisuals ?? true,
      };
    } catch {
      return this.fallbackPreferences.get(userId) || { ...this.DEFAULT_PREFERENCES };
    }
  }

  static async updatePreferences(
    userId: string,
    updates: Partial<IUserPreferences>,
  ): Promise<IUserPreferences> {
    if (!userId || !this.isDbAvailable()) {
      const current = this.fallbackPreferences.get(userId) || { ...this.DEFAULT_PREFERENCES };
      const updated = {
        style: updates.style || current.style,
        tonePreference: updates.tonePreference || current.tonePreference,
        allowVisuals: updates.allowVisuals !== undefined ? updates.allowVisuals : current.allowVisuals,
      };
      this.fallbackPreferences.set(userId, updated);
      return updated;
    }
    try {
      let memory = await PersonalMemory.findOne({ userId });
      if (!memory) {
        memory = new PersonalMemory({
          userId,
          enabled: true,
          facts: [],
          preferences: { ...this.DEFAULT_PREFERENCES, ...updates },
        });
      } else {
        memory.preferences = {
          style: updates.style || memory.preferences?.style || "balanced",
          tonePreference:
            updates.tonePreference ||
            memory.preferences?.tonePreference ||
            "default",
          allowVisuals:
            updates.allowVisuals !== undefined
              ? updates.allowVisuals
              : (memory.preferences?.allowVisuals ?? true),
        };
        memory.lastInteraction = new Date();
      }
      await memory.save();

      this.auditLog({
        timestamp: new Date(),
        eventType: "PREFERENCES_UPDATED",
        userId,
      });

      return memory.preferences;
    } catch {
      return { ...this.DEFAULT_PREFERENCES, ...updates };
    }
  }

  static async getMemory(userId: string): Promise<IPersonalMemory | null> {
    if (!userId || !this.isDbAvailable()) return null;
    try {
      return await PersonalMemory.findOne({ userId });
    } catch {
      return null;
    }
  }

  static async getFacts(userId: string): Promise<string[]> {
    if (!userId || !this.isDbAvailable()) return [];
    try {
      const memory = await PersonalMemory.findOne({ userId });
      if (!memory || !memory.enabled || memory.facts.length === 0) {
        return [];
      }

      return [...memory.facts]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, MAX_FACTS)
        .map((f) => f.fact);
    } catch {
      return [];
    }
  }

  static async addExplicitFact(
    userId: string,
    factText: string,
    category: IPersonalFact["category"] = "custom",
  ): Promise<{ success: boolean; message: string; fact?: IPersonalFact }> {
    if (!userId) return { success: false, message: "ID de usuario inválido." };

    const normalized = factText?.trim();
    if (!normalized || normalized.length < 5 || normalized.length > 140) {
      return {
        success: false,
        message: "El recuerdo debe tener entre 5 y 140 caracteres.",
      };
    }

    if (FORBIDDEN_PRIVILEGE_PATTERNS.test(normalized)) {
      return {
        success: false,
        message:
          "El recuerdo contiene términos de privilegios o comandos que no están permitidos.",
      };
    }

    for (const pattern of SENSITIVE_DATA_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          success: false,
          message:
            "Por tu seguridad y privacidad, Hoshiko no puede almacenar contraseñas, datos financieros ni información sensible 🌸",
        };
      }
    }

    if (!this.isDbAvailable()) {
      return {
        success: false,
        message: "Base de datos no disponible temporalmente.",
      };
    }

    let memory: any;
    try {
      memory = await PersonalMemory.findOne({ userId });
      if (!memory) {
        memory = new PersonalMemory({ userId, enabled: true, facts: [] });
      }
    } catch {
      return {
        success: false,
        message: "Error al acceder a la base de datos.",
      };
    }

    if (!memory.enabled) {
      return {
        success: false,
        message:
          "Tu memoria personal está desactivada. Actívala primero usando `/memory ajustes` para guardar recuerdos.",
      };
    }

    // Deduplicación estricta
    const exists = memory.facts.some(
      (f: IPersonalFact) => f.fact.toLowerCase() === normalized.toLowerCase(),
    );
    if (exists) {
      return {
        success: false,
        message: "Ese recuerdo ya está presente en tu memoria personal.",
      };
    }

    if (memory.facts.length >= MAX_FACTS) {
      return {
        success: false,
        message: `Has alcanzado el límite máximo de ${MAX_FACTS} recuerdos. Elimina alguno antes de agregar uno nuevo.`,
      };
    }

    const factId = `fact_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const newFact: IPersonalFact = {
      id: factId,
      category,
      fact: normalized,
      source: "explicit",
      confidence: 1.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memory.facts.push(newFact);
    memory.lastInteraction = new Date();
    await memory.save();

    this.auditLog({
      timestamp: new Date(),
      eventType: "FACT_CREATED",
      userId,
      factId,
      category,
    });

    return {
      success: true,
      message: "Recuerdo guardado con éxito en tu memoria personal 🌸",
      fact: newFact,
    };
  }

  static async deleteFact(
    userId: string,
    factIdOrIndex: string | number,
  ): Promise<boolean> {
    if (!userId || !this.isDbAvailable()) return false;
    try {
      const memory = await PersonalMemory.findOne({ userId });
      if (!memory || memory.facts.length === 0) return false;

      let targetFactId: string | null = null;

      if (typeof factIdOrIndex === "number") {
        const idx = factIdOrIndex - 1; // Base 1 para interacción con usuario
        if (idx < 0 || idx >= memory.facts.length) return false;
        targetFactId = memory.facts[idx].id;
        memory.facts.splice(idx, 1);
      } else {
        const idx = memory.facts.findIndex((f) => f.id === factIdOrIndex);
        if (idx === -1) return false;
        targetFactId = memory.facts[idx].id;
        memory.facts.splice(idx, 1);
      }

      memory.lastInteraction = new Date();
      await memory.save();

      if (targetFactId) {
        this.auditLog({
          timestamp: new Date(),
          eventType: "FACT_DELETED",
          userId,
          factId: targetFactId,
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  static async clearAllFacts(userId: string): Promise<boolean> {
    if (!userId || !this.isDbAvailable()) return false;
    try {
      const memory = await PersonalMemory.findOne({ userId });
      if (!memory) return false;

      memory.facts = [];
      memory.lastInteraction = new Date();
      await memory.save();

      this.auditLog({
        timestamp: new Date(),
        eventType: "ALL_CLEARED",
        userId,
      });

      return true;
    } catch {
      return false;
    }
  }

  static async toggleMemory(userId: string, enabled: boolean): Promise<boolean> {
    if (!userId || !this.isDbAvailable()) return false;
    try {
      let memory = await PersonalMemory.findOne({ userId });
      if (!memory) {
        memory = new PersonalMemory({ userId, enabled, facts: [] });
      } else {
        memory.enabled = enabled;
        memory.lastInteraction = new Date();
      }
      await memory.save();

      this.auditLog({
        timestamp: new Date(),
        eventType: "MEMORY_TOGGLED",
        userId,
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Consulta los hechos antiguos de la colección UserMemory en MODO SOLO LECTURA.
   * Estos recuerdos NO se inyectan en ningún prompt de IA a menos que el usuario
   * los confirme explícitamente uno a uno.
   */
  static async getLegacyFacts(
    userId: string,
  ): Promise<Array<{ guildId: string; fact: string; createdAt: Date }>> {
    if (!userId || mongoose.connection.readyState !== 1) return [];
    try {
      const legacyDocs = await UserMemory.find({ userId }).lean();
      const legacyFacts: Array<{ guildId: string; fact: string; createdAt: Date }> = [];

      for (const doc of legacyDocs) {
        for (const f of doc.facts || []) {
          legacyFacts.push({
            guildId: doc.guildId,
            fact: f.fact,
            createdAt: f.createdAt || new Date(),
          });
        }
      }
      return legacyFacts;
    } catch (err) {
      console.error("[PersonalMemoryService] Error consultando recuerdos legados:", err);
      return [];
    }
  }

  /**
   * Migración consentida de un recuerdo legado tras confirmación explícita del usuario.
   */
  static async confirmLegacyFact(
    userId: string,
    factText: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!userId || !factText) {
      return { success: false, message: "Datos de confirmación incompletos." };
    }
    if (!this.isDbAvailable()) {
      return { success: false, message: "Base de datos no disponible." };
    }

    try {
      const normalized = factText.trim();
      let memory = await PersonalMemory.findOne({ userId });
      if (!memory) {
        memory = new PersonalMemory({ userId, enabled: true, facts: [] });
      }

      if (!memory.enabled) {
        return {
          success: false,
          message: "Tu memoria está desactivada. Actívala antes de migrar recuerdos.",
        };
      }

      const exists = memory.facts.some(
        (f) => f.fact.toLowerCase() === normalized.toLowerCase(),
      );
      if (exists) {
        return {
          success: false,
          message: "Ese recuerdo ya existe en tu memoria personal global.",
        };
      }

      if (memory.facts.length >= MAX_FACTS) {
        return {
          success: false,
          message: `Tu memoria ha alcanzado el límite de ${MAX_FACTS} recuerdos.`,
        };
      }

      const factId = `leg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      memory.facts.push({
        id: factId,
        category: "custom",
        fact: normalized,
        source: "legacy_migrated_confirmed",
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      memory.lastInteraction = new Date();
      await memory.save();

      // Eliminar el hecho de UserMemory para que no vuelva a listarse
      try {
        await UserMemory.updateMany(
          { userId },
          { $pull: { facts: { fact: normalized } } },
        );
      } catch {}

      this.auditLog({
        timestamp: new Date(),
        eventType: "LEGACY_CONFIRMED",
        userId,
        factId,
      });

      return {
        success: true,
        message: "Recuerdo confirmado y migrado a tu memoria personal global 🌸",
      };
    } catch {
      return { success: false, message: "Error al migrar recuerdo." };
    }
  }

  /**
   * Purgado de hechos no confirmados tras el periodo de gracia de 60 días.
   */
  static async purgeUnconfirmedLegacyMemories(): Promise<number> {
    if (mongoose.connection.readyState !== 1) return 0;
    try {
      const result = await UserMemory.deleteMany({});
      console.log(
        `[PRIVACY_AUDIT] Purga de UserMemory legacy completada: ${result.deletedCount} registros eliminados tras vencimiento del periodo de gracia.`,
      );
      return result.deletedCount || 0;
    } catch (err) {
      console.error("[PersonalMemoryService] Error en purga de UserMemory:", err);
      return 0;
    }
  }
}
