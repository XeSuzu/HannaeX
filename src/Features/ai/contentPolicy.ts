const AI_BLOCKED_TERMS = new Set([
  "como suicidarme", "como matarme", "ways to die", "suicide methods",
  "como hacer una bomba", "como hacer explosivos", "how to make bomb",
  "receta para hacer drogas", "como cocinar metanfetamina", "como hackear",
  "como doxxear", "guia para hackear",
]);

const AI_SENSITIVE_TERMS = [
  "suicid", "autolesion", "depresion", "ansiedad", " self harm",
  "sexo explicito", "pornografia", "como tener sexo",
];

function containsBlockedTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return Array.from(AI_BLOCKED_TERMS).some((term) => lower.includes(term));
}

function containsSensitiveTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return AI_SENSITIVE_TERMS.some((term) => lower.includes(term));
}

export function shouldBlockMessage(text: string): { block: boolean; reason?: string } {
  if (containsBlockedTerm(text)) return { block: true, reason: " Ese tema no puedo tocarlo~" };
  return { block: false };
}
