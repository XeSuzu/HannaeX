import { GuildMember } from "discord.js";
import { ADMIN_MARKER, markAsAdminMessage } from "../ai/adminMessageTracker";

export interface ILevelRoleItem {
  level: number;
  roleId: string;
  message?: string | null;
}

export async function assignLevelRoles(
  member: GuildMember | any,
  levelRoles: ILevelRoleItem[] | undefined,
  oldLevel: number,
  newLevel: number,
  guild: any,
): Promise<void> {
  if (!levelRoles || !levelRoles.length || !member || newLevel <= oldLevel) return;

  const rolesGained = levelRoles.filter(
    (lr) => lr.level > oldLevel && lr.level <= newLevel,
  );

  for (const roleConfig of rolesGained) {
    try {
      const role = guild?.roles?.cache?.get(roleConfig.roleId);
      if (role && !member.roles?.cache?.has(roleConfig.roleId)) {
        await member.roles.add(roleConfig.roleId);

        if (roleConfig.message) {
          const channel =
            member.guild?.systemChannel ??
            (typeof guild?.channels?.cache?.find === "function"
              ? guild.channels.cache.find((c: any) => c?.isTextBased?.())
              : guild?.channels?.cache instanceof Map
                ? [...guild.channels.cache.values()].find((c: any) => c?.isTextBased?.())
                : null);
          if (channel && typeof channel.send === "function") {
            const roleMessage = roleConfig.message
              .replace(
                "{user}",
                member.displayName || member.user?.displayName || member.user?.username || "Usuario",
              )
              .replace("{role}", role.name)
              .replace("{level}", roleConfig.level.toString());
            const sent = await channel
              .send(`${roleMessage}${ADMIN_MARKER}`)
              .catch(() => null);
            if (sent?.id) markAsAdminMessage(sent.id);
          }
        }
      }
    } catch (err) {
      console.error(`[LevelRoles] Error asignando rol ${roleConfig.roleId}:`, err);
    }
  }
}
