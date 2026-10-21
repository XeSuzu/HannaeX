import { PremiumManager } from "../../Database/guild/PremiumManager";
import { SettingsManager } from "../../Database/guild/SettingsManager";

export type AiFeature =
  | "ai_moderation"
  | "ai_config_assistant"
  | "ai_history_summary"
  | "ai_raid_forensics";

export interface FeatureGateResult {
  allowed: boolean;
  requiresPremium: boolean;
  reason?: string;
}

// Configuración centralizada de características (Amy puede cambiar la política aquí)
const FEATURE_POLICY: Record<AiFeature, { requiresPremium: boolean; label: string }> = {
  ai_moderation: { requiresPremium: false, label: "Moderación Asistida por IA" },
  ai_raid_forensics: { requiresPremium: false, label: "Diagnóstico Forense de Raids" },
  ai_config_assistant: { requiresPremium: false, label: "Asistente de Configuración con IA" },
  ai_history_summary: { requiresPremium: false, label: "Resumen de Historial Disciplinario con IA" },
};

export async function isAiFeatureAllowed(
  guildId: string,
  feature: AiFeature,
): Promise<FeatureGateResult> {
  const policy = FEATURE_POLICY[feature];
  if (!policy) {
    return { allowed: false, requiresPremium: false, reason: "Característica no reconocida." };
  }

  if (!policy.requiresPremium) {
    return { allowed: true, requiresPremium: false };
  }

  const isPremium = await PremiumManager.isPremium(guildId);
  if (isPremium) {
    return { allowed: true, requiresPremium: true };
  }

  return {
    allowed: false,
    requiresPremium: true,
    reason: `✨ La función **${policy.label}** requiere suscripción activa a **Hoshiko Premium**.`,
  };
}
