import { Schema, model, Document, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estado del miembro en el ciclo actual:
 * - pending: aún no ha reclamado en este ciclo
 * - claimed: ya reclamó (dentro o fuera de ventana)
 * - missed:  el ciclo cerró sin que reclamara (sin freeze activo)
 */
export type MemberDailyStatus = "pending" | "claimed" | "missed";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFAZ PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export interface IStreakMember extends Document {
  _id: Types.ObjectId;

  // ── Relación ───────────────────────────────────────────────────────────────

  /** Discord userId del miembro */
  userId: string;
  /** Referencia al StreakGroup al que pertenece */
  groupId: Types.ObjectId;

  // ── Estado del ciclo actual ────────────────────────────────────────────────

  /** Estado del miembro en el ciclo que está corriendo ahora */
  dailyStatus: MemberDailyStatus;
  /** Fecha y hora exacta de su último reclamo exitoso */
  lastClaimedAt: Date | null;
  /** Fecha en que se unió al grupo */
  joinedAt: Date;

  /**
   * true si el último claim se hizo dentro de la ventana de 24h del grupo.
   * Se usa para calcular punctualDays a nivel grupo al cerrar el ciclo.
   */
  lastClaimWasPunctual: boolean;

  // ── Control de ciclo (idempotencia) ───────────────────────────────────────

  /**
   * Índice numérico del último ciclo que este miembro procesó.
   * Se calcula como floor((now - windowAnchorAt) / 86400000).
   * Evita que un mismo claim se procese dos veces si el bot se cae y reinicia.
   */
  lastProcessedCycle: number;

  // ── Validación Hall of Fame ────────────────────────────────────────────────

  /**
   * Días consecutivos que este miembro no ha reclamado (missed seguidos).
   * Si llega a 14, invalida el requisito HoF del grupo de "nadie falla 2 semanas".
   * Se resetea a 0 cuando el miembro reclama exitosamente.
   */
  consecutiveMissDays: number;

  // ── Sistema de freeze ──────────────────────────────────────────────────────

  /**
   * Freezes disponibles actualmente.
   * Free: máx 1 (se recarga cada 14 días).
   * Premium: máx 3 siempre disponibles.
   */
  freezesAvailable: number;
  /** Fecha del último freeze usado (para calcular recarga en free) */
  lastFreezeUsedAt: Date | null;
  /**
   * true si el miembro ya usó su freeze en el ciclo actual.
   * Se resetea a false al cerrar cada ciclo.
   * Mientras sea true, el cron no lo cuenta como "missed".
   */
  freezeUsedToday: boolean;

  // ── Estadísticas acumuladas ────────────────────────────────────────────────

  /** Total de claims exitosos del miembro en este grupo (para snapshot HoF) */
  totalClaims: number;
  /** Total de misses del miembro en este grupo */
  totalMisses: number;

  // ── Badge Hall of Fame (permanente) ───────────────────────────────────────

  /**
   * true si este miembro estuvo en un grupo que alcanzó el Hall of Fame.
   * NUNCA se quita, incluso si el miembro sale del grupo o la racha se rompe después.
   * Se muestra como badge dorado en TODAS sus cards futuras.
   */
  hofBadge: boolean;
  /**
   * ID del StreakGroup del que viene el badge.
   * Permite mostrar "Obtenido con [nombre del grupo]" en el perfil futuro.
   */
  hofBadgeFromGroupId: Types.ObjectId | null;

  // ── Premium ────────────────────────────────────────────────────────────────

  /**
   * true si el miembro tiene premium personal activo.
   * Desbloquea: más rachas activas (ilimitadas), 3 freezes permanentes,
   * cards exclusivas, historial detallado, privacidad en top.
   */
  isPremium: boolean;

  // ── Timestamps automáticos (Mongoose) ─────────────────────────────────────

  /** Fecha de creación del documento (automático) */
  createdAt: Date;
  /** Última modificación (automático) */
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const StreakMemberSchema = new Schema<IStreakMember>(
  {
    userId:  { type: String,                required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "StreakGroup", required: true },

    dailyStatus:          { type: String,  enum: ["pending", "claimed", "missed"], default: "pending" },
    lastClaimedAt:        { type: Date,    default: null  },
    joinedAt:             { type: Date,    default: Date.now },
    lastClaimWasPunctual: { type: Boolean, default: false },

    lastProcessedCycle:  { type: Number, default: -1         },
    consecutiveMissDays: { type: Number, default: 0,  min: 0 },

    freezesAvailable: { type: Number,  default: 1,     min: 0 },
    lastFreezeUsedAt: { type: Date,    default: null          },
    freezeUsedToday:  { type: Boolean, default: false         },

    totalClaims: { type: Number, default: 0, min: 0 },
    totalMisses: { type: Number, default: 0, min: 0 },

    hofBadge:            { type: Boolean,               default: false },
    hofBadgeFromGroupId: { type: Schema.Types.ObjectId, default: null  },

    isPremium: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "streak_members",
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ÍNDICES
// ─────────────────────────────────────────────────────────────────────────────

// Unicidad: un usuario no puede aparecer dos veces en el mismo grupo
StreakMemberSchema.index(
  { userId: 1, groupId: 1 },
  { unique: true, name: "idx_unique_member_group" }
);

// "Mis rachas": todos los grupos de un usuario en una sola query
StreakMemberSchema.index(
  { userId: 1 },
  { name: "idx_user_all_groups" }
);

// Verificar cuántos miembros de un grupo ya reclamaron en el ciclo actual
StreakMemberSchema.index(
  { groupId: 1, dailyStatus: 1 },
  { name: "idx_group_daily_check" }
);

// Cron: poner todos en "pending" al iniciar un ciclo (reset masivo)
StreakMemberSchema.index(
  { dailyStatus: 1 },
  { name: "idx_daily_reset" }
);

export const StreakMember = model<IStreakMember>("StreakMember", StreakMemberSchema);
