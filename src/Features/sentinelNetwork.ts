import GlobalBlacklist from "../Database/moderation/globalBlacklist.model";
import { GuildMember } from "discord.js";
import { HoshikoLogger } from "../Security/Logger/HoshikoLogger";

export class SentinelNetwork {
  /**
   * Verifica si un nuevo miembro es una amenaza global conocida.
   */
  static async checkMember(member: GuildMember) {
    const isBlacklisted = await GlobalBlacklist.findOne({ userId: member.id });

    if (isBlacklisted) {
      // Acción: Banear automáticamente si es una amenaza HIGH
      try {
        await member.ban({
          reason: `Sentinel Network: ${isBlacklisted.reason}`,
        });

        await HoshikoLogger.sendLog(
          member.guild,
          "SECURITY",
          `📡 **SENTINEL NETWORK**\nEl usuario \`${member.user.tag}\` ha sido baneado automáticamente al entrar.\n**Motivo en lista negra global:** *${isBlacklisted.reason}*`,
          member.user,
        );
      } catch (err) {
        console.error("Error al ejecutar ban global:", err);
      }
    }
  }

  /**
   * Añade un usuario a la lista global (Solo para desarrolladores del bot)
   */
  static async reportUser(userId: string, reason: string) {
    await GlobalBlacklist.updateOne(
      { userId },
      { reason, addedAt: new Date() },
      { upsert: true },
    );
  }
}
