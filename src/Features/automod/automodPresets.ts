import type {
  ISecurityModules,
  SecurityLevel,
  AutomodModuleAction,
} from "../../Database/guild/serverConfig.model";
import { SettingsManager } from "../../Database/guild/SettingsManager";

export interface PresetDefinition {
  level: SecurityLevel;
  name: string;
  description: string;
  securityModules: ISecurityModules;
  moduleActions: Record<string, AutomodModuleAction>;
}

export const PRESETS: Record<SecurityLevel, PresetDefinition> = {
  1: {
    level: 1,
    name: "Relajado (Nvl 1)",
    description: "Comunidades pequeñas de confianza. Umbral de estrés permisivo (150 pts).",
    securityModules: {
      securityLevel: 1,
      antiSpam: true,
      antiLinks: false,
      antiRaid: false,
      antiNuke: false,
      antiAlt: false,
      wordFilter: false,
      snipe: false,
    },
    moduleActions: {
      antiSpam: "delete",
      antiLinks: "flag",
      wordFilter: "flag",
    },
  },
  2: {
    level: 2,
    name: "Estándar (Nvl 2 - Recomendado)",
    description: "Equilibrio ideal para servidores públicos activos. Umbral estándar (100 pts).",
    securityModules: {
      securityLevel: 2,
      antiSpam: true,
      antiLinks: true,
      antiRaid: true,
      antiNuke: false,
      antiAlt: false,
      wordFilter: false,
      snipe: false,
    },
    moduleActions: {
      antiSpam: "delete",
      antiLinks: "delete",
      wordFilter: "delete",
    },
  },
  3: {
    level: 3,
    name: "Estricto (Nvl 3)",
    description: "Servidores grandes o propensos a incursiones. Umbral riguroso (60 pts).",
    securityModules: {
      securityLevel: 3,
      antiSpam: true,
      antiLinks: true,
      antiRaid: true,
      antiNuke: true,
      antiAlt: true,
      wordFilter: true,
      snipe: false,
    },
    moduleActions: {
      antiSpam: "delete+timeout",
      antiLinks: "delete+timeout",
      wordFilter: "delete+timeout",
    },
  },
  4: {
    level: 4,
    name: "Paranoico / Lockdown (Nvl 4)",
    description: "Alerta máxima. Tolerancia mínima (30 pts) y expulsión automática en Lockdown.",
    securityModules: {
      securityLevel: 4,
      antiSpam: true,
      antiLinks: true,
      antiRaid: true,
      antiNuke: true,
      antiAlt: true,
      wordFilter: true,
      snipe: false,
    },
    moduleActions: {
      antiSpam: "delete+timeout",
      antiLinks: "delete+timeout",
      wordFilter: "delete+timeout",
    },
  },
};

export function getPreset(level: SecurityLevel = 2): PresetDefinition {
  return PRESETS[level] || PRESETS[2];
}

/**
 * Genera el diff entre la configuración actual y el preset objetivo
 */
export function calculatePresetDiff(
  currentModules: Partial<ISecurityModules> | undefined,
  targetPreset: PresetDefinition,
): Array<{ module: string; before: boolean; after: boolean }> {
  const current = currentModules || {};
  const diffs: Array<{ module: string; before: boolean; after: boolean }> = [];

  const checkKeys: (keyof ISecurityModules)[] = [
    "antiSpam",
    "antiLinks",
    "antiRaid",
    "antiNuke",
    "antiAlt",
    "wordFilter",
  ];

  for (const key of checkKeys) {
    const before = Boolean(current[key]);
    const after = Boolean(targetPreset.securityModules[key]);
    if (before !== after) {
      diffs.push({ module: key, before, after });
    }
  }

  return diffs;
}

export async function applyPreset(
  guildId: string,
  level: SecurityLevel = 2,
): Promise<{ applied: boolean; preset: PresetDefinition }> {
  const preset = getPreset(level);
  await SettingsManager.updateSettings(guildId, {
    securityModules: preset.securityModules,
    moduleActions: preset.moduleActions,
  });
  return { applied: true, preset };
}
