import {
  AuditLogEvent,
  Guild,
  GuildBan,
  GuildChannel,
  Role,
  User,
} from "discord.js";

interface TrackerEntry {
  count: number;
  lastAction: number;
}

export class AntiNukeManager {
  private static roleTracker = new Map<string, TrackerEntry>();
  private static channelTracker = new Map<string, TrackerEntry>();
  private static banTracker = new Map<string, TrackerEntry>();

  private static TIME_WINDOW = 10_000;
  private static ROLE_LIMIT = 3;
  private static CHANNEL_LIMIT = 3;
  private static BAN_LIMIT = 4;

  static async handleRoleDelete(role: Role): Promise<void> {
    const guild = role.guild;
    try {
      const audit = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleDelete,
      });
      const entry = audit.entries.first();
      if (!entry?.executor) return;

      const executor = entry.executor;
      if (executor.id === guild.client.user?.id || executor.id === guild.ownerId)
        return;

      const trackKey = `${guild.id}:${executor.id}`;
      const now = Date.now();
      const data = this.roleTracker.get(trackKey) || {
        count: 0,
        lastAction: 0,
      };

      data.count = now - data.lastAction > this.TIME_WINDOW ? 1 : data.count + 1;
      data.lastAction = now;
      this.roleTracker.set(trackKey, data);

      if (data.count >= this.ROLE_LIMIT) {
        this.roleTracker.delete(trackKey);
        await this.mitigateExecutor(
          guild,
          executor,
          `Anti-Nuke: Borrado masivo de roles (${data.count} roles en 10s)`,
        );
      }
    } catch (err) {
      console.error("[AntiNuke] Error en handleRoleDelete:", err);
    }
  }

  static async handleChannelDelete(channel: GuildChannel): Promise<void> {
    const guild = channel.guild;
    try {
      const audit = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
      });
      const entry = audit.entries.first();
      if (!entry?.executor) return;

      const executor = entry.executor;
      if (executor.id === guild.client.user?.id || executor.id === guild.ownerId)
        return;

      const trackKey = `${guild.id}:${executor.id}`;
      const now = Date.now();
      const data = this.channelTracker.get(trackKey) || {
        count: 0,
        lastAction: 0,
      };

      data.count = now - data.lastAction > this.TIME_WINDOW ? 1 : data.count + 1;
      data.lastAction = now;
      this.channelTracker.set(trackKey, data);

      if (data.count >= this.CHANNEL_LIMIT) {
        this.channelTracker.delete(trackKey);
        await this.mitigateExecutor(
          guild,
          executor,
          `Anti-Nuke: Borrado masivo de canales (${data.count} canales en 10s)`,
        );
      }
    } catch (err) {
      console.error("[AntiNuke] Error en handleChannelDelete:", err);
    }
  }

  static async handleBanAdd(ban: GuildBan): Promise<void> {
    const guild = ban.guild;
    try {
      const audit = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd,
      });
      const entry = audit.entries.first();
      if (!entry?.executor) return;

      const executor = entry.executor;
      if (executor.id === guild.client.user?.id || executor.id === guild.ownerId)
        return;

      const trackKey = `${guild.id}:${executor.id}`;
      const now = Date.now();
      const data = this.banTracker.get(trackKey) || {
        count: 0,
        lastAction: 0,
      };

      data.count = now - data.lastAction > this.TIME_WINDOW ? 1 : data.count + 1;
      data.lastAction = now;
      this.banTracker.set(trackKey, data);

      if (data.count >= this.BAN_LIMIT) {
        this.banTracker.delete(trackKey);
        await this.mitigateExecutor(
          guild,
          executor,
          `Anti-Nuke: Baneos masivos detectados (${data.count} en 10s)`,
        );
      }
    } catch (err) {
      console.error("[AntiNuke] Error en handleBanAdd:", err);
    }
  }

  private static async mitigateExecutor(
    guild: Guild,
    executor: { id: string; tag?: string | null },
    reason: string,
  ): Promise<void> {
    try {
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (!member) return;

      // Revocar roles administrativos que estén por debajo del rol más alto del bot
      const botHighestPos = guild.members.me?.roles.highest.position ?? 0;
      const rolesToRemove = member.roles.cache.filter(
        (r) =>
          !r.managed &&
          r.id !== guild.id &&
          (botHighestPos === 0 || r.position < botHighestPos),
      );
      if (rolesToRemove.size > 0) {
        await member.roles.remove(rolesToRemove, reason);
      }

      console.warn(
        `[AntiNuke] 🚨 Acción ejecutada contra ${executor.tag || executor.id}: ${reason}`,
      );
    } catch (err) {
      console.error("[AntiNuke] Fallo al mitigar ejecutor:", err);
    }
  }
}
