/**
 * Rechazo de Carga (Pilar 7): mide el uso de CPU del proceso cada 5s.
 * Si supera el 85% de un núcleo, los sistemas no críticos (XP, tracking de avatares)
 * se pausan para dejar la CPU a la moderación.
 */
const SAMPLE_MS = 5_000;
const OVERLOAD_THRESHOLD = 0.85;

let lastUsage = process.cpuUsage();
let lastTime = process.hrtime.bigint();
let cpuRatio = 0;
let timer: NodeJS.Timeout | null = null;

function sample(): void {
  const now = process.hrtime.bigint();
  const usage = process.cpuUsage(lastUsage);
  const elapsedMicros = Number(now - lastTime) / 1000;
  cpuRatio = elapsedMicros > 0 ? (usage.user + usage.system) / elapsedMicros : 0;
  lastUsage = process.cpuUsage();
  lastTime = now;
}

function ensureSampler(): void {
  if (timer) return;
  timer = setInterval(sample, SAMPLE_MS);
  timer.unref();
}

export function getCpuRatio(): number {
  ensureSampler();
  return cpuRatio;
}

export function isOverloaded(): boolean {
  return getCpuRatio() > OVERLOAD_THRESHOLD;
}
