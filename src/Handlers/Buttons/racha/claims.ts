import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageComponentInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { IStreakGroup, StreakGroup } from "../../../Models/StreakGroup";
import { IStreakMember, StreakMember } from "../../../Models/StreakMember";
import { claimStreak } from "../../../Services/StreakService";
import type { HoshikoClient } from "../../..";
import { getTierEmoji } from "./views";
import type { SafeReply } from "./views";

async function sendTierUpNotification(
  groupId: string,
  tierUp: { from: string; to: string },
  client: HoshikoClient
) {
  const group = await StreakGroup.findById(groupId);
  if (!group || !group.createdInChannelId) return;

  try {
    const channel = await client.channels.fetch(group.createdInChannelId);
    if (!channel || !('send' in channel) || !channel.isTextBased()) return;
    const tierEmoji = getTierEmoji(tierUp.to);
    const embed = new EmbedBuilder()
      .setTitle(`🎉 ¡NUEVO TIER ALCANZADO! 🎉`)
      .setDescription(`¡La racha **${group.name}** ha subido de nivel!\n\n**${tierUp.from}** ➡ **${tierUp.to}** ${tierEmoji}`)
      .setColor(0xffd700)
      .setTimestamp();
    const membersMention = group.memberIds.map((id) => `<@${id}>`).join(" ");
    await channel.send({ content: `¡Felicidades, ${membersMention}!`, embeds: [embed] });
  } catch (e) {
    console.error(`[Racha] No se pudo enviar la notificación de tier-up para el grupo ${groupId}:`, e);
  }
}

function buildClaimEmbed(
  group: IStreakGroup | null,
  result: Awaited<ReturnType<typeof claimStreak>>
): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle("✅ Racha reclamada");
  if (result.ok) {
    embed
      .setColor(0x00ff88)
      .setDescription(
        `**${group?.name}** → **Reclamado** ✅\n` +
        `Racha actual: **${result.currentStreak} días** ${getTierEmoji(group?.tier || "starter")}`
      );
    if (result.hofAchieved) {
      embed.addFields({
        name: "👑 ¡HALL OF FAME ALCANZADO!",
        value: `¡${group?.name} es ahora leyenda eterna! 🎉`,
        inline: false,
      });
    }
  } else {
    embed.setColor(0xff6b6b).setDescription("❌ Error: " + result.reason);
  }
  return embed;
}

export async function handleClaimPending(
  interaction: MessageComponentInteraction,
  client: HoshikoClient,
  safeReply: SafeReply
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }
  const pending: IStreakMember[] = await StreakMember.find({
    userId: interaction.user.id,
    dailyStatus: "pending",
  });
  if (pending.length === 0) {
    await safeReply({ content: "✅ **¡Todas tus rachas están al día!**\nNo hay pendientes." });
    return;
  }

  if (pending.length === 1) {
    const groupId = pending[0].groupId.toString();
    const result = await claimStreak(interaction.user.id, groupId);
    const group = await StreakGroup.findById(pending[0].groupId);
    await safeReply({ embeds: [buildClaimEmbed(group, result)] });
    if (result.ok && result.tierUp) {
      await sendTierUpNotification(groupId, result.tierUp, client);
    }
    return;
  }

  const groupIds = pending.map((m) => m.groupId);
  const groups: IStreakGroup[] = await StreakGroup.find({ _id: { $in: groupIds } });
  const groupMap = new Map(groups.map((g: IStreakGroup) => [g._id.toString(), g]));
  const select = new StringSelectMenuBuilder()
    .setCustomId("racha_claim_select")
    .setPlaceholder("Selecciona la racha para reclamar")
    .addOptions(
      pending.slice(0, 25).map((m: IStreakMember) => {
        const group: IStreakGroup | undefined = groupMap.get(m.groupId.toString());
        return new StringSelectMenuOptionBuilder()
          .setLabel(group?.name || "Racha desconocida")
          .setDescription(`${m.totalClaims} claims • ${getTierEmoji(group?.tier || "starter")} ${group?.tier || ""}`)
          .setValue(m.groupId.toString());
      })
    );
  await safeReply({
    content: `Tienes **${pending.length} rachas pendientes**. Selecciona una para reclamar:`,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  });
}

export async function handleClaimSelect(
  interaction: StringSelectMenuInteraction,
  client: HoshikoClient,
  safeReply: SafeReply
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }
  const groupId = interaction.values[0];
  const result = await claimStreak(interaction.user.id, groupId);
  const group = await StreakGroup.findById(groupId);
  await safeReply({ embeds: [buildClaimEmbed(group, result)] });
  if (result.ok && result.tierUp) {
    await sendTierUpNotification(groupId, result.tierUp, client);
  }
}
