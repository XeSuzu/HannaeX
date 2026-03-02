import mongoose, { ClientSession } from "mongoose";
import { StreakGroup, IStreakGroup, StreakTier } from "../Models/StreakGroup";
import { StreakMember }              from "../Models/StreakMember";
import { Counter }                   from "../Models/Counter";
import {
  getStreakTier,
  isCyclePunctual,
  getCurrentCycleIndex,
  meetsHofRequirements,
} from "../Utils/streakTier";
import { HoshikoClient } from "..";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: TRANSACCIÓN CON RETRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envuelve cualquier operación en una sesión MongoDB con transacción.
 * Reintenta automáticamente hasta 3 veces en caso de WriteConflict
 * (puede ocurrir cuando dos usuarios del mismo grupo reclaman al mismo tiempo).
 */
async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLAIM STREAK
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimResult =
  | {
      ok:            true;
      allClaimed:    boolean;  // true si este claim completó el ciclo
      currentStreak: number;
      hofAchieved:   boolean;  // true si este claim activó el Hall of Fame
      tierUp?:       { from: StreakTier; to: StreakTier };
    }
  | {
      ok:     false;
      reason:
        | "group_not_found"
        | "member_not_in_group"
        | "already_claimed"
        | "group_not_active"
        | "wrong_cycle";
    };

/**
 * Registra el check-in diario de un miembro en una racha.
 *
 * Flujo:
 *   1. Carga grupo + miembro con lock de escritura (dentro de transacción)
 *   2. Si es el primer claim del grupo, ancla windowAnchorAt = now
 *   3. Verifica idempotencia: si ya reclamó en este ciclo, devuelve early
 *   4. Marca al miembro como "claimed" y registra si fue puntual
 *   5. Cuenta si todos los miembros del grupo ya reclamaron
 *   6. Si todos: incrementa currentStreak, recalcula tier, resetea ciclo
 *   7. Verifica requisitos HoF si currentStreak llega a 100
 */
