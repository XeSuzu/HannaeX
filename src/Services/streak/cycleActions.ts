import { ClientSession } from "mongoose";
import { StreakGroup, IStreakGroup, StreakTier } from "../../Models/StreakGroup";
import { StreakMember } from "../../Models/StreakMember";
import { Counter } from "../../Models/Counter";
import { getStreakTier, isCyclePunctual, getCurrentCycleIndex, meetsHofRequirements } from "../../Utils/streakTier";
import { withTransaction } from "./transactions";

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

