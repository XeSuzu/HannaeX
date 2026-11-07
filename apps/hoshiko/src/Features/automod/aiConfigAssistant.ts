import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_FLASH_LITE } from "../../config/aiModels";
import { Guild } from "discord.js";
import { LocalCacheService } from "../../App/infrastructure/cache/LocalCacheService";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import { IServerRule, SecurityLevel } from "../../Database/guild/serverConfig.model";
import { applyPreset, getPreset } from "./automodPresets";
import { isCircuitBreakerOpen } from "./aiJudge";

export interface AiConfigDraft {
  draftId: string;
  preset: SecurityLevel;
  exemptChannels: string[];
  exemptRoles: string[];
  rules: IServerRule[];
  reasoning: string;
  createdAt: number;
}

const draftsCache = new LocalCacheService<AiConfigDraft>(
  "automod_config_drafts",
  { max: 500, ttlMs: 30 * 60 * 1000 },
);

export function saveConfigDraft(guildId: string, draft: Omit<AiConfigDraft, "draftId" | "createdAt">): AiConfigDraft {
  const draftId = `draft_${guildId}_${Date.now()}`;
  const fullDraft: AiConfigDraft = {
    ...draft,
    draftId,
    createdAt: Date.now(),
  };
  draftsCache.set(`${guildId}:${draftId}`, fullDraft);
  return fullDraft;
}

export function getConfigDraft(guildId: string, draftId: string): AiConfigDraft | null {
  return draftsCache.get(`${guildId}:${draftId}`) ?? null;
}

export function validateConfigDraft(
  raw: unknown,
  guild: Guild,
): { valid: boolean; draft: Omit<AiConfigDraft, "draftId" | "createdAt"> } {
  const fallback = {
    preset: 2 as SecurityLevel,
    exemptChannels: [],
    exemptRoles: [],
    rules: [
      { id: 1, text: "Respeto mutuo y trato cordial; prohibido el acoso o discriminación." },
      { id: 2, text: "Prohibido el spam, repeticiones masivas y autopromoción no autorizada." },
      { id: 3, text: "Contenido sensible o NSFW restringido exclusivamente a canales designados." },
      { id: 4, text: "Prohibido compartir enlaces maliciosos, estafas, phishing o invitaciones no autorizadas." },
    ],
    reasoning: "Configuración recomendada estándar por defecto.",
  };

  if (!raw || typeof raw !== "object") {
    return { valid: false, draft: fallback };
  }

  const obj = raw as Record<string, unknown>;

  // 1. Validar Preset
  let preset: SecurityLevel = 2;
  if ([1, 2, 3, 4].includes(Number(obj.preset))) {
    preset = Number(obj.preset) as SecurityLevel;
  }

  // 2. Validar Canales Exentos (Solo IDs que existan en el servidor)
  const exemptChannels: string[] = [];
  if (Array.isArray(obj.exemptChannels) && guild.channels?.cache) {
    for (const chId of obj.exemptChannels) {
      if (typeof chId === "string" && guild.channels.cache.has(chId)) {
        exemptChannels.push(chId);
      }
    }
  }

  // 3. Validar Roles Exentos (Solo IDs que existan en el servidor)
  const exemptRoles: string[] = [];
  if (Array.isArray(obj.exemptRoles) && guild.roles?.cache) {
    for (const rId of obj.exemptRoles) {
      if (typeof rId === "string" && guild.roles.cache.has(rId)) {
        exemptRoles.push(rId);
      }
    }
  }

  // 4. Validar Reglas (Tope de cantidad 10 y longitud 150 caracteres)
  const rules: IServerRule[] = [];
  if (Array.isArray(obj.rules)) {
    let currentId = 1;
    for (const r of obj.rules) {
      if (rules.length >= 10) break;
      const text = typeof r?.text === "string" ? r.text.trim().slice(0, 150) : "";
      if (text.length >= 4) {
        rules.push({ id: currentId++, text });
      }
    }
  }

  const finalRules = rules.length > 0 ? rules : fallback.rules;
  const reasoning = typeof obj.reasoning === "string" ? obj.reasoning.slice(0, 250) : fallback.reasoning;

  return {
    valid: true,
    draft: {
      preset,
      exemptChannels,
      exemptRoles,
      rules: finalRules,
      reasoning,
    },
  };
}

