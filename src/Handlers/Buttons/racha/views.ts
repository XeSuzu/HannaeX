import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageComponentInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { IStreakGroup, StreakGroup } from "../../../Models/StreakGroup";
import { StreakMember } from "../../../Models/StreakMember";
import { generateStreakCard } from "../../../Services/CardService";
import type { HoshikoClient } from "../../..";

export type SafeReply = (content: any) => Promise<any>;

export function getTierEmoji(tier: string): string {
  const emojis: Record<string, string> = {
    Mayoi: "🖤", Ketsui: "🔥", Aruki: "💜", Negai: "🌌", Arashi: "🌈", Kiseki: "👑",
    starter: "🖤", burning: "🔥", star: "💜", guardian: "🌌", legend: "🌈", immortal: "👑",
  };
  return emojis[tier] || "❓";
}

export async function handleManageSelect(
  interaction: StringSelectMenuInteraction,
  client: HoshikoClient,
  safeReply: SafeReply
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }
  const groupId = interaction.values[0];
  const streak = await StreakGroup.findById(groupId);
  if (!streak) {
    await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
    return;
  }

  const member = await StreakMember.findOne({ userId: interaction.user.id, groupId });
  const freezesAvailable = member?.freezesAvailable ?? 0;
  const alreadyCovered = member?.dailyStatus === 'claimed' || member?.freezeUsedToday === true;
  const cardBuffer = await generateStreakCard(groupId, client);
  const attachment = new AttachmentBuilder(cardBuffer, { name: `streak-${groupId}.png` });
  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setImage(`attachment://streak-${groupId}.png`)
    .setFooter({ text: `ID de la racha: ${groupId}` });
  const managementRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`racha_rename_${groupId}`).setLabel("Renombrar").setStyle(ButtonStyle.Primary).setEmoji("✏️"),
    new ButtonBuilder().setCustomId(`racha_invite_${groupId}`).setLabel("Invitar").setStyle(ButtonStyle.Success).setEmoji("➕").setDisabled(streak.type === "duo"),
    new ButtonBuilder().setCustomId(`racha_leave_${groupId}`).setLabel("Abandonar").setStyle(ButtonStyle.Danger).setEmoji("❌"),
    new ButtonBuilder().setCustomId(`racha_use_freeze_${groupId}`).setLabel(`Usar Freeze (${freezesAvailable})`).setStyle(ButtonStyle.Secondary).setEmoji("❄️").setDisabled(freezesAvailable <= 0 || alreadyCovered)
  );
  await safeReply({ embeds: [embed], components: [managementRow], files: [attachment] });
}

export async function handleMyStreaks(
  interaction: MessageComponentInteraction,
  client: HoshikoClient,
  safeReply: SafeReply
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }
  const userStreaks = await StreakGroup.aggregate<IStreakGroup & { myStatus: string }>([
    { $match: { memberIds: interaction.user.id, status: { $ne: "dissolved" } } },
    {
      $lookup: {
        from: "streak_members", localField: "_id", foreignField: "groupId", as: "memberData",
        pipeline: [{ $match: { userId: interaction.user.id } }],
      },
    },
    { $addFields: { myStatus: { $arrayElemAt: ["$memberData.dailyStatus", 0] } } },
    { $sort: { currentStreak: -1 } },
  ]);

  if (userStreaks.length === 0) {
    await safeReply({ content: "No estás en ninguna racha activa. Crea una con `/racha crear`." });
    return;
  }
  if (userStreaks.length > 1) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("racha_manage_select")
      .setPlaceholder("Selecciona una racha para ver sus detalles")
      .addOptions(userStreaks.slice(0, 25).map((s) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(s.name)
          .setDescription(`Racha actual: ${s.currentStreak} días • Tier: ${s.tier}`)
          .setValue(s._id.toString())
          .setEmoji(getTierEmoji(s.tier))
      ));
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    await safeReply({ content: "Tienes varias rachas activas. ¿Cuál quieres ver en detalle?", components: [row] });
    return;
  }

  const streak = userStreaks[0];
  const groupId = streak._id.toString();
  const member = await StreakMember.findOne({ userId: interaction.user.id, groupId });
  const freezesAvailable = member?.freezesAvailable ?? 0;
  const alreadyCovered = streak.myStatus === 'claimed' || member?.freezeUsedToday === true;
  const cardBuffer = await generateStreakCard(groupId, client);
  const attachment = new AttachmentBuilder(cardBuffer, { name: `streak-${groupId}.png` });
  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setImage(`attachment://streak-${groupId}.png`)
    .setFooter({ text: `ID de la racha: ${groupId}` });
  const managementRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`racha_rename_${groupId}`).setLabel("Renombrar").setStyle(ButtonStyle.Primary).setEmoji("✏️"),
    new ButtonBuilder().setCustomId(`racha_invite_${groupId}`).setLabel("Invitar").setStyle(ButtonStyle.Success).setEmoji("➕").setDisabled(streak.type === "duo"),
    new ButtonBuilder().setCustomId(`racha_leave_${groupId}`).setLabel("Abandonar").setStyle(ButtonStyle.Danger).setEmoji("❌"),
    new ButtonBuilder().setCustomId(`racha_use_freeze_${groupId}`).setLabel(`Usar Freeze (${freezesAvailable})`).setStyle(ButtonStyle.Secondary).setEmoji("❄️").setDisabled(freezesAvailable <= 0 || alreadyCovered)
  );
  await safeReply({ embeds: [embed], components: [managementRow], files: [attachment] });
}

export async function handleCreateNew(safeReply: SafeReply): Promise<void> {
  await safeReply({ content: "➕ Usa `/racha crear` para crear una nueva racha con alguien~" });
}

export async function handleTop(
  interaction: MessageComponentInteraction,
  safeReply: SafeReply
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }
  const top = await StreakGroup.find({ status: "active" }).sort({ currentStreak: -1 }).limit(10);
  if (top.length === 0) {
    await safeReply({ content: "No hay rachas activas todavía. ¡Sé el primero!" });
    return;
  }
  const lines = top.map((s: IStreakGroup, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
    return `${medal} **${s.name}** ${getTierEmoji(s.tier)} — **${s.currentStreak} días**`;
  });
  const embed = new EmbedBuilder()
    .setTitle("🏆 Top Rachas Globales")
    .setColor(0xffd700)
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Reclama cada día para mantenerte en el top 🔥" });
  await safeReply({ embeds: [embed] });
}

export async function handleHelp(safeReply: SafeReply): Promise<void> {
  await safeReply({ content: "📖 Para ver la guía completa e interactiva, por favor usa el comando `/racha help`." });
}
