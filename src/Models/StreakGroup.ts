import {Schema, model, Document, Types} from 'mongoose';

// Tipos
/** Tipo de racha: duo (exactamente 2 miembros fijos) o grupo (3-5, editable) */
export type StreakType = 'duo' | 'group';

/**
 * Estado actual de la racha:
 * - active:    corriendo con normalidad
 * - frozen:    un miembro falló pero tenía freeze; el ciclo se "congela" un día
 * - dissolved: el propietario disolvió el grupo manualmente
 */
export type StreakStatus = "active" | "frozen" | "dissolved";

/**
 * Tier visual de la racha según días consecutivos actuales.
 * Se recalcula en cada ciclo exitoso usando getStreakTier().
  *  Tier 1: Mayoi    · "Uy, hola..."                 🖤
  *  Tier 2: Ketsui   · "Espera, ya voy en serio"     🔥
  *  Tier 3: Aruki   · "Algo está pasando aquí"      💜
  *  Tier 4: Negai  · "Ya casi, ya casi..."         🌌
  *  Tier 5: Arashi i   · "¿Cómo que aquí sigo?"        🌈
  *  Tier 6: Kiseki   · "Ni yo me lo creo"            👑
 */
export type StreakTier =
  | "Mayoi"
  | "Ketsui"
  | "Aruki"
  | "Negai"
  | "Arashi"
  | "Kiseki";

// Sub Interfaces

/** Registro histórico de cada vez que la racha se rompió */
export interface IBreakHistory {
  /** Fecha y hora exacta en que se detectó la rotura (cierre de ciclo) */
  brokenAt: Date;
  /** Días de racha que se tenían cuando se rompió */
  daysReached: number;
  /** Causa: fallo de miembro(s) o disolución manual por el propietario */
  reason: "member_failure" | "dissolved";
}

/**
 * Snapshot de un miembro en el momento de entrar al Hall of Fame.
 * Se guarda permanentemente para mostrar en la ceremonia y la card HoF,
 * incluso si el miembro sale del grupo después.
 */
export interface IMemberSnapshot {
  /** Discord userId */
  userId: string;
  /** Username en Discord al momento del logro */
  username: string;
  /** URL del avatar en Discord al momento del logro */
  avatarUrl: string;
  /** Total de claims acumulados por este miembro hasta el momento del logro */
  totalClaims: number;
}

/**
 * Datos del Hall of Fame del grupo.
 * Es un logro permanente: una vez achieved=true, nunca vuelve a false.
 * El badge se mantiene aunque la racha se rompa después.
 */
