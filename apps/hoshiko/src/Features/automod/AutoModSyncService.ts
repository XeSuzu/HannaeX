import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  Guild,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import type { HoshikoClient } from "../../client/HoshikoClient";
import { SettingsManager } from "../../Database/guild/SettingsManager";
import { HoshikoLogger, LogLevel } from "../../Security";

export interface SyncResult {
  guildId: string;
  guildName: string;
  success: boolean;
  rulesCreated: number;
  rulesUpdated: number;
  rulesTotal: number;
  error?: string;
}

export class AutoModSyncService {
  /**
   * Sincroniza las reglas de AutoMod nativas de Discord para un servidor individual
   * basándose en la configuración que el servidor ya tiene definida en el bot.
   */
  static async syncGuildAutoMod(
    guild: Guild,
    client: HoshikoClient,
  ): Promise<SyncResult> {
    const me = guild.members.me;
    if (
      !me ||
      (!me.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !me.permissions.has(PermissionFlagsBits.Administrator))
    ) {
      return {
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        rulesCreated: 0,
        rulesUpdated: 0,
        rulesTotal: 0,
        error: "El bot no tiene permisos de Gestionar Servidor o Administrador.",
      };
    }

    try {
      const config = await SettingsManager.getSettings(guild.id);
      const existingRules = await guild.autoModerationRules.fetch();

      const secModules = config.securityModules || ({} as any);
      const antiLinksActive = Boolean(secModules.antiLinks);
      const antiSpamActive = Boolean(secModules.antiSpam ?? true);
      const wordFilterActive = Boolean(secModules.wordFilter);

      // Filtrar roles y canales exentos que realmente existan en el servidor
      const exemptRoles = (config.exemptRoles || []).filter((id) =>
        guild.roles.cache.has(id),
      );
      const exemptChannels = (config.exemptChannels || []).filter((id) =>
        guild.channels.cache.has(id),
      );

      // Determinar canal de logs si está configurado y el bot puede escribir en él
      const alertChannelId =
        config.logChannels?.modlog ||
        config.logChannels?.linkslog ||
        config.modLogChannel;
      let alertChannel: TextChannel | null = null;
      if (alertChannelId) {
        const ch = guild.channels.cache.get(alertChannelId);
        if (
          ch &&
          ch.isTextBased() &&
          me.permissionsIn(ch as TextChannel).has(PermissionFlagsBits.SendMessages)
        ) {
          alertChannel = ch as TextChannel;
        }
      }

      const defaultActions = (customMsg: string) => {
        const actions: any[] = [
          {
            type: AutoModerationActionType.BlockMessage,
            metadata: { customMessage: customMsg },
          },
        ];
        if (alertChannel) {
          actions.push({
            type: AutoModerationActionType.SendAlertMessage,
            metadata: { channel: alertChannel.id },
          });
        }
        return actions;
      };

      // Whitelist de dominios permitidos del servidor (limitado a 60 caracteres según el esquema de Discord)
      const allowedDomains = (config.allowedLinks || [])
        .map((d) => `*${d}*`)
        .filter((entry) => entry.length >= 1 && entry.length <= 60);

      // Definición de las reglas deseadas según la configuración del servidor
      const desiredRules: any[] = [
        {
          name: "[Hoshiko] Anti-Invitaciones Discord",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: [
              "*discord.gg/*",
              "*discord.com/invite/*",
              "*discordapp.com/invite/*",
            ],
            allowList: allowedDomains,
          },
          actions: defaultActions(
            "Hoshiko AutoMod: El envío de invitaciones no autorizadas está prohibido.",
          ),
          enabled: antiLinksActive,
        },
        {
          name: "[Hoshiko] Anti-Phishing y Grabbers",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: [
              "*grabify.link/*",
              "*iplogger.*",
              "*2no.co/*",
              "*yip.su/*",
              "*iplis.ru/*",
              "*free-nitro*",
              "*nitro-free*",
              "*steamcomminuty.*",
              "*steamcommunity-gift.*",
              "*dlscord.*",
              "*discorcd.*",
            ],
          },
          actions: defaultActions(
            "Hoshiko AutoMod: Enlace sospechoso o fraudulento bloqueado.",
          ),
          enabled: true,
        },
        {
          name: "[Hoshiko] Detección de Exploits y Crashes",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: [
              "*crash-discord*",
              "*token-grabber*",
              "*selfbot*",
              "*raid-bot*",
            ],
          },
          actions: defaultActions(
            "Hoshiko AutoMod: Contenido malicioso o exploit bloqueado.",
          ),
          enabled: true,
        },
        {
          name: "[Hoshiko] Filtro de Enlaces Masivos",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: ["http://*", "https://*"],
            allowList: [
              "*discord.com/*",
              "*discordapp.com/*",
              "*discord.media/*",
              "*tenor.com/*",
              "*giphy.com/*",
              "*klipy.com/*",
              "*youtube.com/*",
              "*youtu.be/*",
              "*spotify.com/*",
              "*twitch.tv/*",
              ...allowedDomains,
            ],
          },
          actions: defaultActions(
            "Hoshiko AutoMod: Enlaces no permitidos por la seguridad del servidor.",
          ),
          enabled: antiLinksActive,
        },
        {
          name: "[Hoshiko] Toxicidad y Acoso Extremo",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: [
              "*kys*",
              "*suicide*",
              "*kill yourself*",
              "*cp*",
              "*child porn*",
            ],
          },
          actions: defaultActions(
            "Hoshiko AutoMod: Mensaje bloqueado por infracción de normas de convivencia.",
          ),
          enabled: wordFilterActive || (secModules.securityLevel ?? 2) >= 2,
        },
        {
          name: "[Hoshiko] Filtro de Contenido Spam",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Spam,
          triggerMetadata: {},
          actions: [
            {
              type: AutoModerationActionType.BlockMessage,
            },
          ],
          enabled: antiSpamActive,
        },
        {
          name: "[Hoshiko] Palabras Ofensivas Discord",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.KeywordPreset,
          triggerMetadata: { presets: [1, 2, 3] }, // Profanity, Sexual Content, Slurs
          actions: [
            {
              type: AutoModerationActionType.BlockMessage,
            },
          ],
          enabled: true,
        },
        {
          name: "[Hoshiko] Anti-Spam Menciones",
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.MentionSpam,
          triggerMetadata: { mentionTotalLimit: 5 },
          actions: defaultActions(
            "Hoshiko AutoMod: Límite de menciones masivas excedido.",
          ),
          enabled: antiSpamActive,
        },
      ];

      let created = 0;
      let updated = 0;

      for (const ruleDef of desiredRules) {
        try {
          const existing = existingRules.find((r) => r.name === ruleDef.name);

          // Verificar si ya existe otra regla con el mismo trigger exclusivo o si se alcanzó el límite de Keyword (6)
          if (!existing) {
            if (ruleDef.triggerType === AutoModerationRuleTriggerType.Keyword) {
              const currentKeywords = existingRules.filter(
                (r) => r.triggerType === AutoModerationRuleTriggerType.Keyword,
              ).size;
              if (currentKeywords >= 6) {
                continue;
              }
            }

            const hasSameTrigger = existingRules.some(
              (r) =>
                r.triggerType === ruleDef.triggerType &&
                [
                  AutoModerationRuleTriggerType.Spam,
                  AutoModerationRuleTriggerType.KeywordPreset,
                  AutoModerationRuleTriggerType.MentionSpam,
                ].includes(ruleDef.triggerType),
            );
            if (hasSameTrigger) {
              // Ya existe una regla de este tipo en el servidor (ej. Block Mention Spam previa), no duplicar
              continue;
            }
          }

          const payload: any = {
            name: ruleDef.name,
            eventType: ruleDef.eventType,
            triggerType: ruleDef.triggerType,
            triggerMetadata: ruleDef.triggerMetadata,
            actions: ruleDef.actions,
            enabled: ruleDef.enabled,
            exemptRoles,
            exemptChannels,
          };

          if (existing) {
            await existing.edit(payload);
            updated++;
          } else {
            await guild.autoModerationRules.create({
              ...payload,
              reason: "Hoshiko AutoMod: Sincronización automática de reglas",
            });
            created++;
          }
        } catch (ruleErr: any) {
          void HoshikoLogger.log({
            level: LogLevel.WARN,
            context: "AutoModSync/Rule",
            message: `Regla ${ruleDef.name} omitida en ${guild.name}: ${ruleErr?.message || String(ruleErr)}`,
            guildId: guild.id,
          });
        }
      }

      const postSyncRules = await guild.autoModerationRules.fetch().catch(() => existingRules);
      const hoshikoRules = postSyncRules.filter((r) => r.name.startsWith("[Hoshiko]")).size;

      return {
        guildId: guild.id,
        guildName: guild.name,
        success: true,
        rulesCreated: created,
        rulesUpdated: updated,
        rulesTotal: hoshikoRules,
      };
    } catch (err: any) {
      void HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "AutoModSync/Guild",
        message: `Error sincronizando AutoMod en ${guild.name}: ${err?.message || String(err)}`,
        guildId: guild.id,
      });

      return {
        guildId: guild.id,
        guildName: guild.name,
        success: false,
        rulesCreated: 0,
        rulesUpdated: 0,
        rulesTotal: 0,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Sincroniza todos los servidores donde el bot tenga permisos de administración de AutoMod.
   */
  static async syncAllGuildsAutoMod(client: HoshikoClient): Promise<{
    syncedGuilds: number;
    skippedGuilds: number;
    totalHoshikoRules: number;
    results: SyncResult[];
  }> {
    const results: SyncResult[] = [];
    let syncedGuilds = 0;
    let skippedGuilds = 0;
    let totalHoshikoRules = 0;

    for (const [, guild] of client.guilds.cache) {
      const me = guild.members.me;
      const canManage =
        me &&
        (me.permissions.has(PermissionFlagsBits.ManageGuild) ||
          me.permissions.has(PermissionFlagsBits.Administrator));

      if (!canManage) {
        skippedGuilds++;
        continue;
      }

      const res = await this.syncGuildAutoMod(guild, client);
      results.push(res);

      if (res.success) {
        syncedGuilds++;
        totalHoshikoRules += res.rulesTotal;
      } else {
        skippedGuilds++;
      }

      // Pequeña pausa para no golpear rate limits de la API de Discord
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    void HoshikoLogger.log({
      level: LogLevel.INFO,
      context: "AutoModSync/All",
      message: `AutoMod Global Sync completado: ${syncedGuilds} servidores sincronizados, ${totalHoshikoRules} reglas activas en Discord.`,
    });

    return {
      syncedGuilds,
      skippedGuilds,
      totalHoshikoRules,
      results,
    };
  }
}
