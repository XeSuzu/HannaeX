import { MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";
import { HoshikoClient } from "../..";
import { handleClaimPending, handleClaimSelect } from "./racha/claims";
import {
  handleInvite,
  handleLeaveCancel,
  handleLeaveConfirm,
  handleLeaveStart,
  handleRenameButton,
  handleRenameSubmit,
  handleUseFreeze,
} from "./racha/groupManagement";
import {
  handleCreateNew,
  handleHelp,
  handleManageSelect,
  handleMyStreaks,
  handleTop,
  SafeReply,
} from "./racha/views";

export async function handleRachaButton(
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  client: HoshikoClient
): Promise<void> {
  const safeReply: SafeReply = async (content: any) => {
    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(content);
      } else {
        return await interaction.reply({ ...content, ephemeral: true });
      }
    } catch (e) {
      console.error("Error al responder:", e);
    }
  };

  try {
    const customId = interaction.customId;

    // Modal submits must be handled before the message-component guard.
    if (interaction.isModalSubmit() && customId.startsWith("racha_rename_modal_")) {
      await handleRenameSubmit(interaction, customId, safeReply);
      return;
    }

    // All remaining routes are message components.
    if (!interaction.isMessageComponent()) return;

    if (customId === "racha_claim_pending" || customId === "racha_claim_all_pending") {
      await handleClaimPending(interaction, client, safeReply);
    } else if (interaction.isStringSelectMenu() && customId === "racha_claim_select") {
      await handleClaimSelect(interaction, client, safeReply);
      return;
    } else if (interaction.isStringSelectMenu() && customId === "racha_manage_select") {
      await handleManageSelect(interaction, client, safeReply);
      return;
    } else if (interaction.isButton() && customId.startsWith("racha_use_freeze_")) {
      await handleUseFreeze(interaction, customId, safeReply);
      return;
    } else if (interaction.isButton() && customId.startsWith("racha_rename_")) {
      await handleRenameButton(interaction, customId, safeReply);
      return;
    } else if (interaction.isButton() && customId.startsWith("racha_invite_")) {
      await handleInvite(interaction, customId, safeReply);
      return;
    } else if (interaction.isButton() && customId.startsWith("racha_leave_confirm_")) {
      await handleLeaveConfirm(interaction, customId, safeReply);
      return;
    } else if (interaction.isButton() && customId === "racha_leave_cancel") {
      await handleLeaveCancel(safeReply);
      return;
    } else if (interaction.isButton() && customId.startsWith("racha_leave_")) {
      await handleLeaveStart(interaction, customId, safeReply);
      return;
    } else if (customId === "racha_my_streaks") {
      await handleMyStreaks(interaction, client, safeReply);
      return;
    } else if (customId === "racha_create_new") {
      await handleCreateNew(safeReply);
    } else if (customId === "racha_top") {
      await handleTop(interaction, safeReply);
    } else if (customId === "racha_help") {
      await handleHelp(safeReply);
    }
  } catch (error: any) {
    console.error("❌ ERROR EN RACHA HANDLER:", error);
    await safeReply({
      content: `❌ **¡Mya! Algo salió mal:** \`\`\`${error.message}\`\`\``,
    });
  }
}
