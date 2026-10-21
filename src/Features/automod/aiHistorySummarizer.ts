import { GoogleGenerativeAI } from "@google/generative-ai";
import { ICase } from "../../Database/moderation/case.model";
import { isCircuitBreakerOpen } from "./aiJudge";

export interface HistorySummaryResult {
  summary: string;
  recidivismRisk: "bajo" | "medio" | "alto" | "crítico";
  recommendedNextStep: string;
}

export async function summarizeUserHistoryWithAi(params: {
  userId: string;
  userTag: string;
  cases: ICase[];
  mockRunner?: (prompt: string) => Promise<string>;
}): Promise<HistorySummaryResult> {
  const { userId, userTag, cases, mockRunner } = params;

  const fallback: HistorySummaryResult = {
    summary: `El usuario acumula ${cases.length} caso(s) registrado(s).`,
    recidivismRisk: cases.length >= 5 ? "alto" : cases.length >= 2 ? "medio" : "bajo",
    recommendedNextStep:
      cases.length >= 5
        ? "Considerar aislamiento prolongado o expulsión si reincide."
        : cases.length >= 2
          ? "Aplicar advertencia formal o silencio temporal de 1 hora."
          : "Monitoreo preventivo estándar.",
  };

  if (!cases || cases.length === 0) {
    return {
      summary: "Sin antecedentes disciplinarios.",
      recidivismRisk: "bajo",
      recommendedNextStep: "Ninguna acción requerida.",
    };
  }

  const casesSummary = cases
    .slice(0, 15)
    .map(
      (c, i) =>
        `[${i + 1}] Acción: ${c.action.toUpperCase()} | Motivo: "${c.reason.slice(0, 100)}"${c.ruleId ? ` (Regla #${c.ruleId})` : ""} | Fecha: ${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "reciente"}`,
    )
    .join("\n");

  const prompt = [
    "Eres un asistente de seguridad y moderación para Discord.",
    "Analiza el siguiente historial de casos y sanciones disciplinarias de un usuario.",
    `Usuario: ${userTag} (${userId})`,
    "",
    "Historial de casos:",
    casesSummary,
    "",
    "Responde ÚNICAMENTE en JSON con el siguiente formato:",
    "{",
    '  "summary": "Resumen ejecutivo de 2 a 3 oraciones sobre el comportamiento del usuario y motivos frecuentes",',
    '  "recidivismRisk": "bajo" | "medio" | "alto" | "crítico",',
    '  "recommendedNextStep": "Recomendación concisa para el staff si el usuario vuelve a infringir"',
    "}",
  ].join("\n");

  try {
    let raw = "";
    if (mockRunner) {
      raw = await mockRunner(prompt);
    } else {
      const apiKey = process.env.GEMINI_MODERATION_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey || isCircuitBreakerOpen()) {
        return fallback;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
      });
      const res = await model.generateContent(prompt);
      raw = res.response.text();
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);
    const validRisks = ["bajo", "medio", "alto", "crítico"];
    const risk = validRisks.includes(parsed.recidivismRisk) ? parsed.recidivismRisk : fallback.recidivismRisk;

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 250) : fallback.summary,
      recidivismRisk: risk,
      recommendedNextStep:
        typeof parsed.recommendedNextStep === "string"
          ? parsed.recommendedNextStep.slice(0, 150)
          : fallback.recommendedNextStep,
    };
  } catch {
    return fallback;
  }
}