export async function claimStreak(
  userId:  string,
  groupId: string
): Promise<ClaimResult> {
  return withTransaction(async (session) => {
    const now = new Date();

    // ── Cargar grupo ──────────────────────────────────────────────────────
    const group = await StreakGroup
      .findById(groupId)
      .session(session);

    if (!group)                    return { ok: false, reason: "group_not_found"     };
    if (group.status !== "active") return { ok: false, reason: "group_not_active"    };
    if (!group.memberIds.includes(userId))
                                   return { ok: false, reason: "member_not_in_group" };

    // ── Cargar miembro ────────────────────────────────────────────────────
    const member = await StreakMember
      .findOne({ userId, groupId: group._id })
      .session(session);

    if (!member) return { ok: false, reason: "member_not_in_group" };

    // ── Anclar ventana si es el primer claim del grupo ────────────────────
    if (!group.windowAnchorAt) {
      group.windowAnchorAt    = now;
      group.currentRunStartAt = now;
    }

    const currentCycle = getCurrentCycleIndex(group.windowAnchorAt, now);

    // ── Idempotencia: ya reclamó en este ciclo ────────────────────────────
    if (
      member.lastProcessedCycle === currentCycle &&
      member.dailyStatus        === "claimed"
    ) {
      return { ok: false, reason: "already_claimed" };
    }

    // ── Ciclo ya cerrado (el cron lo procesó antes de que reclamara) ──────
    if (member.lastProcessedCycle > currentCycle) {
      return { ok: false, reason: "wrong_cycle" };
    }

    // ── Registrar claim del miembro ───────────────────────────────────────
    member.dailyStatus            = "claimed";
    member.lastClaimedAt          = now;
    member.lastClaimWasPunctual   = isCyclePunctual(group.windowAnchorAt, now);
    member.lastProcessedCycle     = currentCycle;
    member.consecutiveMissDays    = 0;
    member.totalClaims           += 1;
    await member.save({ session });

    // ── Verificar si todos los miembros ya reclamaron ─────────────────────
    // Cuenta miembros que siguen en "pending" sin freeze activo
    const stillPending = await StreakMember.countDocuments({
      groupId:         group._id,
      dailyStatus:     "pending",
      freezeUsedToday: false,
    }).session(session);

    const allClaimed = stillPending === 0;
    let   hofAchieved = false;
    let   tierUpInfo: { from: StreakTier; to: StreakTier } | undefined;

    if (allClaimed) {
      // ── Cerrar ciclo exitosamente ────────────────────────────────────────
      group.currentStreak += 1;
      group.totalCycles   += 1;

      if (group.currentStreak > group.bestStreak) {
        group.bestStreak = group.currentStreak;
      }

      // Puntualidad del ciclo: todos deben haber sido puntuales
      const impunctualCount = await StreakMember.countDocuments({
        groupId:              group._id,
        dailyStatus:          "claimed",
        lastClaimWasPunctual: false,
      }).session(session);

      if (impunctualCount === 0) group.punctualDays += 1;

      const oldTier = group.tier;
      group.tier = getStreakTier(group.currentStreak);
      group.lastClaimedAt = now;

      if (group.tier !== oldTier) {
        tierUpInfo = { from: oldTier, to: group.tier };
      }

      // Resetear ciclo: todos vuelven a "pending" para la siguiente ventana
      await StreakMember.updateMany(
        { groupId: group._id },
        { $set: { dailyStatus: "pending", freezeUsedToday: false } },
        { session }
      );

      // ── Verificar Hall of Fame ──────────────────────────────────────────
      if (!group.hallOfFame.achieved && group.currentStreak >= 100) {
        hofAchieved = await _awardHallOfFame(group, session);
      }
    }

    await group.save({ session });

    return { ok: true, allClaimed, currentStreak: group.currentStreak, hofAchieved, tierUp: tierUpInfo };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRON — CIERRE DE CICLOS VENCIDOS
// ─────────────────────────────────────────────────────────────────────────────

export type CronResult = {
  processed: number;
  frozen:    number;
  reset:     number;
  errors:    string[];
};

/**
 * Detecta grupos cuya ventana de 24h ya venció sin que todos reclamaran
 * y aplica la lógica de freeze o reset según las reglas del sistema.
 *
 * Reglas:
 *   - 0 missed:               ciclo ya fue cerrado por claimStreak(), nada que hacer
 *   - 1 missed con freeze:    descuenta freeze, ciclo exitoso (congelado cubierto)
 *   - 1 missed sin freeze:    grupo pasa a status "frozen", frozenDaysTotal++
 *   - 2+ missed:              racha se rompe, currentStreak = 0, inserta en breakHistory
 *
 * Idempotente: puede ejecutarse múltiples veces sin duplicar efectos.
 * Corre cada 15 minutos desde cronJobs.ts.
 */
export async function processMissedCycles(
  client: HoshikoClient
): Promise<CronResult> {
  const now    = new Date();
  const result: CronResult = { processed: 0, frozen: 0, reset: 0, errors: [] };

  // Leer grupos candidatos con lean() (más rápido, sin overhead de Mongoose)
  const groups = await StreakGroup.find({
    status:         "active",
    windowAnchorAt: { $ne: null },
  }).lean();

  for (const g of groups) {
    if (!g.windowAnchorAt) continue;

    const cycleMs       = 24 * 60 * 60 * 1000;
    const currentCycle  = getCurrentCycleIndex(g.windowAnchorAt, now);

    // El ciclo 0 no tiene ciclo anterior que procesar
    if (currentCycle < 1) continue;

    // Grupos sin ningún claim aún → nada que procesar
    if (!g.lastClaimedAt && !g.windowAnchorAt) continue;

    // Si windowAnchorAt existe pero nunca hubo claim, skip
    if (g.windowAnchorAt && !g.lastClaimedAt) {
      const firstCycleEnd = g.windowAnchorAt.getTime() + cycleMs;
      if (now.getTime() < firstCycleEnd) continue; // primer ciclo aún activo
    }

    const prevCycleIdx   = currentCycle - 1;
    const prevCycleStart = g.windowAnchorAt.getTime() + prevCycleIdx * cycleMs;
    const prevCycleEnd   = prevCycleStart + cycleMs;

    // Idempotencia: si lastClaimedAt está dentro del ciclo anterior → ya se cerró ok
    if (g.lastClaimedAt && g.lastClaimedAt.getTime() >= prevCycleStart) continue;

    // El ciclo anterior aún no venció del todo
    if (now.getTime() < prevCycleEnd) continue;

    try {
      const outcome = await _closeMissedCycle(g._id.toString(), prevCycleIdx, now, client);
      result.processed++;
      if (outcome === "frozen") result.frozen++;
      if (outcome === "reset")  result.reset++;
    } catch (err) {
      result.errors.push(`[${g._id}] ${(err as Error).message}`);
    }
  }

  return result;
}

/**
 * Cierra un ciclo vencido para un grupo específico dentro de una transacción.
 * Devuelve el outcome: "ok" | "frozen" | "reset" | "skipped"
 */
async function _closeMissedCycle(
  groupId:    string,
  cycleIndex: number,
  now:        Date,
  client:     HoshikoClient
): Promise<"ok" | "frozen" | "reset" | "skipped"> {
  return withTransaction(async (session) => {
    const group = await StreakGroup.findById(groupId).session(session);
    if (!group || group.status !== "active" || !group.windowAnchorAt) return "skipped";

    // Re-verificar idempotencia dentro de la transacción
    const currentCycle = getCurrentCycleIndex(group.windowAnchorAt, now);
    if (cycleIndex >= currentCycle) return "skipped";
    if (group.lastClaimedAt) {
      const cycleMs    = 24 * 60 * 60 * 1000;
      const cycleStart = group.windowAnchorAt.getTime() + cycleIndex * cycleMs;
      if (group.lastClaimedAt.getTime() >= cycleStart) return "skipped";
    }

    // Miembros que no reclamaron y no tienen freeze activo
    const missedMembers = await StreakMember.find({
      groupId:         group._id,
      dailyStatus:     "pending",
      freezeUsedToday: false,
    }).session(session);

    const missedCount = missedMembers.length;

    // Actualizar consecutiveMissDays para cada miembro que falló
    for (const m of missedMembers) {
      m.dailyStatus            = "missed";
      m.totalMisses           += 1;
      m.consecutiveMissDays   += 1;
      m.lastProcessedCycle     = cycleIndex;

      // Invalidar elegibilidad HoF si alguien falla 14 días seguidos
      if (m.consecutiveMissDays >= 14) {
        group.neverBroken = false;
      }

      await m.save({ session });
    }

    // Liberar freeze de quienes lo usaron hoy
    await StreakMember.updateMany(
      { groupId: group._id, freezeUsedToday: true },
      { $set: { freezeUsedToday: false, dailyStatus: "pending" } },
      { session }
    );

    group.totalCycles += 1;

    // ── Aplicar reglas ────────────────────────────────────────────────────
    let outcome: "ok" | "frozen" | "reset" = "ok";

    if (missedCount === 0) {
      // Todos reclamaron (cubiertos por freeze o claim normal)
      // Este caso raro ocurre si el cron corre antes de que claimStreak
      // cierre el ciclo — se cierra aquí igualmente
      group.currentStreak += 1;
      group.totalCycles   += 1; // ya se sumó arriba, restar el duplicado
      group.totalCycles   -= 1;
      group.punctualDays  += 1; // asumimos puntual si todos tenían freeze
      if (group.currentStreak > group.bestStreak) group.bestStreak = group.currentStreak;
      group.tier          = getStreakTier(group.currentStreak);
      group.lastClaimedAt = now;

    } else if (missedCount === 1) {
      const failed = missedMembers[0];

      if (failed.freezesAvailable > 0) {
        // Tiene freeze: úsalo automáticamente y mantén el ciclo como exitoso
        failed.freezesAvailable -= 1;
        failed.lastFreezeUsedAt  = now;
        failed.dailyStatus       = "claimed";
        await failed.save({ session });

        group.currentStreak  += 1;
        group.frozenDaysTotal += 1;
        if (group.currentStreak > group.bestStreak) group.bestStreak = group.currentStreak;
        group.tier           = getStreakTier(group.currentStreak);
        group.lastClaimedAt  = now;
        outcome = "frozen";

      } else {
        // Sin freeze: grupo se congela hasta que el propietario actúe
        group.status          = "frozen";
        group.frozenDaysTotal += 1;
        outcome = "frozen";
      }

    } else {
      // 2+ fallos: racha se rompe
      group.breakHistory.push({
        brokenAt:    now,
        daysReached: group.currentStreak,
        reason:      "member_failure",
      });
      const oldStreak = group.currentStreak;
      group.neverBroken       = false;
      group.hasRebuiltEver    = group.currentStreak > 0 || group.hasRebuiltEver;
      group.timesRoken       += 1;
      group.currentStreak     = 0;
      group.tier              = "Mayoi";
      group.currentRunStartAt = now;
      outcome = "reset";

      // ❗ Lógica de Notificación por DM
      const notificationMessage = `💀 ¡Oh, no! La racha **${group.name}** se ha roto. Habíais alcanzado **${oldStreak} días**. ¡Es hora de empezar de nuevo!`;
      for (const memberId of group.memberIds) {
        try {
          const user = await client.users.fetch(memberId);
          await user.send(notificationMessage);
        } catch (e) {
          // No se pudo enviar el DM (probablemente los tiene cerrados).
          // Se ignora el error para no detener el proceso.
        }
      }
    }

    // Resetear todos a "pending" para el nuevo ciclo
    await StreakMember.updateMany(
      { groupId: group._id },
      { $set: { dailyStatus: "pending" } },
      { session }
    );

    await group.save({ session });
    return outcome;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HALL OF FAME — CEREMONIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Otorga el Hall of Fame a un grupo que cumplió todos los requisitos.
 * Se llama DENTRO de una transacción existente (la de claimStreak).
 *
 * Pasos:
 *   1. Valida requisitos con meetsHofRequirements()
 *   2. Obtiene número histórico atómico con $inc en Counter
 *   3. Guarda snapshot de miembros (username/avatar se inyectan después desde Discord)
 *   4. Actualiza hallOfFame en el grupo
 *   5. Pone hofBadge = true en TODOS los StreakMember del grupo
 *
 * El caller (claimStreak) es responsable de:
 *   - Enviar el mensaje de ceremonia al canal createdInChannelId
 *   - Enviar DMs a cada miembro
 *   (esto se hace fuera del service, en el comando o un event emitter)
 *
 * @returns true si se otorgó, false si no cumple requisitos
 */
async function _awardHallOfFame(
  group:   IStreakGroup,
  session: ClientSession
): Promise<boolean> {
  const { eligible, checks } = meetsHofRequirements(group);
  if (!eligible) return false;

  // Número histórico atómico
  const counter = await Counter.findOneAndUpdate(
    { _id: "hofEntry" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  );
  const entryNumber = counter!.seq;

  // Snapshot de miembros
  // username y avatarUrl se rellenan en el caller con client.users.cache
  const members = await StreakMember
    .find({ groupId: group._id })
    .session(session);

  const memberSnapshots = members.map((m) => ({
    userId:      m.userId,
    username:    "",       // rellenar en el comando con client.users.fetch(userId)
    avatarUrl:   "",
    totalClaims: m.totalClaims,
  }));

  // Actualizar grupo
  group.hallOfFame = {
    achieved:        true,
    entryNumber,
    achievedAt:      new Date(),
    memberSnapshots,
  };
  // group.save() lo hace el caller (claimStreak) al final

  // Badge permanente a cada miembro
  await StreakMember.updateMany(
    { groupId: group._id },
    {
      $set: {
        hofBadge:            true,
        hofBadgeFromGroupId: group._id,
      },
    },
    { session }
  );

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FREEZE MANUAL
// ─────────────────────────────────────────────────────────────────────────────

export type FreezeResult =
  | { ok: true }
  | { ok: false; reason: "no_freezes" | "already_frozen" | "not_found" };

/**
 * El miembro usa un freeze manualmente antes de que venza su ciclo.
 * Marca freezeUsedToday = true para que el cron no lo cuente como "missed".
 */
export async function useFreeze(
  userId:  string,
  groupId: string
): Promise<FreezeResult> {
  return withTransaction(async (session) => {
    const member = await StreakMember
      .findOne({ userId, groupId })
      .session(session);

    if (!member)              return { ok: false, reason: "not_found"      };
    if (member.freezeUsedToday)   return { ok: false, reason: "already_frozen" };
    if (member.freezesAvailable <= 0) return { ok: false, reason: "no_freezes"     };

    member.freezeUsedToday   = true;
    member.freezesAvailable -= 1;
    member.lastFreezeUsedAt  = new Date();
    await member.save({ session });

    return { ok: true };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CREAR GRUPO / DUO
// ─────────────────────────────────────────────────────────────────────────────

export type CreateGroupResult =
  | { ok: true;  groupId: string }
  | { ok: false; reason:
        | "too_many_active_streaks"  // free: máx 3 rachas activas
        | "already_in_duo"           // no puede estar en 2 duos con la misma persona
        | "invalid_member_count" };  // duo=2, grupo=3-5

/**
 * Crea un nuevo grupo o duo después de que todos los invitados aceptaron.
 * La invitación y el flujo de aceptación se manejan en el comando, no aquí.
 *
 * @param ownerId    Discord userId del creador
 * @param memberIds  Array con TODOS los userIds (incluido el owner)
 * @param type       "duo" | "group"
 * @param name       Nombre del grupo
 * @param guildId    Discord guildId
 * @param channelId  Canal donde se creó (para ceremonia HoF)
 */
export async function createStreakGroup(
  ownerId:   string,
  memberIds: string[],
  type:      "duo" | "group",
  name:      string,
  guildId:   string,
  channelId: string
): Promise<CreateGroupResult> {
  return withTransaction(async (session) => {

    // Validar cantidad de miembros
    if (type === "duo"   && memberIds.length !== 2) return { ok: false, reason: "invalid_member_count" };
    if (type === "group" && (memberIds.length < 3 || memberIds.length > 5))
      return { ok: false, reason: "invalid_member_count" };

    // Verificar límite de rachas activas por miembro (free = 3)
    for (const uid of memberIds) {
      const activeCount = await StreakGroup.countDocuments({
        memberIds: uid,
        status:    { $in: ["active", "frozen"] },
      }).session(session);

      const memberDoc = await StreakMember.findOne({ userId: uid }).session(session);
      const isPremium = memberDoc?.isPremium ?? false;

      if (!isPremium && activeCount >= 3) {
        return { ok: false, reason: "too_many_active_streaks" };
      }
    }

    // Crear el grupo
    const [group] = await StreakGroup.create(
      [{
        name,
        type,
        ownerId,
        guildId,
        createdInChannelId: channelId,
        memberIds,
      }],
      { session }
    );

    // Crear un StreakMember por cada participante
    await StreakMember.insertMany(
      memberIds.map((uid) => ({
        userId:  uid,
        groupId: group._id,
      })),
      { session }
    );

    return { ok: true, groupId: group._id.toString() };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DISOLVER GRUPO
// ─────────────────────────────────────────────────────────────────────────────

export type DissolveResult =
  | { ok: true  }
  | { ok: false; reason: "not_found" | "not_owner" | "already_dissolved" };

/**
 * El propietario disuelve el grupo manualmente.
 * Registra la disolución en breakHistory si había racha activa.
 * No elimina los documentos: los deja como "dissolved" para historial.
 */
export async function dissolveGroup(
  ownerId: string,
  groupId: string
): Promise<DissolveResult> {
  return withTransaction(async (session) => {
    const group = await StreakGroup.findById(groupId).session(session);

    if (!group)                        return { ok: false, reason: "not_found"          };
    if (group.ownerId !== ownerId)     return { ok: false, reason: "not_owner"          };
    if (group.status === "dissolved")  return { ok: false, reason: "already_dissolved"  };

    if (group.currentStreak > 0) {
      group.breakHistory.push({
        brokenAt:    new Date(),
        daysReached: group.currentStreak,
        reason:      "dissolved",
      });
    }

    group.status        = "dissolved";
    group.currentStreak = 0;
    await group.save({ session });

    return { ok: true };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SALIR DE UN GRUPO
// ─────────────────────────────────────────────────────────────────────────────

export type LeaveResult =
  | { ok: true; newOwnerId?: string }   // newOwnerId si hubo transferencia
  | { ok: false; reason: "not_found" | "not_member" | "duo_cannot_leave" };

/**
 * Un miembro sale del grupo.
 *
 * Reglas:
 *   - Duo: no se puede salir, solo disolver (el duo es fijo para siempre)
 *   - Grupo + miembro normal: se elimina de memberIds
 *   - Grupo + propietario: se transfiere ownership al miembro con más totalClaims
 *   - Si queda < 3 miembros tras la salida: se disuelve automáticamente
 */
export async function leaveGroup(
  userId:  string,
  groupId: string
): Promise<LeaveResult> {
  return withTransaction(async (session) => {
    const group = await StreakGroup.findById(groupId).session(session);

    if (!group)                           return { ok: false, reason: "not_found"         };
    if (group.type === "duo")             return { ok: false, reason: "duo_cannot_leave"  };
    if (!group.memberIds.includes(userId)) return { ok: false, reason: "not_member"       };

    // Eliminar miembro
    group.memberIds = group.memberIds.filter((id) => id !== userId);
    await StreakMember.deleteOne({ userId, groupId: group._id }, { session });

    let newOwnerId: string | undefined;

    // Si era el propietario, transferir al más activo
    if (group.ownerId === userId) {
      const mostActive = await StreakMember
        .findOne({ groupId: group._id })
        .sort({ totalClaims: -1 })
        .session(session);

      if (mostActive) {
        group.ownerId = mostActive.userId;
        newOwnerId    = mostActive.userId;
      }
    }

    // Si quedan menos de 3 miembros, disolver
    if (group.memberIds.length < 3) {
      if (group.currentStreak > 0) {
        group.breakHistory.push({
          brokenAt:    new Date(),
          daysReached: group.currentStreak,
          reason:      "dissolved",
        });
      }
      group.status        = "dissolved";
      group.currentStreak = 0;
    }

    await group.save({ session });
    return { ok: true, newOwnerId };
  });
}
