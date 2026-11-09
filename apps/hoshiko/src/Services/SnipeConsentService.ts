import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  MessageFlags,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import GlobalProfile from "../Database/moderation/globalProfile.model";
import { SettingsManager } from "../Database/guild/SettingsManager";

export const buildSnipeNoticeEmbed = (guildName: string) =>
  new EmbedBuilder()
    .setColor(0xffb6c1)
    .setTitle("🌸 A veces borrar no basta")
    .setDescription(
      `En **${guildName}** puedo guardar mensajes eliminados durante **1 hora**.\n\n` +
        "Si alguien borra algo… lo recuerdo por un ratito.\n" +
        "Cualquiera puede usar `/snipe` antes de que desaparezca.\n\n" +
        "• 📌 Solo dentro de este servidor.\n" +
        "• ⏳ Se elimina automáticamente tras 1 hora.\n" +
        "• 🙈 Recuerda que los mensajes eliminados recientemente pueden ser consultados.\n\n" +
        "*Al permanecer en el servidor, aceptas este funcionamiento.* ✨",
    )
    .setFooter({ text: "Hoshiko • Privacidad • ToS ✓ ♡" })
    .setTimestamp();

export function isPublicChannel(channel: TextChannel, guild: Guild): boolean {
  const everyoneRole = guild.roles.everyone;
  const perms = channel.permissionsFor(everyoneRole);
  return perms?.has(PermissionFlagsBits.ViewChannel) ?? false;
}

export async function publishSnipeNotice(
  guild: Guild,
  channelId: string,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
      return { ok: false, reason: "El canal no existe o no es de texto." };
    }

    if (!isPublicChannel(channel, guild)) {
      return { ok: false, reason: "El canal debe ser público (@everyone debe poder leerlo)." };
    }

    await channel.send({ embeds: [buildSnipeNoticeEmbed(guild.name)] });
    return { ok: true };
  } catch {
    return { ok: false, reason: "No tengo permisos para escribir en ese canal." };
  }
}

/**
 * Consulta el estado de consentimiento de un usuario.
 */
export async function getUserSnipeConsent(
  userId: string,
): Promise<"approved" | "rejected" | "unset"> {
  try {
    const profile = await GlobalProfile.findOne({ userId }).select("snipeConsent");
    return profile?.snipeConsent ?? "unset";
  } catch {
    return "unset";
  }
}

/**
 * Guarda el consentimiento individual de un usuario.
 */
export async function setUserSnipeConsent(
  userId: string,
  consent: "approved" | "rejected",
): Promise<void> {
  await GlobalProfile.findOneAndUpdate(
    { userId },
    { $set: { snipeConsent: consent } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

// Control en memoria para no enviar spam de peticiones de consentimiento en el mismo canal/usuario
const activeConsentPrompts = new Set<string>();

/**
 * Envía la solicitud de consentimiento en el canal actual donde se ejecutó el primer /snipe
 */
export async function requestSnipeConsent(
  channel: any,
  authorId: string,
  guildName: string,
): Promise<void> {
  if (!channel || typeof channel.send !== "function") return;
  const promptKey = `${channel.id}:${authorId}`;
  if (activeConsentPrompts.has(promptKey)) return;

  activeConsentPrompts.add(promptKey);
  setTimeout(() => activeConsentPrompts.delete(promptKey), 10 * 60 * 1000); // 10 min cooldown por par canal/usuario

  const embed = new EmbedBuilder()
    .setColor(0xffb6c1)
    .setTitle("🌸 Consentimiento de Snipe")
    .setDescription(
      `Hola <@${authorId}>, alguien ha usado \`/snipe\` en este canal y coincide con un mensaje eliminado tuyo en **${guildName}**.\n\n` +
        `Para respetar tu privacidad, elige cómo deseas que se traten tus mensajes eliminados:\n\n` +
        `> • **Aprobar:** Tus mensajes borrados podrán mostrarse públicamente en el chat con \`/snipe\`.\n` +
        `> • **Rechazar:** Tus mensajes borrados **nunca se publicarán en el canal**. Si alguien intenta hacer snipe, **solo le saldrá en modo efímero y privado** a esa persona.\n\n` +
        `*Puedes cambiar esta preferencia en cualquier momento usando \`/snipe privacidad\`.*`,
    )
    .setFooter({ text: "Tu privacidad está bajo tu control • Hoshiko" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`snipe_consent:approve:${authorId}`)
      .setLabel("Aprobar (Público)")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`snipe_consent:reject:${authorId}`)
      .setLabel("Rechazar (Solo Efímero)")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary),
  );

  await channel
    .send({
      content: `<@${authorId}>`,
      embeds: [embed],
      components: [row],
    })
    .catch(() => null);
}

/**
 * Manejador del botón de consentimiento de Snipe
 */
export async function handleSnipeConsentButton(
  interaction: ButtonInteraction,
): Promise<boolean> {
  if (!interaction.customId.startsWith("snipe_consent:")) return false;

  const parts = interaction.customId.split(":");
  const action = parts[1]; // approve | reject
  const targetAuthorId = parts[2];

  if (interaction.user.id !== targetAuthorId) {
    await interaction.reply({
      content: "❌ Este aviso de consentimiento está dirigido a otro usuario.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const isApprove = action === "approve";
  const consent = isApprove ? "approved" : "rejected";
  await setUserSnipeConsent(targetAuthorId, consent);

  const confirmEmbed = new EmbedBuilder()
    .setColor(isApprove ? 0x57f287 : 0xfee75c)
    .setTitle(
      isApprove
        ? "✅ Consentimiento Aprobado"
        : "🔒 Modo Solo Efímero Activado",
    )
    .setDescription(
      isApprove
        ? `Has **aprobado** el consentimiento. Tus mensajes eliminados se podrán consultar con normalidad en el canal.\n\n*(Puedes cambiarlo cuando desees con \`/snipe privacidad\`)*.`
        : `Has **rechazado** el consentimiento público.\n\nA partir de ahora, cuando alguien intente consultar tus mensajes eliminados con \`/snipe\`, **solo le saldrán en modo efímero y privado** a esa persona sin publicarse en el chat.\n\n*(Puedes cambiarlo cuando desees con \`/snipe privacidad\`)*.`,
    )
    .setTimestamp();

  try {
    await interaction.update({
      embeds: [confirmEmbed],
      components: [],
    });
  } catch {
    await interaction.reply({
      embeds: [confirmEmbed],
      flags: MessageFlags.Ephemeral,
    });
  }

  return true;
}

export async function sendFirstDeleteNotice(
  _userId: string,
  _guild: Guild,
  _channelId: string,
  _client: any,
): Promise<void> {
  // Deprecado: Ya no se envía ping público al eliminar mensaje.
}
