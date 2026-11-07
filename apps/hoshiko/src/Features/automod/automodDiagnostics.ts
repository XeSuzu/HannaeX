import { Guild, PermissionFlagsBits } from "discord.js";
import type { ISecurityModules } from "../../Database/guild/serverConfig.model";

export interface PermissionIssue {
  permission: string;
  requiredBy: string[];
  severity: "critical" | "warning";
  description: string;
}

export interface DiagnosticResult {
  healthy: boolean;
  issues: PermissionIssue[];
  hierarchyIssue: boolean;
  botRolePosition: number;
}

export function runSecurityDiagnostics(
  guild: Guild,
  modules?: Partial<ISecurityModules>,
): DiagnosticResult {
  const me = guild.members.me;
  const issues: PermissionIssue[] = [];

  if (!me) {
    return {
      healthy: false,
      issues: [
        {
          permission: "BotMember",
          requiredBy: ["Todo"],
          severity: "critical",
          description: "No se pudo obtener el miembro del bot en este servidor.",
        },
      ],
      hierarchyIssue: false,
      botRolePosition: 0,
    };
  }

  const perms = me.permissions;

  // ManageMessages: requerido para antiSpam, wordFilter, antiLinks
  if (!perms.has(PermissionFlagsBits.ManageMessages)) {
    const requiredBy: string[] = [];
    if (modules?.antiSpam) requiredBy.push("Anti-Spam");
    if (modules?.wordFilter) requiredBy.push("Filtro de Palabras");
    if (modules?.antiLinks) requiredBy.push("Anti-Links");
    if (requiredBy.length > 0) {
      issues.push({
        permission: "Gestionar Mensajes (ManageMessages)",
        requiredBy,
        severity: "critical",
        description: "Requerido para eliminar mensajes de infractores y spam.",
      });
    }
  }

  // ModerateMembers: requerido para timeouts en antiSpam, wordFilter
  if (!perms.has(PermissionFlagsBits.ModerateMembers)) {
    const requiredBy: string[] = [];
    if (modules?.antiSpam) requiredBy.push("Anti-Spam");
    if (modules?.wordFilter) requiredBy.push("Filtro de Palabras");
    if (requiredBy.length > 0) {
      issues.push({
        permission: "Aislar Miembros (ModerateMembers)",
        requiredBy,
        severity: "critical",
        description: "Requerido para aplicar timeouts disciplinarios.",
      });
    }
  }

  // ManageRoles: requerido para El Torniquete (Lockdown) y Anti-Nuke
  if (!perms.has(PermissionFlagsBits.ManageRoles)) {
    const requiredBy: string[] = [];
    if (modules?.antiRaid) requiredBy.push("Anti-Raid (Lockdown)");
    if (modules?.antiNuke) requiredBy.push("Anti-Nuke");
    if (requiredBy.length > 0) {
      issues.push({
        permission: "Gestionar Roles (ManageRoles)",
        requiredBy,
        severity: "critical",
        description: "Requerido para revocar permisos en emergencias o quitar roles hostiles.",
      });
    }
  }

  // BanMembers: requerido para Anti-Nuke y resolución de raids
  if (!perms.has(PermissionFlagsBits.BanMembers)) {
    const requiredBy: string[] = [];
    if (modules?.antiNuke) requiredBy.push("Anti-Nuke");
    if (modules?.antiRaid) requiredBy.push("Banear Raiders");
    if (requiredBy.length > 0) {
      issues.push({
        permission: "Banear Miembros (BanMembers)",
        requiredBy,
        severity: "warning",
        description: "Requerido para ejecutar baneos por lotes durante raids.",
      });
    }
  }

  // ViewAuditLog: requerido para Anti-Nuke
  if (!perms.has(PermissionFlagsBits.ViewAuditLog) && modules?.antiNuke) {
    issues.push({
      permission: "Ver Registro de Auditoría (ViewAuditLog)",
      requiredBy: ["Anti-Nuke"],
      severity: "critical",
      description: "Requerido para rastrear autores de borrado de canales y roles.",
    });
  }

  // Comprobar jerarquía de roles: si el rol de Hoshiko está en el fondo
  const botRolePosition = me.roles?.highest?.position ?? 0;
  const rolesList = guild.roles?.cache ? Array.from(guild.roles.cache.values()) : [];
  const higherRolesCount = rolesList.filter(
    (r: any) => !r.managed && r.id !== guild.id && r.position > botRolePosition,
  ).length;
  const hierarchyIssue = botRolePosition <= 1 && higherRolesCount > 0;

  return {
    healthy: issues.length === 0 && !hierarchyIssue,
    issues,
    hierarchyIssue,
    botRolePosition,
  };
}
