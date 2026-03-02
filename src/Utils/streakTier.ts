import { StreakTier, IStreakGroup } from "../Models/StreakGroup";

/**
 * Calcula el tier visual de una racha según sus días consecutivos actuales.
 * Llamar cada vez que currentStreak cambia para mantener tier sincronizado.
 * 
 * Tabla de tiers:
 *   0-6   → starter   🖤 Gatito iniciante
 *   7-13  → burning   🔥 Neko ardiente
 *   14-29 → star      💜 Estrella gatuna
 *   30-59 → guardian  🌌 Guardián eterno
 *   60-99 → legend    🌈 Leyenda absoluta
 *   100+  → immortal  👑 Hall of Fame
 */
export function getStreakTier(days: number): StreakTier {
  if (days >= 100) return "Kiseki";
  if (days >= 60)  return "Arashi";
  if (days >= 30)  return "Negai";
  if (days >= 14)  return "Aruki";
  if (days >= 7)   return "Ketsui";
  return "Mayoi";
}

/**
 * Devuelve el índice entero del ciclo actual del grupo.
 * Ciclo 0 = primeras 24h desde el primer claim.
 * Ciclo 1 = siguientes 24h. Y así sucesivamente.
 * 
 * @param anchorAt  windowAnchorAt del grupo (hora del primer claim)
 * @param now       fecha de referencia (default: ahora)
 */
export function getCurrentCycleIndex(anchorAt: Date, now = new Date()): number {
  const cycleMs = 24 * 60 * 60 * 1000;
  return Math.floor((now.getTime() - anchorAt.getTime()) / cycleMs);
}

/**
 * Determina si un claim fue "puntual", es decir, si llegó dentro
 * de la ventana de 24h del ciclo que le corresponde.
 * 
 * Ejemplo: anchorAt = 10:00 día 1
 *   Ciclo 0: 10:00 día 1 → 09:59:59 día 2  ← puntual si claimedAt está aquí
 *   Ciclo 1: 10:00 día 2 → 09:59:59 día 3
 * 
 * @param anchorAt   windowAnchorAt del grupo
 * @param claimedAt  momento exacto en que el miembro reclamó
 */
export function isCyclePunctual(anchorAt: Date, claimedAt: Date): boolean {
  const cycleMs  = 24 * 60 * 60 * 1000;
  const cycleIdx = Math.floor((claimedAt.getTime() - anchorAt.getTime()) / cycleMs);
  const cycleEnd = anchorAt.getTime() + (cycleIdx + 1) * cycleMs;
  return claimedAt.getTime() < cycleEnd;
}

/**
 * Valida si un grupo cumple TODOS los requisitos para entrar al Hall of Fame.
 * Se llama cuando currentStreak llega a 100 por primera vez en la carrera actual.
 * 
 * Requisitos (todos deben cumplirse):
 *   1. currentStreak >= 100 (100 días continuos activos ahora)
 *   2. neverBroken = true   (nunca se rompió en toda la historia)
 *   3. hasRebuiltEver = false (la carrera de 100 días es continua, no reconstruida)
 *   4. Antigüedad >= 60 días desde createdAt
 *   5. Puntualidad: punctualDays / totalCycles >= 0.90
 *   6. frozenDaysTotal <= 3 (máximo 3 días congelados en toda la historia)
 * 
 * Nota: el requisito "nadie falla 14 días seguidos" se valida en tiempo real
 * a nivel StreakMember (consecutiveMissDays) y se refleja en neverBroken.
 * 
 * @returns eligible  true si todos los checks pasan
 * @returns checks    objeto con cada requisito y su resultado individual
 *                    (usado para la ceremonia que muestra ✅ uno a uno)
 */
export function meetsHofRequirements(
  group: Pick<
    IStreakGroup,
    | "currentStreak"
    | "neverBroken"
    | "hasRebuiltEver"
    | "frozenDaysTotal"
    | "totalCycles"
    | "punctualDays"
    | "createdAt"
  >
): { eligible: boolean; checks: Record<string, boolean> } {
  const ageDays     = (Date.now() - group.createdAt.getTime()) / 86_400_000;
  const punctuality = group.totalCycles > 0
    ? group.punctualDays / group.totalCycles
    : 0;

  const checks: Record<string, boolean> = {
    "100 días continuos":   group.currentStreak  >= 100,
    "Nunca se rompió":      group.neverBroken,
    "Sin reconstrucción":   !group.hasRebuiltEver,
    "Antigüedad 60 días":   ageDays              >= 60,
    "Puntualidad ≥ 90%":    punctuality          >= 0.9,
    "Congelados ≤ 3 días":  group.frozenDaysTotal <= 3,
  };

  return {
    eligible: Object.values(checks).every(Boolean),
    checks,
  };
}
