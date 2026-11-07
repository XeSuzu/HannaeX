import { Guild, PermissionFlagsBits } from "discord.js";

export class LockdownManager {
  private static lockedGuilds = new Set<string>();

  static isLockedDown(guildId: string): boolean {
    return this.lockedGuilds.has(guildId);
  }

  static async triggerLockdown(guild: Guild, reason: string): Promise<boolean> {
    try {
      const everyoneRole = guild.roles.everyone;
      const currentPermissions = everyoneRole.permissions;

      if (currentPermissions.has(PermissionFlagsBits.SendMessages)) {
        await everyoneRole.setPermissions(
          currentPermissions.remove(PermissionFlagsBits.SendMessages),
          `[Hoshiko Security - Lockdown] ${reason}`,
        );
      }

      this.lockedGuilds.add(guild.id);
      console.log(`[Lockdown] Activado en ${guild.name} (${guild.id}): ${reason}`);
      return true;
    } catch (err) {
      console.error("[Lockdown] Error al activar lockdown:", err);
      return false;
    }
  }

  static async liftLockdown(guild: Guild, moderatorTag: string): Promise<boolean> {
    try {
      const everyoneRole = guild.roles.everyone;
      const currentPermissions = everyoneRole.permissions;

      if (!currentPermissions.has(PermissionFlagsBits.SendMessages)) {
        await everyoneRole.setPermissions(
          currentPermissions.add(PermissionFlagsBits.SendMessages),
          `[Hoshiko Security - Lockdown Levantado por ${moderatorTag}]`,
        );
      }

      this.lockedGuilds.delete(guild.id);
      console.log(
        `[Lockdown] Levantado en ${guild.name} (${guild.id}) por ${moderatorTag}`,
      );
      return true;
    } catch (err) {
      console.error("[Lockdown] Error al levantar lockdown:", err);
      return false;
    }
  }
}
