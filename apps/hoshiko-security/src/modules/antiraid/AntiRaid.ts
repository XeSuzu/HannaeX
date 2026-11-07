import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildMember,
  TextChannel,
} from "discord.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { RaidEpisodeModel } from "./raidEpisode.model";
import { registerActiveEpisode } from "./raidAlertManager";

export interface RaidSuspectInfo {
  id: string;
  username: string;
  accountAgeDays: number;
  joinedSecondsAgo: number;
  timestamp: number;
}

export class AntiRaid {
  private static JOIN_LIMIT = 5;
  private static TIME_WINDOW = 15_000;
  private static joinsMap = new Map<string, RaidSuspectInfo[]>();

  static async handleJoin(member: GuildMember): Promise<void> {
    const now = Date.now();
    const guildId = member.guild.id;

    const accountAgeMs = now - member.user.createdTimestamp;
    const suspectInfo: RaidSuspectInfo = {
      id: member.id,
      username: member.user.username,
      accountAgeDays: accountAgeMs / 86_400_000,
      joinedSecondsAgo: 0,
      timestamp: now,
    };

    const currentJoins = (this.joinsMap.get(guildId) || []).filter(
      (j) => now - j.timestamp < this.TIME_WINDOW,
    );
    currentJoins.push(suspectInfo);
    this.joinsMap.set(guildId, currentJoins);

    if (currentJoins.length >= this.JOIN_LIMIT) {
      await this.triggerRaidAlert(member.guild, currentJoins);
    }
  }

  static async triggerRaidAlert(
    guild: Guild,
    suspects: RaidSuspectInfo[],
  ): Promise<void> {
    const episodeId = `raid_${guild.id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    try {
      const suspectIds = suspects.map((s) => s.id);
      const episodePayload = {
        episodeId,
        guildId: guild.id,
        startTime: Date.now(),
        lastSuspectTime: Date.now(),
        suspectIds,
        suspects: suspects.map((s) => ({
          id: s.id,
          username: s.username,
          accountAgeDays: s.accountAgeDays,
          joinedSecondsAgo: s.joinedSecondsAgo,
        })),
        resolved: false,
      };
      registerActiveEpisode(episodeId, episodePayload);

      if (mongoose.connection.readyState === 1) {
        await RaidEpisodeModel.create(episodePayload);
      }

      console.log(
        `[AntiRaid] 🚨 Alerta de raid en ${guild.name} (${guild.id}): ${suspects.length} sospechosos detectados. Episodio: ${episodeId}`,
      );

      // Encontrar canal de logs o sistema para notificar
      const channel =
        guild.systemChannel ||
        guild.channels.cache.find(
          (c) =>
            c.isTextBased() &&
            (c.name.includes("seguridad") ||
              c.name.includes("alertas") ||
              c.name.includes("mod-log")),
        );

      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle("🛡️ Hoshiko Security • Alerta de Raid Detectada")
          .setColor(0xed4245)
          .setDescription(
            `Se ha detectado una ráfaga anómala de uniones en menos de 15 segundos (${suspects.length} usuarios).\n\n` +
              `**Sospechosos detectados:**\n` +
              suspects
                .slice(0, 10)
                .map(
                  (s) =>
                    `• \`${s.username}\` (<@${s.id}>) — Cuenta: ${s.accountAgeDays.toFixed(1)}d`,
                )
                .join("\n"),
          )
          .setFooter({ text: `Episodio: ${episodeId}` })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`security_raid:ban:${episodeId}`)
            .setLabel("Banear sospechosos")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`security_raid:timeout:${episodeId}`)
            .setLabel("Aislar (Timeout 1h)")
            .setStyle(ButtonStyle.Secondary),
        );

        await (channel as TextChannel).send({
          embeds: [embed],
          components: [row],
        });
      }
    } catch (err) {
      console.error("[AntiRaid] Error al registrar episodio de raid:", err);
    }
  }
}
