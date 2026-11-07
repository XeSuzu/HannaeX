import { GuildMember } from "discord.js";
import mongoose from "mongoose";
import GlobalBlacklist from "./globalBlacklist.model";

export class SentinelNetwork {
  /**
   * Verifica si un nuevo miembro es una amenaza global conocida en la red Sentinel.
   */
  static async checkMember(member: GuildMember): Promise<boolean> {
    if (mongoose.connection.readyState !== 1) return false;
    try {
      const isBlacklisted = await GlobalBlacklist.findOne({
        userId: member.id,
      });

      if (isBlacklisted) {
        if (member.bannable) {
          await member.ban({
            reason: `[Hoshiko Security - Sentinel Network] ${isBlacklisted.reason}`,
          });
          console.log(
            `[Sentinel] Usuario mitigado automáticamente: ${member.user.tag} (${member.id})`,
          );
          return true;
        }
      }
    } catch (err) {
      console.error("[Sentinel] Error al verificar miembro:", err);
    }
    return false;
  }

  /**
   * Añade un usuario a la lista global de amenazas Sentinel.
   */
  static async reportUser(userId: string, reason: string): Promise<void> {
    await GlobalBlacklist.updateOne(
      { userId },
      { reason, addedAt: new Date() },
      { upsert: true },
    );
  }
}