export interface IHallOfFameData {
  /** true una vez que se cumplen TODOS los requisitos y se otorga el HoF */
  achieved: boolean;
  /**
   * Número histórico global del bot (#1, #2, #3...).
   * Se asigna atómicamente con $inc desde la colección Counters.
   * null hasta que achieved sea true.
   */
  entryNumber: number | null;
  /** Fecha y hora exacta en que se cumplió el requisito de 100 días */
  achievedAt: Date | null;
  /** Foto fija de todos los miembros en el momento del logro */
  memberSnapshots: IMemberSnapshot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFAZ PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export interface IStreakGroup extends Document {
  _id: Types.ObjectId;

  // ── Identidad ──────────────────────────────────────────────────────────────

  /** Nombre visible del grupo (máx 32 caracteres) */
  name: string;
  /** Tipo de racha: duo o grupo */
  type: StreakType;
  /** Discord userId del creador/propietario. En duos no puede cambiar. En grupos hereda al más activo si sale. */
  ownerId: string;
  /** Discord guildId donde se creó la racha */
  guildId: string;
  /** Discord channelId donde se creó. Aquí se envía la ceremonia HoF. */
  createdInChannelId: string;

  // ── Estado actual ──────────────────────────────────────────────────────────

  /** Estado operativo actual de la racha */
  status: StreakStatus;
  /** Días consecutivos de la carrera actual (se resetea a 0 si se rompe) */
  currentStreak: number;
  /** Máximo histórico de días consecutivos alcanzado alguna vez */
  bestStreak: number;
  /** Tier visual calculado a partir de currentStreak */
  tier: StreakTier;
  /** Array de Discord userIds de los miembros actuales del grupo */
  memberIds: string[];

  // ── Sistema de ventana móvil 24h ───────────────────────────────────────────

  /**
   * Hora exacta del PRIMER claim del grupo en toda su historia.
   * Define el ancla de todos los ciclos: ciclo N empieza en anchorAt + N*24h.
   * null hasta que alguien reclame por primera vez.
   * NUNCA se modifica después de ser asignado.
   */
  windowAnchorAt: Date | null;

  /**
   * Inicio de la carrera actual (se actualiza cuando se reinicia a 0).
   * Usado para calcular la "continuidad" requerida para el HoF.
   * null hasta el primer claim.
   */
  currentRunStartAt: Date | null;

  // ── Métricas de ciclos (para HoF sin escanear historial) ──────────────────

  /** Total de ciclos cerrados (exitosos + fallidos + congelados) */
  totalCycles: number;
  /**
   * Ciclos donde TODOS los miembros reclamaron dentro de su ventana de 24h.
   * punctualDays / totalCycles >= 0.90 es requisito para HoF.
   */
  punctualDays: number;

  // ── Flags de integridad para Hall of Fame ─────────────────────────────────

  /**
   * true mientras la racha NUNCA se haya roto.
   * Se pone false permanentemente al primer reinicio a 0.
   * Es el flag más crítico para el HoF (debe ser true).
   */
  neverBroken: boolean;

  /**
   * true si en algún momento la racha llegó a 0 y volvió a subir.
   * Invalida el requisito de "continuidad" del HoF.
   */
  hasRebuiltEver: boolean;

  /**
   * Total de días congelados acumulados en toda la historia.
   * No puede superar 3 para calificar al HoF.
   */
  frozenDaysTotal: number;

  // ── Historial ──────────────────────────────────────────────────────────────

  /** Fecha del último ciclo cerrado exitosamente */
  lastClaimedAt: Date | null;
  /** Contador de veces que la racha se rompió (para categoría especial en top) */
  timesRoken: number;
  /**
   * Timestamp de la última vez que el cron de cierre de ciclos procesó este grupo.
   * Usado para idempotencia y evitar doble procesamiento si el cron se solapa.
   */
  lastProcessedAt: Date | null;
  /** Historial completo de roturas */
  breakHistory: IBreakHistory[];

  // ── Hall of Fame ───────────────────────────────────────────────────────────

  /** Datos del logro Hall of Fame. Permanente una vez alcanzado. */
  hallOfFame: IHallOfFameData;

  // ── Premium (preparado, no activo aún) ────────────────────────────────────

  /**
   * true si el grupo tiene premium activo.
   * Desbloquea: hasta 10 miembros, estadísticas avanzadas,
   * transferencia de propiedad, eventos privados, card animada GIF.
   */
  isPremiumGroup: boolean;

  // ── Timestamps automáticos (Mongoose) ─────────────────────────────────────

  /** Fecha de creación del grupo (automático por timestamps:true) */
  createdAt: Date;
  /** Última modificación del documento (automático por timestamps:true) */
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const BreakHistorySchema = new Schema<IBreakHistory>(
  {
    brokenAt:    { type: Date,   required: true },
    daysReached: { type: Number, required: true },
    reason:      { type: String, enum: ["member_failure", "dissolved"], required: true },
  },
  { _id: false } // no necesita _id propio, es un subdocumento embebido
);

const MemberSnapshotSchema = new Schema<IMemberSnapshot>(
  {
    userId:      { type: String, required: true },
    username:    { type: String, required: true },
    avatarUrl:   { type: String, required: true },
    totalClaims: { type: Number, required: true },
  },
  { _id: false }
);

const HallOfFameSchema = new Schema<IHallOfFameData>(
  {
    achieved:        { type: Boolean, default: false },
    entryNumber:     { type: Number,  default: null  },
    achievedAt:      { type: Date,    default: null  },
    memberSnapshots: { type: [MemberSnapshotSchema], default: [] },
  },
  { _id: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const StreakGroupSchema = new Schema<IStreakGroup>(
  {
    name:               { type: String, required: true, maxlength: 32 },
    type:               { type: String, enum: ["duo", "group"], required: true },
    ownerId:            { type: String, required: true },
    guildId:            { type: String, required: true },
    createdInChannelId: { type: String, required: true },

    status:        { type: String, enum: ["active", "frozen", "dissolved"], default: "active" },
    currentStreak: { type: Number, default: 0, min: 0 },
    bestStreak:    { type: Number, default: 0, min: 0 },
    tier: {
      type:    String,
      enum:    ["Mayoi", "Ketsui", "Aruki", "Negai", "Arashi", "Kiseki"] as
      string[],
      default: "Mayoi" as StreakTier,
    },
    memberIds: { type: [String], required: true },

    windowAnchorAt:    { type: Date, default: null },
    currentRunStartAt: { type: Date, default: null },

    totalCycles:  { type: Number, default: 0, min: 0 },
    punctualDays: { type: Number, default: 0, min: 0 },

    neverBroken:     { type: Boolean, default: true  },
    hasRebuiltEver:  { type: Boolean, default: false },
    frozenDaysTotal: { type: Number,  default: 0, min: 0 },

    lastClaimedAt: { type: Date,   default: null },
    timesRoken:    { type: Number, default: 0, min: 0 },
    lastProcessedAt: { type: Date, default: null },
    breakHistory:  { type: [BreakHistorySchema], default: [] },

    hallOfFame: { type: HallOfFameSchema, default: () => ({}) },

    isPremiumGroup: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "streak_groups",
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ÍNDICES
// ─────────────────────────────────────────────────────────────────────────────

// /racha top → activas ahora (query más frecuente; sigue regla ESR de MongoDB)
StreakGroupSchema.index(
  { status: 1, currentStreak: -1 },
  { name: "idx_top_active" }
);

// /racha top → históricas (por bestStreak sin importar status)
StreakGroupSchema.index(
  { bestStreak: -1 },
  { name: "idx_top_best" }
);

// /racha top → filtro Duos o Grupos
StreakGroupSchema.index(
  { type: 1, status: 1, currentStreak: -1 },
  { name: "idx_top_by_type" }
);

// /racha top → pestaña Hall of Fame ordenada por número histórico de entrada
StreakGroupSchema.index(
  { "hallOfFame.achieved": 1, "hallOfFame.entryNumber": 1 },
  { name: "idx_hof_by_entry" }
);

// "Mis rachas": todas las rachas donde aparece un userId
StreakGroupSchema.index(
  { memberIds: 1, status: 1 },
  { name: "idx_member_streaks" }
);

// Buscar grupos donde el usuario es propietario (ajustes, herencia)
StreakGroupSchema.index(
  { ownerId: 1 },
  { name: "idx_owner" }
);

// Categoría especial 👑 "Más veces reconstruida" en top
StreakGroupSchema.index(
  { timesRoken: -1 },
  { name: "idx_most_broken" }
);

// Cron: detectar grupos activos con ciclo vencido sin procesar
StreakGroupSchema.index(
  { status: 1, windowAnchorAt: 1 },
  { name: "idx_cycle_check" }
);

export const StreakGroup = model<IStreakGroup>("StreakGroup", StreakGroupSchema);