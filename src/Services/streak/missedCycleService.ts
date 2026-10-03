import { EmbedBuilder } from "discord.js";
import { StreakGroup } from "../../Models/StreakGroup";
import { StreakMember } from "../../Models/StreakMember";
import { getStreakTier, getCurrentCycleIndex } from "../../Utils/streakTier";
import { HoshikoClient } from "../..";
import { withTransaction } from "./transactions";

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRON — CIERRE DE CICLOS VENCIDOS
// ─────────────────────────────────────────────────────────────────────────────

// 🔒 Flag para evitar ejecuciones paralelas del cron si una tarda demasiado.
let isProcessingCycles = false;

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
  if (isProcessingCycles) {
    // Ya hay un proceso en ejecución, se omite este para evitar solapamiento.
    return { processed: 0, frozen: 0, reset: 0, errors: [] };
  }
  isProcessingCycles = true;

  try {
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

    // 📋 Periodo de gracia si el bot acaba de reiniciar (por deploy o crash)
    const lastRestartSeconds = process.uptime();
    if (lastRestartSeconds < 300) { // Solo aplicar en los primeros 5 minutos tras un reinicio
      const botStartTime = now.getTime() - (lastRestartSeconds * 1000);

      // Si el ciclo venció COMPLETAMENTE antes de que el bot arrancara,
      // se considera que el usuario no pudo reclamar por culpa del downtime.
      // Se perdona el ciclo y se le permite reclamar el actual.
      if (prevCycleEnd < botStartTime) {
        continue; // Saltar procesamiento de este ciclo vencido
      }
    }

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
  } finally {
    isProcessingCycles = false;
  }
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

    // 🛡️ Re-verificar idempotencia dentro de la transacción
    const currentCycle = getCurrentCycleIndex(group.windowAnchorAt, now);
    if (cycleIndex >= currentCycle) return "skipped";

    // Si el ciclo ya se cerró exitosamente, se omite.
    if (group.lastClaimedAt) {
      const cycleMs    = 24 * 60 * 60 * 1000;
      const cycleStart = group.windowAnchorAt.getTime() + cycleIndex * cycleMs;
      if (group.lastClaimedAt.getTime() >= cycleStart) return "skipped";
    }

    // ⏱️ Si el cron ya procesó este ciclo (con cualquier resultado), se omite.
    if (group.lastProcessedAt) {
      const lastProcessedCycleForGroup = getCurrentCycleIndex(group.windowAnchorAt, group.lastProcessedAt);
      if (lastProcessedCycleForGroup >= cycleIndex) {
        return "skipped";
      }
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
    let outcome: "ok" | "frozen" | "reset" | "skipped" = "ok";

    if (missedCount === 0) {
      // Todos reclamaron (cubiertos por freeze o claim normal)
      // Este caso raro ocurre si el cron corre antes de que claimStreak
      // cierre el ciclo — se cierra aquí igualmente
      group.currentStreak += 1;
      // group.totalCycles ya se incrementó antes del bloque if/else.
      group.punctualDays  += 1; // Asumimos puntual si todos usaron freeze o reclamaron
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
      // 🛡️ Solo actuar si la racha es > 0. No se puede "romper" una racha de 0 días.
      if (group.currentStreak > 0) {
        group.breakHistory.push({
          brokenAt:    now,
          daysReached: group.currentStreak,
          reason:      "member_failure",
        });
        const oldStreak = group.currentStreak;
        group.neverBroken       = false;
        group.hasRebuiltEver    = true; // Si se rompe, cualquier recuperación futura será una reconstrucción.
        group.timesRoken       += 1;
        group.currentStreak     = 0;
        group.tier              = "Mayoi";
        group.currentRunStartAt = now;
        outcome = "reset";

        // ❗ Lógica de Notificación por DM
        // Puedes reemplazar los emojis como '📅' con tus propios emojis personalizados.
        // Para obtener el ID de un emoji, escribe \:tu_emoji: en Discord y copia el resultado.
        const breakEmbed = new EmbedBuilder()
          .setColor("#DD2E44") // Rojo oscuro para fallo
          .setTitle("💀 Racha Rota")
          .setDescription(`La racha del grupo **${group.name}** se ha reiniciado.`)
          .setFields(
            {
              name: "📅 Días Alcanzados",
              value: `**${oldStreak}**`,
              inline: true,
            },
            {
              name: "🏆 Récord Histórico",
              value: `**${group.bestStreak}** días`,
              inline: true,
            },
            { name: "💔 Roturas Totales", value: `**${group.timesRoken}**`, inline: true }
          )
          .setFooter({ text: "No te rindas, cada dia es una mejora ^_^ ." });

        for (const memberId of group.memberIds) {
          try {
            const user = await client.users.fetch(memberId);
            await user.send({ embeds: [breakEmbed] });
          } catch (e) {
            // No se pudo enviar el DM (probablemente los tiene cerrados).
            // Se ignora el error para no detener el proceso.
          }
        }
      } else {
        // La racha ya estaba en 0. No hay nada que "romper". Simplemente se salta el ciclo.
        outcome = "skipped";
      }
    }

    // Resetear todos a "pending" para el nuevo ciclo
    await StreakMember.updateMany(
      { groupId: group._id },
      { $set: { dailyStatus: "pending" } },
      { session }
    );

    group.lastProcessedAt = now; // Marcar este ciclo como procesado.
    await group.save({ session });
    return outcome;
  });
}

