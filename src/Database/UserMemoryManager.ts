import UserMemory from "../Models/UserMemory";

const MAX_FACTS = 25;

export class UserMemoryManager {
  static async getFacts(userId: string, guildId: string): Promise<string[]> {
    const memory = await UserMemory.findOne({ userId, guildId });
    if (!memory || memory.facts.length === 0) return [];
    // Retorna los más recientes primero — más relevantes para el contexto
    return [...memory.facts]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 15)
      .map((f) => f.fact);
  }

  static async addFacts(
    userId: string,
    guildId: string,
    newFacts: string[],
  ): Promise<void> {
    if (!newFacts || newFacts.length === 0) return;

    let memory = await UserMemory.findOne({ userId, guildId });
    if (!memory) {
      memory = new UserMemory({ userId, guildId, facts: [] });
    }

    const existingFacts = memory.facts.map((f) => f.fact.toLowerCase());

    for (const fact of newFacts) {
      const normalized = fact.trim();
      if (!normalized) continue;

      // Deduplicación por similitud de palabras
      const isDuplicate = existingFacts.some((ef) => {
        if (ef === normalized.toLowerCase()) return true;
        const wordsA = new Set(ef.split(" "));
        const wordsB = normalized.toLowerCase().split(" ");
        const shared = wordsB.filter((w) => wordsA.has(w)).length;
        return shared / Math.max(wordsA.size, wordsB.length) > 0.8;
      });

      if (isDuplicate) continue;

      memory.facts.push({ fact: normalized, createdAt: new Date() });
      existingFacts.push(normalized.toLowerCase());
    }

    // Si supera el límite, conserva los más recientes
    if (memory.facts.length > MAX_FACTS) {
      memory.facts = memory.facts
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, MAX_FACTS);
    }

    memory.updatedAt = new Date();
    await memory.save();
  }

  static async clearMemory(userId: string, guildId: string): Promise<void> {
    await UserMemory.deleteOne({ userId, guildId });
  }

  static async clearGuildMemory(guildId: string): Promise<void> {
    await UserMemory.deleteMany({ guildId });
  }

  static async deleteFact(
    userId: string,
    guildId: string,
    index: number,
  ): Promise<boolean> {
    const memory = await UserMemory.findOne({ userId, guildId });
    if (!memory || index < 0 || index >= memory.facts.length) return false;
    memory.facts.splice(index, 1);
    memory.updatedAt = new Date();
    await memory.save();
    return true;
  }
}
