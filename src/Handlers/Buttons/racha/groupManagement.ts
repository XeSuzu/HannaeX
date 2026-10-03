import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  MessageComponentInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { StreakGroup } from "../../../Models/StreakGroup";
import { StreakMember } from "../../../Models/StreakMember";
import { useFreeze } from "../../../Services/StreakService";
import { SafeReply } from "./views";

export async function handleRenameSubmit(
  interaction: ModalSubmitInteraction,
  customId: string,
  safeReply: SafeReply
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }
  const groupId = customId.split("_")[3];
  const newName = interaction.fields.getTextInputValue("newNameInput");

  try {
    const streak = await StreakGroup.findById(groupId);
    if (!streak) {
      await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada mientras la renombrabas." });
      return;
    }
    if (streak.ownerId !== interaction.user.id) {
      await safeReply({ content: "⛔ ¡Hey! Solo el propietario puede renombrar esta racha." });
      return;
    }
    const oldName = streak.name;
    streak.name = newName;
    await streak.save();
    await safeReply({
      content: `✅ ¡Racha renombrada con éxito!\n\n**Antes:** \`${oldName}\`\n**Ahora:** \`${newName}\``,
    });
  } catch (error) {
    console.error("Error renombrando racha:", error);
    await safeReply({ content: "❌ Ocurrió un error al intentar renombrar la racha. Por favor, inténtalo de nuevo." });
  }
}

export async function handleUseFreeze(
  interaction: MessageComponentInteraction,
  customId: string,
  safeReply: SafeReply
): Promise<void> {
  const groupId = customId.replace("racha_use_freeze_", "");
  const result = await useFreeze(interaction.user.id, groupId);
  if (result.ok) {
    await safeReply({
      content: "✅ ¡Freeze utilizado! Tu racha está a salvo para el ciclo de hoy. No necesitas reclamar.",
      components: [],
    });
  } else {
    let reasonText = "Ocurrió un error desconocido.";
    switch (result.reason) {
      case "no_freezes": reasonText = "No te quedan freezes disponibles."; break;
      case "already_frozen": reasonText = "Ya has utilizado un freeze para esta racha hoy."; break;
      case "not_found": reasonText = "No se encontró tu membresía en esta racha."; break;
    }
    await safeReply({ content: `❌ ${reasonText}` });
  }
}

export async function handleRenameButton(
  interaction: MessageComponentInteraction,
  customId: string,
  safeReply: SafeReply
): Promise<void> {
  const groupId = customId.split("_")[2];
  const streak = await StreakGroup.findById(groupId);
  if (!streak) {
    await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
    return;
  }
  if (interaction.user.id !== streak.ownerId) {
    await safeReply({ content: "❌ Solo el propietario de la racha puede renombrarla." });
    return;
  }
  const modal = new ModalBuilder()
    .setCustomId(`racha_rename_modal_${groupId}`)
    .setTitle("✏️ Renombrar Racha");
  const nameInput = new TextInputBuilder()
    .setCustomId("newNameInput")
    .setLabel("Nuevo nombre para la racha")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Un nombre épico para tu racha...")
    .setValue(streak.name)
    .setMaxLength(32)
    .setRequired(true);
  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
  modal.addComponents(row);
  await interaction.showModal(modal);
}

