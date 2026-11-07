import {
  AuditLogEvent,
  Events,
  GuildChannel,
  EmbedBuilder,
  OverwriteType,
  TextChannel,
} from "discord.js";
import { HoshikoLogger } from "../../../../Security/Logger/HoshikoLogger";

function diffOverwrites(oldChannel: GuildChannel, newChannel: GuildChannel): string[] {
  const diffs: string[] = [];
  const oldCache = oldChannel.permissionOverwrites?.cache;
  const newCache = newChannel.permissionOverwrites?.cache;
  if (!oldCache || !newCache) return diffs;

  for (const [id, nw] of newCache.entries()) {
    const targetRef =
      nw.type === OverwriteType.Role
        ? id === newChannel.guild.id
          ? "@everyone"
          : `<@&${id}>`
        : `<@${id}>`;
    const old = oldCache.get(id);
    if (!old) {
      diffs.push(`**Overwrite añadido:** ${targetRef}`);
      continue;
    }
    if (
      old.allow.bitfield !== nw.allow.bitfield ||
      old.deny.bitfield !== nw.deny.bitfield
    ) {
      const addedAllow = nw.allow.missing(old.allow);
      const addedDeny = nw.deny.missing(old.deny);
      const parts: string[] = [];
      if (addedAllow.length > 0) parts.push(`+Allow(${addedAllow.slice(0, 4).join(", ")})`);
      if (addedDeny.length > 0) parts.push(`+Deny(${addedDeny.slice(0, 4).join(", ")})`);
      diffs.push(
        `**Permisos de canal (${targetRef}):** ${parts.length > 0 ? parts.join(" ") : "Permisos actualizados"}`,
      );
    }
  }

  for (const [id, old] of oldCache.entries()) {
    if (!newCache.has(id)) {
      const targetRef =
        old.type === OverwriteType.Role
          ? id === newChannel.guild.id
            ? "@everyone"
            : `<@&${id}>`
          : `<@${id}>`;
      diffs.push(`**Overwrite eliminado:** ${targetRef}`);
    }
  }

  return diffs;
}

export default {
  name: Events.ChannelUpdate,
  async execute(oldChannel: GuildChannel, newChannel: GuildChannel, client: any): Promise<void> {
    const changes: string[] = [];

    if (oldChannel.name !== newChannel.name)
      changes.push(`**Nombre:** \`${oldChannel.name}\` → \`${newChannel.name}\``);

    if (oldChannel.parent?.id !== newChannel.parent?.id)
      changes.push(`**Categoría:** \`${oldChannel.parent?.name ?? "Ninguna"}\` → \`${newChannel.parent?.name ?? "Ninguna"}\``);

    // Topic — solo en canales de texto
    const oldTopic = (oldChannel as TextChannel).topic ?? null;
    const newTopic = (newChannel as TextChannel).topic ?? null;
    if (oldTopic !== newTopic)
      changes.push(`**Topic:** \`${oldTopic ?? "vacío"}\` → \`${newTopic ?? "vacío"}\``);

    // Slowmode — solo en canales de texto
    const oldSlowmode = (oldChannel as TextChannel).rateLimitPerUser ?? 0;
    const newSlowmode = (newChannel as TextChannel).rateLimitPerUser ?? 0;
    if (oldSlowmode !== newSlowmode)
      changes.push(`**Slowmode:** \`${oldSlowmode}s\` → \`${newSlowmode}s\``);

    const overwriteChanges = diffOverwrites(oldChannel, newChannel);
    changes.push(...overwriteChanges);

    if (changes.length === 0) return;

    const executor =
      (await HoshikoLogger.fetchAuditExecutor(
        newChannel.guild,
        AuditLogEvent.ChannelUpdate,
        newChannel.id,
      )) ??
      (overwriteChanges.length > 0
        ? await HoshikoLogger.fetchAuditExecutor(
            newChannel.guild,
            AuditLogEvent.ChannelOverwriteUpdate,
            newChannel.id,
          )
        : null);

    const embed = new EmbedBuilder()
      .setTitle("✏️ Canal modificado")
      .setColor(0xfaa61a)
      .addFields(
        { name: "Canal", value: `<#${newChannel.id}> (\`${newChannel.id}\`)`, inline: true },
        {
          name: "Responsable",
          value: executor
            ? `<@${executor.id}> (\`${executor.tag}\`)`
            : "Actor no disponible",
          inline: true,
        },
        { name: "Cambios", value: changes.slice(0, 10).join("\n"), inline: false },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko Logs" });

    await HoshikoLogger.sendToChannel(newChannel.guild, "serverlog", embed);
  },
};
