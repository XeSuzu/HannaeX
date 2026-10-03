import { StreakGroup } from "../../Models/StreakGroup";
import { StreakMember } from "../../Models/StreakMember";
import { withTransaction } from "./transactions";

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
