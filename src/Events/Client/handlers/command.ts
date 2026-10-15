import {
  ChatInputCommandInteraction,
  Collection,
  MessageFlags,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { InteractionLock } from "../../../Models/InteractionLock";
import { Logger } from "../../../Utils/SystemLogger";
import { AnyCtx, safeRespond, handleCommandError } from "./utils";

export async function handleCommands(
  interaction: AnyCtx,
  client: HoshikoClient,
) {
  try {
    await InteractionLock.create({ _id: interaction.id });
  } catch (error: any) {
    if (error.code === 11000) return;
    console.error(
      `❌ Error al intentar adquirir cerrojo para interacción ${interaction.id}:`,
      error,
    );
    return;
  }

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
