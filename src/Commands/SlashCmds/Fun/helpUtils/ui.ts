import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { buildSupportButton } from "../../../../Utils/inviteUtils";
import { CATEGORIES, EMOJI, getInviteLink, SUPPORT_SERVER } from "./config";

export function buildHelpComponents(
  client: HoshikoClient,
  categorized: Record<string, { name: string; desc: string }[]>,
  currentCategory?: string,
  currentCommands?: { name: string; desc: string }[],
  page: number = 1,
  totalPages: number = 1,
): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  // ================= 1. MENÚ DE CATEGORÍAS =================
  const categoryMenu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder(`${EMOJI.paw} Elige una categoría o módulo especial`)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Inicio")
        .setDescription("Volver al menú principal de ayuda")
        .setValue("main")
        .setEmoji(EMOJI.home)
        .setDefault(currentCategory === "main"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Centro de Moderación")
        .setDescription("Flujo disciplinario, jerarquía y logs")
        .setValue("MODERATION_SPECIAL")
        .setEmoji(EMOJI.moderation)
        .setDefault(currentCategory === "MODERATION_SPECIAL"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Defensa Anti-Raid [BETA]")
        .setDescription("Join-Flood, Anti-Nuke y estado beta")
        .setValue("ANTIRAID_SPECIAL")
        .setEmoji("🚨")
        .setDefault(currentCategory === "ANTIRAID_SPECIAL"),
    );

  for (const [cat, cmds] of Object.entries(categorized)) {
    if (["AI", "IA"].includes(cat)) continue;
    const info = CATEGORIES[cat] || { emoji: "📁", desc: "Comandos del sistema" };
    categoryMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${cat} (${cmds.length})`)
        .setDescription(info.desc.substring(0, 100))
        .setValue(cat)
        .setEmoji(info.emoji)
        .setDefault(currentCategory === cat),
    );
  }

  rows.push(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu),
  );

  // ================= 2. MENÚ DE COMANDOS (Si hay una categoría seleccionada) =================
  if (
    currentCategory &&
    !["main", "MODERATION_SPECIAL", "ANTIRAID_SPECIAL"].includes(currentCategory) &&
    currentCommands &&
    currentCommands.length > 0
  ) {
    const cmdMenu = new StringSelectMenuBuilder()
      .setCustomId("help_cmd_select")
      .setPlaceholder(`🔍 Ver detalle de un comando de ${currentCategory}...`);

    // Discord permite un máximo de 25 opciones por select menu
    const sliceCommands = currentCommands.slice(0, 25);
    for (const cmd of sliceCommands) {
      const shortDesc =
        cmd.desc.length > 95 ? cmd.desc.substring(0, 92) + "..." : cmd.desc;
      cmdMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`/${cmd.name}`)
          .setDescription(shortDesc || "Sin descripción")
          .setValue(`cmd:${cmd.name}`)
          .setEmoji(EMOJI.cmd),
      );
    }

    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cmdMenu),
    );
  }

  // ================= 3. BOTONERA (Límite estricto de Discord: Máximo 5 botones por fila) =================
  const homeBtn = new ButtonBuilder()
    .setCustomId("help_home")
    .setLabel("Inicio")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(EMOJI.home);

  const antiRaidBtn = new ButtonBuilder()
    .setCustomId("help_antiraid")
    .setLabel("Anti-Raid [BETA]")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("🚨");

  const inviteBtn = new ButtonBuilder()
    .setLabel("Invitar")
    .setStyle(ButtonStyle.Link)
    .setURL(getInviteLink(client.user?.id))
    .setEmoji(EMOJI.invite);

  const supportBtn = buildSupportButton(process.env.SUPPORT_SERVER_INVITE || SUPPORT_SERVER);

  if (totalPages > 1) {
    // Si hay paginación, separamos en 2 filas de botones para no exceder 5 por fila
    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      homeBtn,
      antiRaidBtn,
      new ButtonBuilder()
        .setCustomId(`help_page_prev:${page}`)
        .setLabel("◀")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId(`help_page_next:${page}`)
        .setLabel("▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages),
    );

    const linksRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      inviteBtn,
      supportBtn,
    );

    rows.push(navRow, linksRow);
  } else {
    // Si no hay paginación, caben exactamente 4 botones en una sola fila (<= 5)
    const singleButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      homeBtn,
      antiRaidBtn,
      inviteBtn,
      supportBtn,
    );

    rows.push(singleButtonRow);
  }

  return rows;
}
