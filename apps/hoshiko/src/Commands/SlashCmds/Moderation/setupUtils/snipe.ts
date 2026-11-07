import {
  ChannelSelectMenuInteraction,
  ChannelType,
  MessageFlags,
  TextChannel,
} from "discord.js";
import { SettingsManager } from "../../../../Database/guild/SettingsManager";
import {
  isPublicChannel,
  publishSnipeNotice,
} from "../../../../Services/SnipeConsentService";

export async function handleSnipeChannelSelect(
  i: ChannelSelectMenuInteraction,
  guildId: string,
): Promise<boolean> {
  if (!i.guild) return false;

  const selectedId = i.values[0];
  const channel = i.guild.channels.cache.get(selectedId) as
    | TextChannel
    | undefined;

  if (
    !channel ||
    ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(
      channel.type,
    )
  ) {
    await i.followUp({
      content: "❌ Canal inválido. Selecciona un canal de texto.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  if (!isPublicChannel(channel, i.guild)) {
    await i.followUp({
      content:
        "❌ Ese canal **no es público** (`@everyone` no puede verlo). Elige otro canal.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  const result = await publishSnipeNotice(i.guild, channel.id);
  if (!result.ok) {
    await i.followUp({
      content: `❌ No pude publicar el aviso: ${result.reason}`,
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  await SettingsManager.updateSettings(guildId, {
    "securityModules.snipe": true,
  } as any);

  await i.followUp({
    content: `✅ **Snipe activado.** Aviso de privacidad publicado en <#${channel.id}>.`,
    flags: MessageFlags.Ephemeral,
  });

  return true;
}

