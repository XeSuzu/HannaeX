import { Events, Guild } from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { ServerConfig } from "../../../Database/guild/serverConfig.model";
import { StatusConfig } from "../../../Database/guild/statusConfig.model";
import { LevelConfig } from "../../../Database/leveling/levelConfig.model";
import { LocalLevel } from "../../../Database/leveling/localLevel.model";
import { ActiveVoiceSession } from "../../../Database/leveling/activeVoiceSession.model";
import { ServerEntityMemory } from "../../../Database/ai/serverEntityMemory.model";
import { Conversation } from "../../../Database/ai/conversation.model";
import UserMemory from "../../../Database/ai/userMemory.model";
import AiTester from "../../../Database/ai/aiTester.model";
import { AvatarHistory, PresenceHistory } from "../../../Database/tracking/userTracking.models";
import { CaseModel, GuildSequenceModel } from "../../../Database/moderation/case.model";
import { Snipe } from "../../../Database/moderation/snipe.model";
import { Warning } from "../../../Database/moderation/warning.model";
import { Confession } from "../../../Database/community/confession.model";
import { Suggestion } from "../../../Database/community/suggestion.model";
import { Couple } from "../../../Database/community/couple.model";
import { CacheManager } from "../../../Database/guild/CacheManager";
import { LevelConfigCache } from "../../../Database/leveling/LevelConfigCache";
import { HoshikoLogger, LogLevel } from "../../../Security";

export default {
  name: Events.GuildDelete,

  async execute(guild: Guild, _client: HoshikoClient) {
    // Si guild.available === false, se trata de una interrupción temporal de Discord (outage), NO una salida
    if (guild && guild.available === false) {
      console.log(
        `[GuildDelete] Interrupción temporal de conectividad con el servidor ${guild.id}. Conservando datos por caída de Discord.`,
      );
      return;
    }

    const guildId = guild?.id;
    if (!guildId) return;

    console.log(
      `[GuildDelete] Hoshiko fue retirado de la comunidad: ${guild.name ?? "Desconocido"} (${guildId}). Iniciando purga de datos conforme a Discord Developer Terms.`,
    );

    try {
      // 1. Invalidar cachés en memoria
      CacheManager.flush(guildId);
      LevelConfigCache.invalidate(guildId);

      // 2. Eliminar datos exclusivamente acotados al servidor (Minimización y Términos de Desarrollador de Discord)
      // Preservando estrictamente datos globales soberanos de usuarios (perfiles globales, recuerdos personales)
      await Promise.allSettled([
        ServerConfig.deleteOne({ guildId }),
        StatusConfig.deleteOne({ guildId }),
        LevelConfig.deleteOne({ guildId }),
        LocalLevel.deleteMany({ guildId }),
        ActiveVoiceSession.deleteMany({ guildId }),
        ServerEntityMemory.deleteMany({ guildId }),
        Conversation.deleteMany({ guildId }),
        UserMemory.deleteMany({ guildId }),
        AiTester.deleteMany({ guildId }),
        AvatarHistory.deleteMany({ guildId }),
        PresenceHistory.deleteMany({ guildId }),
        CaseModel.deleteMany({ guildId }),
        GuildSequenceModel.deleteMany({ guildId }),
        Snipe.deleteMany({ guildId }),
        Warning.deleteMany({ guildId }),
        Confession.deleteMany({ guildId }),
        Suggestion.deleteMany({ guildId }),
        Couple.deleteMany({ guildId }),
      ]);

      // 3. Auditoría de eliminación ciega (Zero-Knowledge: registrar guildId sin datos personales de miembros)
      await HoshikoLogger.log({
        level: LogLevel.INFO,
        context: "Compliance/DataRetention",
        message: `Guild-scoped data purged following bot removal from server ${guildId}`,
        metadata: {
          guildId,
          timestamp: new Date().toISOString(),
          compliance: "Discord-Developer-Policy-Section-4",
        },
      });

      console.log(
        `[GuildDelete] Purga completada con éxito para servidor ${guildId}. Perfiles globales y recuerdos personales preservados.`,
      );
    } catch (err: any) {
      console.error(`[GuildDelete] Error durante purga de servidor ${guildId}:`, err);
      await HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "Compliance/DataRetention",
        message: `Error purging guild data for ${guildId}`,
        metadata: { guildId, error: err?.message },
      });
    }
  },
};
