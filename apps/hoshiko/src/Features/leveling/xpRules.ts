export function xpForLevel(level: number): number {
  return 100 + level * 50;
}

export function totalXpForLevel(level: number): number {
  if (level <= 0) return 0;
  return 100 * level + 25 * level * (level - 1);
}

export function xpForVoiceLevel(level: number): number {
  return Math.floor(80 + level * 40);
}

export function totalXpForVoiceLevel(level: number): number {
  if (level <= 0) return 0;
  return 80 * level + 20 * level * (level - 1);
}

export function isMilestone(level: number): boolean {
  const milestones = [5, 10, 15, 20, 25, 30, 50, 75, 100];
  return milestones.includes(level);
}

export function getCurrentWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}
