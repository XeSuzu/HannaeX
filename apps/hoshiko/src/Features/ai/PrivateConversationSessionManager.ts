import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { TopicCompactor } from "../../Core/AI/Session/TopicCompactor";

export interface IConversationTurn {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface IPrivateSession {
  sessionId: string;
  userId: string;
  channelId: string;
  turns: IConversationTurn[];
  topicSummary?: string;
  lastActive: number;
}

export class PrivateConversationSessionManager {
  private static cache = new LocalCacheService<IPrivateSession>("ai_user_sessions", {
    max: 10000,
    ttlMs: 15 * 60 * 1000, // 15 minutos de inactividad
    updateAgeOnGet: true,
  });

  static getSession(userId: string, channelId: string): IPrivateSession {
    const key = `${userId}:${channelId}`;
    const existing = this.cache.get(key);
    if (existing) return existing;

    const newSession: IPrivateSession = {
      sessionId: key,
      userId,
      channelId,
      turns: [],
      lastActive: Date.now(),
    };
    this.cache.set(key, newSession);
    return newSession;
  }

  static getSessionTurns(userId: string, channelId: string): IConversationTurn[] {
    const session = this.getSession(userId, channelId);
    return [...session.turns];
  }

  static getSessionContext(
    userId: string,
    channelId: string,
  ): { turns: IConversationTurn[]; topicSummary?: string } {
    const session = this.getSession(userId, channelId);
    return {
      turns: session.turns.slice(-6),
      topicSummary: session.topicSummary,
    };
  }

  static appendTurn(
    userId: string,
    channelId: string,
    turn: IConversationTurn,
  ): void {
    const session = this.getSession(userId, channelId);
    session.turns.push(turn);

    // Si la sesión supera 6 turnos, compactar temáticamente los turnos previos
    if (session.turns.length > 6) {
      const overflowTurns = session.turns.slice(0, session.turns.length - 6);
      session.topicSummary = TopicCompactor.compactTurns(
        overflowTurns,
        session.topicSummary,
      );
    }

    // Ventana máxima de retención física de 10 turnos (5 interacciones completas)
    if (session.turns.length > 10) {
      session.turns = session.turns.slice(-10);
    }

    session.lastActive = Date.now();
    this.cache.set(`${userId}:${channelId}`, session);
  }

  static clearSession(userId: string, channelId: string): void {
    this.cache.delete(`${userId}:${channelId}`);
  }
}