export async function handleInvite(
  interaction: MessageComponentInteraction,
  customId: string,
  safeReply: SafeReply
): Promise<void> {
  const groupId = customId.split("_")[2];
  const streak = await StreakGroup.findById(groupId);
  if (!streak) {
    await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
    return;
  }
  if (interaction.user.id !== streak.ownerId) {
    await safeReply({ content: "❌ Solo el propietario de la racha puede invitar a nuevos miembros." });
    return;
  }
  if (streak.type === "duo") {
    await safeReply({ content: "❌ No puedes invitar a nadie a una racha de tipo 'duo'." });
    return;
  }
  const MAX_MEMBERS = 5;
  if (streak.memberIds.length >= MAX_MEMBERS) {
    await safeReply({ content: `❌ La racha ya está llena (${streak.memberIds.length}/${MAX_MEMBERS} miembros).` });
    return;
  }

  await safeReply({ content: "👤 Menciona al usuario que quieres invitar a la racha. Tienes 30 segundos." });
  const filter = (m: Message) => m.author.id === interaction.user.id;
  const channel = interaction.channel;
  if (!channel || !("createMessageCollector" in channel)) {
    await safeReply({ content: "❌ No puedo escuchar respuestas en este tipo de canal." });
    return;
  }
  const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });
  let collected = false;
  collector.on("collect", async (message: Message) => {
    collected = true;
    const targetUser = message.mentions.users.first();
    await message.delete().catch(() => {});
    if (!targetUser || targetUser.bot || targetUser.id === interaction.user.id) {
      await interaction.editReply({ content: "❌ Mención inválida. Debes mencionar a otro usuario que no sea un bot." });
      return;
    }
    if (streak.memberIds.includes(targetUser.id)) {
      await interaction.editReply({ content: `❌ **${targetUser.username}** ya es miembro de esta racha.` });
      return;
    }
    streak.memberIds.push(targetUser.id);
    await new StreakMember({ userId: targetUser.id, groupId: streak._id }).save();
    await streak.save();
    await interaction.editReply({ content: `✅ ¡**${targetUser.username}** ha sido invitado a la racha **${streak.name}**!` });
  });
  collector.on("end", async () => {
    if (!collected) {
      await interaction.editReply({ content: "⏰ Tiempo agotado. La invitación ha sido cancelada." }).catch(() => {});
    }
  });
}

export async function handleLeaveConfirm(
  interaction: MessageComponentInteraction,
  customId: string,
  safeReply: SafeReply
): Promise<void> {
  const groupId = customId.replace("racha_leave_confirm_", "");
  const streak = await StreakGroup.findById(groupId);
  if (!streak) {
    await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
    return;
  }
  streak.memberIds = streak.memberIds.filter((id) => id !== interaction.user.id);
  if (streak.memberIds.length < 2) {
    streak.status = "dissolved";
    await StreakMember.deleteMany({ groupId: streak._id });
    await streak.save();
    await safeReply({
      content: "💀 Has abandonado la racha. Como ahora tiene menos de 2 miembros, ha sido disuelta.",
      components: [],
    });
    return;
  }
  if (streak.ownerId === interaction.user.id) {
    streak.ownerId = streak.memberIds[0];
  }
  await StreakMember.deleteOne({ userId: interaction.user.id, groupId: streak._id });
  await streak.save();
  await safeReply({ content: "🚪 Has abandonado la racha correctamente.", components: [] });
}

export async function handleLeaveCancel(safeReply: SafeReply): Promise<void> {
  await safeReply({ content: "❎ Operación cancelada.", components: [] });
}

export async function handleLeaveStart(
  interaction: MessageComponentInteraction,
  customId: string,
  safeReply: SafeReply
): Promise<void> {
  const groupId = customId.replace("racha_leave_", "");
  const streak = await StreakGroup.findById(groupId);
  if (!streak) {
    await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
    return;
  }
  const confirmationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`racha_leave_confirm_${groupId}`)
      .setLabel("Sí, abandonar esta racha")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("racha_leave_cancel")
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Secondary)
  );
  let warningMessage = `⚠️ ¿Estás seguro de que quieres abandonar la racha **${streak.name}**? Esta acción no se puede deshacer.`;
  if (streak.memberIds.length <= 2) {
    warningMessage += "\n\n**¡Cuidado!** Quedan muy pocos miembros. Si abandonas, la racha se disolverá permanentemente.";
  } else if (streak.ownerId === interaction.user.id) {
    warningMessage += "\n\n**¡Cuidado!** Eres el propietario. Si abandonas, la propiedad se transferirá a otro miembro.";
  }
  await safeReply({ content: warningMessage, components: [confirmationRow] });
}
