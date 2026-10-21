import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  GuildMember,
} from "discord.js";
import { LocalCacheService } from "../../../App/infrastructure/cache/LocalCacheService";
import {
  triggerRaidAlert,
  RaidSuspectInfo,
} from "../../../Features/automod/raidAlertManager";

const recentJoinsCache = new LocalCacheService<
  Array<RaidSuspectInfo & { timestamp: number }>
>("automod_recent_joins", { max: 500, ttlMs: 30_000 });
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { UserHistoryManager } from "../../../Database/tracking/UserHistoryManager";
import { isServerLockedDown } from "../../../Features/automod/aiModeration";
import {
  addServerStressSafe,
  calculateJoinRiskScore,
  isIrregularName,
} from "../../../Features/automod/automodState";
import { SentinelNetwork } from "../../../Features/sentinelNetwork";
import {
  HoshikoLogger,
  LogLevel,
} from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember, client: any): Promise<void> {
    if (member.user.bot) return;

    try {
      await UserHistoryManager.addUser(member.id, {
        username: member.user.username,
        discriminator: member.user.discriminator,
        tag: member.user.tag,
        displayName: member.displayName,
        avatarUrl: member.user.displayAvatarURL({
          size: 1024,
          extension: member.user.avatar?.startsWith("a_") ? "gif" : "png",
        }),
        bannerUrl: member.user.bannerURL({ size: 1024 }),
        guildId: member.guild.id,
        guildName: member.guild.name,
        source: "member",
      });
    } catch (error) {
      console.error(
        "Error guardando historial de usuario en guildMemberAdd:",
        error,
      );
    }

    await SentinelNetwork.checkMember(member);

    const accountAgeMs = Date.now() - member.user.createdTimestamp;
    const isYoungAccount = accountAgeMs < 1000 * 60 * 60 * 24; // < 24h
    const hasNoAvatar = !member.user.avatar;

    const now = Date.now();
    const suspectInfo: RaidSuspectInfo & { timestamp: number } = {
      id: member.id,
      username: member.user.username,
      accountAgeDays: accountAgeMs / 86_400_000,
      joinedSecondsAgo: 0,
      timestamp: now,
    };

    const currentJoins = (recentJoinsCache.get(member.guild.id) || []).filter(
      (j) => now - j.timestamp < 15_000,
    );
    currentJoins.push(suspectInfo);
    recentJoinsCache.set(member.guild.id, currentJoins);

    // Pilar 2.1 y 7.4: Riesgo por señales compuestas en vez de booleano
    const risk = calculateJoinRiskScore({
      accountAgeDays: accountAgeMs / 86_400_000,
      hasNoAvatar,
      isIrregularName:
        isIrregularName(member.user.username) ||
        isIrregularName(member.displayName),
      joinedInRaidWindow: currentJoins.length >= 3,
    });

    if (risk.score > 0) {
      void addServerStressSafe(
        member.guild.id,
        member.id,
        Math.min(risk.score, 25),
        25,
      );
    }

    const settings = await SettingsManager.getSettings(member.guild.id);
    if (!settings) return;

    if (currentJoins.length >= 5 && settings.securityModules?.antiRaid) {
      void triggerRaidAlert({
        guild: member.guild,
        suspects: currentJoins,
      });
    }

    // Pilar 4 (Nivel 4): con El Torniquete activo se cierran las puertas a nuevos miembros
    if (
      settings.securityModules?.securityLevel === 4 &&
      (await isServerLockedDown(member.guild.id))
    ) {
      if (member.kickable) {
        await member
          .send(
            `🔒 **${member.guild.name}** está en modo de emergencia y no acepta nuevos miembros por ahora. Intenta de nuevo más tarde.`,
          )
          .catch(() => null);
        await member.kick("Hoshiko Nivel 4: servidor en Lockdown").catch(() => null);
        await HoshikoLogger.sendLog(
          member.guild,
          "SECURITY",
          `🚪 **Entrada bloqueada (Lockdown Nvl 4):** ${member.user.tag} fue expulsado al entrar.`,
          member.user,
        );
      }
      return;
    }

    // ─── 1. ANTI-ALT ────────────────────────────────────────────────────────
    if (settings.securityModules?.antiAlt) {
      const MIN_AGE = 1000 * 60 * 60 * 24 * 2; // 2 días

      if (accountAgeMs < MIN_AGE) {
        try {
          const ageInHours = (accountAgeMs / (1000 * 60 * 60)).toFixed(1);

          const verifyEmbed = new EmbedBuilder()
            .setTitle("🌸 Verificación de Seguridad")
            .setDescription(
              `¡Hola! Tu cuenta es muy reciente (${ageInHours}h). Para evitar ataques, necesitamos que confirmes que eres humano.`,
            )
            .setColor(0xfaa61a)
            .setFooter({ text: "Hoshiko Sentinel • Seguridad Activa" });

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`verify_alt_${member.id}`)
              .setLabel("¡Soy Humano! ✨")
              .setStyle(ButtonStyle.Success),
          );

          const dm = await member
            .send({ embeds: [verifyEmbed], components: [row] })
            .catch(() => null);

          if (!dm) {
            // DEF-11: Si MD está cerrado, aplicar cuarentena temporal sin depender de DMs
            if (member.moderatable) {
              await member
                .timeout(
                  24 * 60 * 60 * 1000,
                  "Anti-Alt: Cuenta < 2 días con MDs cerrados",
                )
                .catch(() => null);
            }
            HoshikoLogger.log({
              level: LogLevel.WARN,
              context: "Security/AntiAlt",
              message: `No pude enviar verificación a ${member.user.tag} (DM cerrado). Miembro puesto en cuarentena preventiva.`,
              guildId: member.guild.id,
            });
          }

          await HoshikoLogger.sendLog(
            member.guild,
            "ANTI_ALT",
            `El usuario **${member.user.tag}** tiene una cuenta de solo **${ageInHours}h**. Se solicitó verificación.`,
            member.user,
          );
        } catch (err) {
          console.error("❌ Error en Anti-Alt:", err);
        }
      }
    }

    // ─── 2. AUTO-JOIN ────────────────────────────────────────────────────────
    const rolesToGive: string[] = [];
    const rolesGivenNames: string[] = [];
    let errorOccurred: string | null = null;

    if (settings.autoJoin?.enabled && settings.autoJoin.roles.length > 0) {
      try {
        const botMember = member.guild.members.me;
        if (!botMember) throw new Error("No puedo encontrarme en el servidor.");

        const botHighestRole = botMember.roles.highest.position;

        for (const roleId of settings.autoJoin.roles) {
          const role = member.guild.roles.cache.get(roleId);
          if (role && role.position < botHighestRole) {
            rolesToGive.push(roleId);
            rolesGivenNames.push(role.name);
          } else if (role) {
            console.warn(`[AutoJoin] Rol "${role.name}" omitido por jerarquía.`);
          }
        }

        if (rolesToGive.length > 0) {
          await member.roles.add(rolesToGive, "🤖 Hoshiko Auto-Join");
        } else {
          errorOccurred =
            "No pude dar ningún rol. Verifica que mi rol esté por encima de los roles a asignar.";
        }
      } catch (error: any) {
        console.error(`❌ Error en Auto-Join (${member.guild.name}):`, error);
        errorOccurred = error.message || "Error desconocido.";
      }
    }

    // ─── 3. LOG DE ENTRADA EN JOINLOG ────────────────────────────────────────
    const createdTimestampSec = Math.floor(
      member.user.createdTimestamp / 1000,
    );
    const joinEmbed = new EmbedBuilder()
      .setTitle("🚪 Nuevo Miembro")
      .setColor(errorOccurred ? 0xed4245 : 0x57f287)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "Usuario",
          value: `${member.user.tag} \`(${member.user.id})\``,
          inline: true,
        },
        {
          name: "Cuenta creada",
          value: `<t:${createdTimestampSec}:R>`,
          inline: true,
        },
        {
          name: "Miembro #",
          value: `\`${member.guild.memberCount}\``,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Join Log" });

    if (rolesGivenNames.length > 0) {
      joinEmbed.addFields({
        name: "Roles Auto-Join",
        value: rolesGivenNames.map((r) => `\`@${r}\``).join(", "),
      });
    } else if (errorOccurred) {
      joinEmbed.addFields({
        name: "⚠️ Error Auto-Join",
        value: `\`${errorOccurred}\``,
      });
    }

    await HoshikoLogger.sendToChannel(member.guild, "joinlog", joinEmbed);
  },
};
