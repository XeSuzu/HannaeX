import {
  ChatInputCommandInteraction,
  Collection,
  MessageFlags,
} from "discord.js";
import { LocalCacheService } from "../../../App/infrastructure/cache/LocalCacheService";
import { RedisClientService } from "../../../App/infrastructure/redis/RedisClient";
import { buildRedisKey } from "../../../App/infrastructure/redis/RedisKeys";
import { HoshikoClient } from "../../../index";
import { Logger } from "../../../Utils/SystemLogger";
import { AnyCtx, safeRespond, handleCommandError } from "./utils";

const localInteractionLocks = new LocalCacheService<{ locked: true }>(
  "interaction_locks",
  { max: 5000, ttlMs: 15_000 },
);

async function acquireInteractionLock(interactionId: string): Promise<boolean> {
  if (localInteractionLocks.get(interactionId)) return false;
  localInteractionLocks.set(interactionId, { locked: true });

  if (RedisClientService.getState() === "ready") {
    const redis = RedisClientService.getClient();
    if (redis) {
      try {
        const res = await redis.set(
          buildRedisKey("ix_lock", interactionId),
          "1",
          "EX",
          15,
          "NX",
        );
        return res === "OK";
      } catch {
        // Si falla Redis, el lock L1 local ya protege este proceso
      }
    }
  }
  return true;
}

export async function handleCommands(
  interaction: AnyCtx,
  client: HoshikoClient,
) {
  const locked = await acquireInteractionLock(interaction.id);
  if (!locked) return;

  const lag = Date.now() - interaction.createdTimestamp;
  if (lag > 2000) {
    console.warn(
      `⚠️ [ALERTA] La interacción /${interaction.commandName} tardó ${lag}ms. ¡Peligro de 10062!`,
    );
  }

  if (!interaction.guild) {
    await interaction
      .reply({
        content:
          "🌸 Lo siento, mis comandos solo funcionan dentro de un servidor, nyaa~!",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return;
  }

  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd) {
    await interaction
      .reply({
        content:
          "🍥 Hmm... no encontré ese comando. ¿Seguro que lo escribiste bien? Puedes usar `/help` para ver la lista.",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return;
  }

  const cmdName = cmd.data.name;
  const { cooldowns } = client;
  if (!cooldowns.has(cmdName)) cooldowns.set(cmdName, new Collection());

  const now = Date.now();
  const timestamps = cooldowns.get(cmdName)!;
  const cooldownAmount =
    (("cooldown" in cmd
      ? cmd.cooldown
      : (cmd.options?.cooldown ?? 3)) as number) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime =
      timestamps.get(interaction.user.id)! + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      const text = `⏳ ¡Hey, más despacio, cerebrito! Espera \`${timeLeft.toFixed(1)}\` segunditos antes de usarme otra vez, nyaa~.`;
      await interaction
        .reply({ content: text, flags: MessageFlags.Ephemeral })
        .catch(() => {});
      return;
    }
  }

  const explicitNoDefer =
    cmd.defer === false || (cmd.options && cmd.options.defer === false);
  const isEphemeral = Boolean(
    (cmd as any).options?.ephemeral ||
    (cmd as any).options?.adminOnly ||
    (cmd as any).ephemeral ||
    (cmd as any).adminOnly,
  );

  if (!explicitNoDefer) {
    try {
      await interaction.deferReply({
        flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
      });
    } catch (err) {
      console.error(`❌ [${cmdName}] Defer fallido:`, err);
      return;
    }

    // Adaptador de resiliencia: si la interacción fue diferida centralmente,
    // adaptamos llamadas directas a deferReply() o reply() para evitar que
    // colisionen con Discord.js (InteractionAlreadyReplied).
    if (interaction.deferred) {
      const originalReply = interaction.reply.bind(interaction);
      interaction.deferReply = (async () => interaction.fetchReply()) as any;
      interaction.reply = (async (options: any) => {
        if (interaction.deferred && !interaction.replied) {
          const editPayload =
            typeof options === "string" ? { content: options } : { ...options };
          delete editPayload.flags;
          delete editPayload.ephemeral;
          return await interaction.editReply(editPayload);
        }
        if (interaction.replied) {
          return await interaction.followUp(options);
        }
        return await originalReply(options);
      }) as any;
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await cmd.execute(interaction as ChatInputCommandInteraction, client);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`💥 Error en "${interaction.commandName}":`, err);
    const channelName =
      interaction.channel && "name" in interaction.channel
        ? (interaction.channel as any).name || "desconocido"
        : "desconocido";
    await Logger.logCommandError(
      interaction.user,
      cmdName,
      err.message,
      channelName,
    );
    await handleCommandError(interaction, err, safeRespond);
  }
}
