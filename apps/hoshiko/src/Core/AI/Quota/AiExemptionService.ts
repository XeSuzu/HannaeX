import mongoose from "mongoose";
import AiTester from "../../../Database/ai/aiTester.model";

export type ExemptionRole = "developer" | "tester" | "none";

export interface QuotaExemptionResult {
  exempt: boolean;
  role: ExemptionRole;
}

export class AiExemptionService {
  // Caché y fallback en memoria para tests y respuesta en submilisegundos
  private static memoryTesters = new Map<string, Set<string>>(); // guildId -> Set<userId>
  private static developerOverrides = new Set<string>();

  private static isDbAvailable(): boolean {
    return mongoose.connection.readyState === 1;
  }

  static setDeveloperOverride(userId: string, active: boolean): void {
    if (active) {
      this.developerOverrides.add(userId);
    } else {
      this.developerOverrides.delete(userId);
    }
  }

  static isDeveloper(userId: string): boolean {
    if (!userId) return false;
    if (this.developerOverrides.has(userId)) return true;

    const ownerId = process.env.BOT_OWNER_ID;
    const devId = process.env.DEVELOPER_ID;

    if (ownerId && userId === ownerId) return true;
    if (devId && userId === devId) return true;

    return false;
  }

  static async isTester(userId: string, guildId: string): Promise<boolean> {
    if (!userId || !guildId) return false;

    // 1. Verificación rápida en memoria
    const guildSet = this.memoryTesters.get(guildId);
    if (guildSet && guildSet.has(userId)) {
      return true;
    }

    // 2. Consulta a base de datos
    if (this.isDbAvailable()) {
      try {
        const found = await AiTester.findOne({ guildId, userId }).lean();
        if (found) {
          if (!guildSet) {
            this.memoryTesters.set(guildId, new Set([userId]));
          } else {
            guildSet.add(userId);
          }
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  static async hasQuotaExemption(
    userId: string,
    guildId?: string | null,
  ): Promise<QuotaExemptionResult> {
    // 1. Developer: Exención global incondicional
    if (this.isDeveloper(userId)) {
      return { exempt: true, role: "developer" };
    }

    // 2. Tester: Exención condicionada estrictamente a userId + guildId
    if (guildId && (await this.isTester(userId, guildId))) {
      return { exempt: true, role: "tester" };
    }

    // 3. Usuario ordinario
    return { exempt: false, role: "none" };
  }

  static async addTester(
    guildId: string,
    userId: string,
    invitedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!guildId || !userId) {
      return { success: false, message: "Datos de tester incompletos." };
    }

    let guildSet = this.memoryTesters.get(guildId);
    if (!guildSet) {
      guildSet = new Set<string>();
      this.memoryTesters.set(guildId, guildSet);
    }

    if (guildSet.has(userId)) {
      return { success: false, message: "Este usuario ya se encuentra registrado como tester en este servidor." };
    }

    guildSet.add(userId);

    if (this.isDbAvailable()) {
      try {
        await AiTester.findOneAndUpdate(
          { guildId, userId },
          { guildId, userId, invitedBy },
          { upsert: true, new: true },
        );
      } catch (err: any) {
        console.error("[AiExemptionService] Error guardando tester en MongoDB:", err);
      }
    }

    return {
      success: true,
      message: `¡Usuario <@${userId}> autorizado exitosamente como tester en este servidor! ✨`,
    };
  }

  static async removeTester(
    guildId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!guildId || !userId) {
      return { success: false, message: "Datos de tester incompletos." };
    }

    const guildSet = this.memoryTesters.get(guildId);
    if (guildSet) {
      guildSet.delete(userId);
    }

    if (this.isDbAvailable()) {
      try {
        const deleted = await AiTester.findOneAndDelete({ guildId, userId });
        if (!deleted && (!guildSet || !guildSet.has(userId))) {
          return { success: false, message: "El usuario no estaba registrado como tester en este servidor." };
        }
      } catch {
        return { success: false, message: "Error al remover tester de la base de datos." };
      }
    }

    return {
      success: true,
      message: `Se ha retirado la condición de tester a <@${userId}>. A partir de ahora usará las cuotas normales en este servidor.`,
    };
  }

  static async listTesters(
    guildId: string,
  ): Promise<Array<{ userId: string; invitedBy?: string; createdAt?: Date }>> {
    if (!guildId) return [];

    if (this.isDbAvailable()) {
      try {
        const docs = await AiTester.find({ guildId }).lean();
        return docs.map((d) => ({
          userId: d.userId,
          invitedBy: d.invitedBy,
          createdAt: d.createdAt,
        }));
      } catch {
        // Fallback a memoria
      }
    }

    const guildSet = this.memoryTesters.get(guildId);
    if (!guildSet) return [];
    return Array.from(guildSet).map((uId) => ({ userId: uId }));
  }

  static clearMemory(): void {
    this.memoryTesters.clear();
    this.developerOverrides.clear();
  }
}
