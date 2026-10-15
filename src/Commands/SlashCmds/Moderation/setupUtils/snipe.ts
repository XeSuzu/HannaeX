import {
  TextChannel,
  Message,
  MessageFlags,
  ReadonlyCollection,
  ChannelType,
} from "discord.js";
import { SettingsManager } from "../../../../Database/SettingsManager";
import {
  publishSnipeNotice,
  isPublicChannel,
} from "../../../../Services/SnipeConsentService";

export async function handleSnipeToggle(
  interaction: any,
  i: any,
  guildId: string,
  updateUI: () => Promise<void>,
) {
  const set = await SettingsManager.getSettings(guildId);
  const currentSnipe = set?.securityModules?.snipe || false;

  if (currentSnipe) {
    await SettingsManager.updateSettings(guildId, {
      "securityModules.snipe": false,
    } as any);
    await updateUI();
    return;
  }

  await i.followUp({
    content:
      "🕵️ **Activar Snipe**\n\nNecesito publicar un **aviso de privacidad en un canal público** para cumplir con los Términos de Servicio de Discord.\n\nEscribe `#` y **selecciona el canal de la lista de Discord**.\n⚠️ **No escribas el nombre como texto plano** — debe ser una mención válida.\n\n⚠️ El canal debe ser visible para **@everyone**.\n*Tienes 60 segundos para responder.*",
    flags: MessageFlags.Ephemeral,
  });

  const textChannel = interaction.channel as TextChannel;
  if (!textChannel?.createMessageCollector) return;

  const channelCollector = textChannel.createMessageCollector({
    filter: (m: Message) => m.author.id === interaction.user.id,
    time: 60_000,
    max: 1,
  });

  channelCollector.on("collect", async (m: Message) => {
    await m.delete().catch(() => {});
    let mentioned = m.mentions.channels.first() as TextChannel | undefined;
    if (!mentioned) {
      const match = m.content.match(/<#(\d+)>/);
      if (match)
        mentioned = interaction.guild!.channels.cache.get(match[1]) as
          | TextChannel
          | undefined;
    }

    if (
      !mentioned ||
      ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(
        mentioned.type,
      )
    ) {
      await i.followUp({
        content: "❌ Canal inválido. Operación cancelada.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!isPublicChannel(mentioned, interaction.guild!)) {
      await i.followUp({
        content:
          "❌ Ese canal **no es público** (@everyone no puede verlo). Operación cancelada.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const result = await publishSnipeNotice(interaction.guild!, mentioned.id);
    if (!result.ok) {
      await i.followUp({
        content: `❌ No pude publicar el aviso: ${result.reason}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await SettingsManager.updateSettings(guildId, {
      "securityModules.snipe": true,
    } as any);
    await i.followUp({
      content: `✅ Snipe activado. Aviso de privacidad publicado en <#${mentioned.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
    await updateUI();
  });

  channelCollector.on(
    "end",
    async (collected: ReadonlyCollection<string, Message>) => {
      if (collected.size === 0)
        await i
          .followUp({
            content: "⏰ Tiempo agotado. Snipe no fue activado.",
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
    },
  );
}
