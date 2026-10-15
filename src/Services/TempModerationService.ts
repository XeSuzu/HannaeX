import cron from "node-cron";
import type { HoshikoClient } from "../client/HoshikoClient";
import TempModeration, {
  FailureCode,
  ITempModeration,
  TempModerationType,
} from "../Models/TempModeration";
import { HoshikoLogger } from "../Security/Logger/HoshikoLogger";

interface ScheduleTempModerationInput {
  guildId: string;
  userId: string;
  tipo: TempModerationType;
  expiresAt: Date;
  moderatorId: string;
  reason: string;
  roleId?: string;
  duration: string;
}

const UNKNOWN_BAN_CODE = 10026;
const UNKNOWN_MEMBER_CODE = 10007;
const MAX_ATTEMPTS = 5;
const BACKOFF_DELAYS_MS = [30000, 60000, 120000, 300000];

function hasDiscordCode(error: unknown, code: number): boolean {
  if (!error || typeof error !== "object") return false;
  const discordError = error as {
    code?: number | string;
    rawError?: { code?: number };
  };
  return (
    Number(discordError.code) === code ||
    Number(discordError.rawError?.code) === code
  );
}

function getFailureCode(error: any): FailureCode {
  const code = Number(error?.code || error?.rawError?.code);
  if (code === 50013) return "MissingPermissions";
  if (code === 10004) return "UnknownGuild";
  if (code === 10011) return "UnknownRole";
  if (error?.status === 429) return "RateLimited";
  if (code === UNKNOWN_MEMBER_CODE) return "UnknownUser";
  return "Other";
}

export class TempModerationService {
  private static isProcessing = false;

  static async schedule(
    input: ScheduleTempModerationInput,
  ): Promise<ITempModeration> {
    const { guildId, userId, tipo } = input;
    const record = await TempModeration.findOneAndUpdate(
      { guildId, userId, tipo },
      { $set: input },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    return record;
  }

  static async processExpirations(client: HoshikoClient): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const dueRecords = await TempModeration.find({
        expiresAt: { $lte: now },
        $and: [
          { $or: [{ status: "pending" }, { status: { $exists: false } }] },
          {
            $or: [
              { nextAttemptAt: { $lte: now } },
              { nextAttemptAt: { $exists: false } },
            ],
          },
        ],
      })
        .sort({ expiresAt: 1 })
        .limit(100);

      for (const record of dueRecords) {
        try {
          await this.processRecord(client, record, now);
        } catch (error) {
          record.attempts = (record.attempts || 0) + 1;

          if (record.attempts >= MAX_ATTEMPTS) {
            record.status = "permanentFailure";
            record.failureCode = getFailureCode(error);
          } else {
            const backoff = BACKOFF_DELAYS_MS[record.attempts - 1] || 300000;
            record.nextAttemptAt = new Date(Date.now() + backoff);
          }
          await record.save();
        }
      }
    } catch (error) {
      console.error("[TempModeration] Error consultando vencimientos:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  static start(client: HoshikoClient): void {
    cron.schedule("* * * * *", () => {
      void this.processExpirations(client);
    });
    void this.processExpirations(client);
  }

  private static async processRecord(
    client: HoshikoClient,
    record: ITempModeration,
    now: Date,
  ): Promise<void> {
    const guild = client.guilds.cache.get(record.guildId);
    if (!guild) throw new Error("UnknownGuild");

    if (record.tipo === "ban") {
      let ban;
      try {
        ban = await guild.bans.fetch(record.userId);
      } catch (error) {
        if (!hasDiscordCode(error, UNKNOWN_BAN_CODE)) throw error;
      }

      if (ban) {
        await guild.bans.remove(
          record.userId,
          "Tempban expirado automáticamente",
        );
        await HoshikoLogger.logAction(guild, "UNWARN", {
          user: ban.user,
          moderator: client.user,
          reason: "Tempban expirado",
          extra: `Duración original: ${record.duration}`,
        });
      }

      await record.deleteOne();
      return;
    }

    let member;
    try {
      member = await guild.members.fetch(record.userId);
    } catch (error) {
      if (!hasDiscordCode(error, UNKNOWN_MEMBER_CODE)) throw error;
    }

    if (
      member?.communicationDisabledUntilTimestamp &&
      member.communicationDisabledUntilTimestamp > now.getTime()
    ) {
      await member.timeout(null, "Tempmute expirado automáticamente");
      await HoshikoLogger.logAction(guild, "UNWARN", {
        user: member.user,
        moderator: client.user,
        reason: "Tempmute expirado",
        extra: `Duración original: ${record.duration}`,
      });
    }

    await record.deleteOne();
  }
}