export async function generateConfigDraftWithAi(params: {
  guild: Guild;
  description: string;
  mockRunner?: (prompt: string) => Promise<string>;
}): Promise<AiConfigDraft> {
  const { guild, description, mockRunner } = params;

  const channelsList = Array.from(guild.channels?.cache ? guild.channels.cache.values() : [])
    .filter((c: any) => c.isTextBased && c.isTextBased())
    .slice(0, 20)
    .map((c: any) => `#${c.name} (id:${c.id})`)
    .join(", ");

  const prompt = [
    "Eres un arquitecto de seguridad para servidores de Discord.",
    "El administrador ha descrito su servidor para obtener una configuración de seguridad y reglas recomendadas.",
    "",
    `Descripción del servidor: "${description.slice(0, 200)}"`,
    `Canales de texto disponibles: ${channelsList || "Sin canales identificados"}`,
    "",
    "Presupuesto de Seguridad:",
    "- Nivel 1: Relajado (comunidades pequeñas entre amigos, 150 pts de tolerancia)",
    "- Nivel 2: Estándar (servidores públicos normales, 100 pts de tolerancia)",
    "- Nivel 3: Estricto (servidores grandes propensos a trolls, 60 pts de tolerancia)",
    "- Nivel 4: Paranoico (alerta máxima, 30 pts de tolerancia)",
    "",
    "Responde ÚNICAMENTE con un JSON con el siguiente formato:",
    "{",
    '  "preset": 1 | 2 | 3 | 4,',
    '  "exemptChannels": ["id_canal1", "id_canal2"],',
    '  "exemptRoles": [],',
    '  "rules": [',
    '    { "id": 1, "text": "Regla clara y específica para esta comunidad (máx 120 caracteres)" }',
    '  ],',
    '  "reasoning": "Breve explicación de 2 líneas de por qué se recomienda este perfil"',
    "}",
  ].join("\n");

  let raw = "";
  try {
    if (mockRunner) {
      raw = await mockRunner(prompt);
    } else {
      const apiKey = process.env.GEMINI_MODERATION_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey || isCircuitBreakerOpen()) {
        throw new Error("Gemini no disponible");
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL_FLASH_LITE,
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      });
      const res = await model.generateContent(prompt);
      raw = res.response.text();
    }

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    const { draft } = validateConfigDraft(parsed, guild);
    return saveConfigDraft(guild.id, draft);
  } catch {
    const fallbackDraft = {
      preset: 2 as SecurityLevel,
      exemptChannels: [],
      exemptRoles: [],
      rules: [
        { id: 1, text: "Respeto mutuo y trato cordial; prohibido el acoso o discriminación." },
        { id: 2, text: "Prohibido el spam, repeticiones masivas y autopromoción no autorizada." },
        { id: 3, text: "Contenido sensible o NSFW restringido exclusivamente a canales designados." },
        { id: 4, text: "Prohibido compartir enlaces maliciosos, estafas, phishing o invitaciones no autorizadas." },
      ],
      reasoning: "Configuración recomendada estándar para servidores públicos.",
    };
    return saveConfigDraft(guild.id, fallbackDraft);
  }
}

export async function applyConfigDraft(
  guild: Guild,
  draftId: string,
  moderatorTag: string,
): Promise<{ success: boolean; message: string }> {
  const draft = getConfigDraft(guild.id, draftId);
  if (!draft) {
    return {
      success: false,
      message: "❌ El borrador de configuración ha expirado o no existe.",
    };
  }

  // 1. Aplicar preset declarativo
  await applyPreset(guild.id, draft.preset);

  // 2. Persistir reglas y canales exentos
  await SettingsManager.updateSettings(guild.id, {
    rules: draft.rules,
    exemptChannels: draft.exemptChannels,
    exemptRoles: draft.exemptRoles,
  });

  const presetDef = getPreset(draft.preset);

  return {
    success: true,
    message: `✅ **Configuración aplicada con éxito por ${moderatorTag}:**\n` +
      `- **Perfil de Seguridad:** Nivel ${draft.preset} (${presetDef.name})\n` +
      `- **Reglas configuradas:** ${draft.rules.length} reglas activas\n` +
      `- **Canales exentos:** ${draft.exemptChannels.length > 0 ? draft.exemptChannels.map((c) => `<#${c}>`).join(", ") : "Ninguno"}`,
  };
}
