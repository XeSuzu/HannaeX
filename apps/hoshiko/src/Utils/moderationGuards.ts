import {
  ChatInputCommandInteraction,
  GuildMember,
  type PermissionResolvable,
} from "discord.js";

export interface ModerationTargetCheckResult {
  canModerate: boolean;
  reason?: string;
}

/**
 * Valida que el moderador que invoca el comando tenga los permisos necesarios en el servidor.
 */
export function checkModeratorPermissions(
  interaction: ChatInputCommandInteraction,
  requiredPermission: PermissionResolvable,
): { ok: boolean; reason?: string } {
  if (!interaction.inGuild() || !interaction.guild) {
    return { ok: false, reason: "Este comando solo puede ejecutarse dentro de un servidor." };
  }

  // El dueño del servidor siempre tiene permisos absolutos
  if (interaction.user.id === interaction.guild.ownerId) {
    return { ok: true };
  }

  const memberPermissions = interaction.memberPermissions;
  if (!memberPermissions || !memberPermissions.has(requiredPermission)) {
    return {
      ok: false,
      reason: "❌ No tienes los permisos requeridos en este servidor para ejecutar esta acción.",
    };
  }

  return { ok: true };
}

/**
 * Valida que el bot tenga los permisos necesarios para realizar la acción.
 */
export function checkBotPermissions(
  interaction: ChatInputCommandInteraction,
  requiredPermission: PermissionResolvable,
): { ok: boolean; reason?: string } {
  const botMember = interaction.guild?.members.me;
  if (!botMember || !botMember.permissions.has(requiredPermission)) {
    return {
      ok: false,
      reason: "❌ No poseo los permisos necesarios en el servidor para ejecutar esta acción.",
    };
  }

  return { ok: true };
}

/**
 * Valida jerarquía y elegibilidad para moderar un miembro objetivo:
 * 1. El objetivo no puede ser uno mismo.
 * 2. El objetivo no puede ser el propio bot.
 * 3. El objetivo no puede ser el dueño del servidor.
 * 4. Jerarquía del moderador: el rol más alto del moderador debe ser superior al del objetivo (salvo el dueño).
 * 5. Jerarquía del bot: el rol más alto del bot debe ser superior al del objetivo.
 */
export function canModerateTarget(
  moderator: GuildMember,
  target: GuildMember,
): ModerationTargetCheckResult {
  const guild = moderator.guild;

  if (target.id === moderator.id) {
    return {
      canModerate: false,
      reason: "🌸 No puedes realizar acciones de moderación sobre ti mismo.",
    };
  }

  if (target.id === guild.client.user?.id) {
    return {
      canModerate: false,
      reason: "🌸 No puedes realizar acciones de moderación sobre mí.",
    };
  }

  if (target.id === guild.ownerId) {
    return {
      canModerate: false,
      reason: "❌ No se puede aplicar moderación al dueño del servidor.",
    };
  }

  // Jerarquía relativa del moderador (el dueño del servidor se salta la jerarquía)
  if (moderator.id !== guild.ownerId) {
    const modPosition = moderator.roles.highest.position;
    const targetPosition = target.roles.highest.position;

    if (targetPosition >= modPosition) {
      return {
        canModerate: false,
        reason: "❌ No puedes moderar a un miembro con un rol igual o superior al tuyo.",
      };
    }
  }

  // Jerarquía del bot (Discord API rechaza sanciones sobre roles superiores al del bot)
  const botMember = guild.members.me;
  if (botMember) {
    const botPosition = botMember.roles.highest.position;
    const targetPosition = target.roles.highest.position;

    if (targetPosition >= botPosition) {
      return {
        canModerate: false,
        reason: "❌ No puedo moderar a este miembro porque su rol es igual o superior a mi rol más alto.",
      };
    }
  }

  return { canModerate: true };
}

/**
 * Valida la jerarquía para gestionar un rol:
 * El rol debe estar por debajo del rol más alto del moderador (salvo dueño) y por debajo del rol del bot.
 */
export function canManageRole(
  moderator: GuildMember,
  role: { id: string; position: number },
): { ok: boolean; reason?: string } {
  const guild = moderator.guild;

  if (moderator.id !== guild.ownerId && role.position >= moderator.roles.highest.position) {
    return {
      ok: false,
      reason: "❌ No puedes gestionar un rol igual o superior a tu rol más alto.",
    };
  }

  const botMember = guild.members.me;
  if (botMember && role.position >= botMember.roles.highest.position) {
    return {
      ok: false,
      reason: "❌ No puedo gestionar ese rol. Asegúrate de que esté por debajo de mi rol más alto.",
    };
  }

  return { ok: true };
}
