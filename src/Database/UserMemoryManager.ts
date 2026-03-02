import UserMemory from "../Models/UserMemory";

const MAX_FACTS = 20; // Límite de facts por usuario para no inflar el prompt

export class UserMemoryManager {
  /**
   * Obtiene los facts de un usuario en un servidor
   */
  static async getFacts(userId: string, guildId: string): Promise<string[]> {
    const memory = await UserMemory.findOne({ userId, guildId });
    if (!memory || memory.facts.length === 0) return [];
    return memory.facts.map((f) => f.fact);
  }

  /**
   * Agrega nuevos facts a la memoria del usuario.
   * Evita duplicados y respeta el límite máximo.
   */
  static async addFacts(userId: string, guildId: string, newFacts: string[]): Promise<void> {
    if (!newFacts || newFacts.length === 0) return;

    let memory = await UserMemory.findOne({ userId, guildId });

    if (!memory) {
      memory = new UserMemory({ userId, guildId, facts: [] });
    }

    const existingFacts = memory.facts.map((f) => f.fact.toLowerCase());

    for (const fact of newFacts) {
      const normalized = fact.trim();
      if (!normalized) continue;

      // Evitar duplicados aproximados
      const isDuplicate = existingFacts.some((ef) => ef === normalized.toLowerCase());
      if (isDuplicate) continue;

      memory.facts.push({ fact: normalized, createdAt: new Date() });
    }

    // Si supera el límite, eliminamos los más antiguos
    if (memory.facts.length > MAX_FACTS) {
      memory.facts = memory.facts.slice(memory.facts.length - MAX_FACTS);
    }

    memory.updatedAt = new Date();
    await memory.save();
  }

  /**
   * Borra toda la memoria de un usuario en un servidor
   */
  static async clearMemory(userId: string, guildId: string): Promise<void> {
    await UserMemory.deleteOne({ userId, guildId });
  }

  /**
   * Borra toda la memoria de todos los usuarios de un servidor
   */
  static async clearGuildMemory(guildId: string): Promise<void> {
    await UserMemory.deleteMany({ guildId });
  }

  static async deleteFact(userId: string, guildId: string, index: number): Promise<boolean> {
  const memory = await UserMemory.findOne({ userId, guildId });
  if (!memory || index < 0 || index >= memory.facts.length) return false;

  memory.facts.splice(index, 1);
  memory.updatedAt = new Date();
  await memory.save();
  return true;
}
}