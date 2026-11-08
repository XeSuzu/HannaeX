import { DynamicKeyword, KeywordCategory } from "../../../Database/ai/dynamicKeyword.model";
import { STOPWORDS, normalizeSearchToken } from "./KeywordTaxonomy";

export class DynamicKeywordRegistry {
  private static instance: DynamicKeywordRegistry | null = null;
  private readonly inMemoryCache = new Set<string>();
  private lastSyncTimestamp = 0;
  private isSyncing = false;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

  private constructor() {
    this.syncFromDb().catch(() => null);
  }

  static getInstance(): DynamicKeywordRegistry {
    if (!DynamicKeywordRegistry.instance) {
      DynamicKeywordRegistry.instance = new DynamicKeywordRegistry();
    }
    return DynamicKeywordRegistry.instance;
  }

  /**
   * Sincroniza las palabras clave activas desde MongoDB a memoria.
   */
  async syncFromDb(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      // Si Mongoose no está conectado aún, reintentar silenciosamente en el siguiente ciclo
      const docs = await DynamicKeyword.find({ status: "active" })
        .select("keyword")
        .lean()
        .exec()
        .catch(() => []);

      for (const doc of docs) {
        if (doc && doc.keyword) {
          this.inMemoryCache.add(doc.keyword.toLowerCase().trim());
        }
      }
      this.lastSyncTimestamp = Date.now();
    } catch (err) {
      // Ignorar errores transitorios de DB para no bloquear el flujo de chat
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Verifica si un término o frase existe en el registro de palabras aprendidas activas.
   */
  hasLearnedKeyword(text: string): boolean {
    const now = Date.now();
    if (now - this.lastSyncTimestamp > this.SYNC_INTERVAL_MS) {
      // Disparar sincronización asíncrona en segundo plano sin bloquear
      this.syncFromDb().catch(() => null);
    }

    const clean = normalizeSearchToken(text);
    if (!clean) return false;

    // 1. Chequeo exacto
    if (this.inMemoryCache.has(clean)) return true;

    // 2. Chequeo de inclusión de sub-tokens o términos compuestos registrados
    for (const learned of this.inMemoryCache) {
      if (clean.includes(learned)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gatekeeper de validación para registrar nuevas palabras clave descubiertas o manuales.
   */
  private isValidCandidate(raw: string): boolean {
    const clean = normalizeSearchToken(raw);
    if (!clean || clean.length < 3 || clean.length > 35) return false;
    if (STOPWORDS.has(clean)) return false;
    // Descartar si son solo números o caracteres especiales
    if (/^[0-9\s._-]+$/.test(clean)) return false;
    // Descartar insultos o palabras ofensivas básicas
    if (/\b(mierda|puta|puto|pendejo|estupido|idiota|verga|concha)\b/i.test(clean)) return false;
    return true;
  }

  /**
   * Registra y aprende términos nuevos derivados de Google Search Grounding o añadidos manualmente.
   */
  async recordLearnedKeywords(
    terms: string[],
    category: KeywordCategory = "general",
    source: "auto_discovered" | "manual" = "auto_discovered",
  ): Promise<string[]> {
    const recorded: string[] = [];

    for (const raw of terms) {
      const clean = normalizeSearchToken(raw);
      if (!this.isValidCandidate(clean)) continue;

      // Inmediatamente añadir a la caché en memoria para disponibilidad instantánea
      this.inMemoryCache.add(clean);
      recorded.push(clean);

      // Persistir de forma segura en MongoDB con upsert
      DynamicKeyword.findOneAndUpdate(
        { keyword: clean },
        {
          $inc: { hits: 1 },
          $setOnInsert: {
            category,
            source,
            status: "active",
          },
          $set: { lastSeenAt: new Date() },
        },
        { upsert: true, new: true },
      ).catch(() => null);
    }

    return recorded;
  }

  /**
   * Devuelve todos los términos aprendidos en memoria (para auditorías o tests).
   */
  getAllLearnedKeywords(): string[] {
    return Array.from(this.inMemoryCache);
  }
}
