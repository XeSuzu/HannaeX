import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { safeEmoji, truncate } from "../../../../Utils/discordSafety";
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

  // ================= 1. MENÚ DE CATEGORÍAS (Máx 25 opciones en Discord) =================
  const categoryMenu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder(truncate(`${EMOJI.paw} Elige una categoría o módulo especial`, 150));

  const baseOptions: StringSelectMenuOptionBuilder[] = [
    new StringSelectMenuOptionBuilder()
      .setLabel("Inicio")
      .setDescription("Volver al menú principal de ayuda")
      .setValue("main")
      .setDefault(currentCategory === "main"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Centro de Moderación")
      .setDescription("Flujo disciplinario, jerarquía y logs")
      .setValue("MODERATION_SPECIAL")
      .setDefault(currentCategory === "MODERATION_SPECIAL"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Defensa Anti-Raid [BETA]")
      .setDescription("Join-Flood, Anti-Nuke y estado beta")
      .setValue("ANTIRAID_SPECIAL")
      .setDefault(currentCategory === "ANTIRAID_SPECIAL"),
  ];

  const homeEmoji = safeEmoji(EMOJI.home);
  if (homeEmoji) baseOptions[0].setEmoji(homeEmoji);

  const modEmoji = safeEmoji(EMOJI.moderation);
  if (modEmoji) baseOptions[1].setEmoji(modEmoji);

  const raidEmoji = safeEmoji("🚨");
  if (raidEmoji) baseOptions[2].setEmoji(raidEmoji);

  const dynamicOptions: StringSelectMenuOptionBuilder[] = [];
  for (const [cat, cmds] of Object.entries(categorized)) {
    if (["AI", "IA"].includes(cat)) continue;
    const info = CATEGORIES[cat] || { emoji: "📁", desc: "Comandos del sistema" };
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(truncate(`${cat} (${cmds.length})`, 100))
      .setDescription(truncate(info.desc, 100))
      .setValue(cat)
      .setDefault(currentCategory === cat);

    const catEmoji = safeEmoji(info.emoji);
    if (catEmoji) opt.setEmoji(catEmoji);

    dynamicOptions.push(opt);
  }

  // Discord permite máximo 25 opciones por StringSelectMenu
  const totalCategoryOptions = [...baseOptions, ...dynamicOptions].slice(0, 25);
  categoryMenu.addOptions(totalCategoryOptions);

  rows.push(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu),
  );

  // ================= 2. MENÚ DE COMANDOS (Si hay una categoría activa) =================
  if (
    currentCategory &&
    !["main", "MODERATION_SPECIAL", "ANTIRAID_SPECIAL"].includes(currentCategory) &&
    currentCommands &&
    currentCommands.length > 0
  ) {
    const cmdMenu = new StringSelectMenuBuilder()
      .setCustomId("help_cmd_select")
      .setPlaceholder(
        truncate(`🔍 Ver detalle de un comando de ${currentCategory}...`, 150),
      );

    // Si la categoría tiene paginación, mostramos los comandos de la página actual
    const pageSize = 8;
    const startIndex = (page - 1) * pageSize;
    const visibleCommands =
      totalPages > 1
        ? currentCommands.slice(startIndex, startIndex + pageSize)
        : currentCommands.slice(0, 25);

    for (const cmd of visibleCommands) {
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(truncate(`/${cmd.name}`, 100))
        .setDescription(truncate(cmd.desc || "Sin descripción", 100))
        .setValue(`cmd:${cmd.name}`);

      const cmdEmoji = safeEmoji(EMOJI.cmd || "🔹");
      if (cmdEmoji) opt.setEmoji(cmdEmoji);

      cmdMenu.addOptions(opt);
    }

    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cmdMenu),
    );
  }

  // ================= 3. BOTONERA (Límite estricto de Discord: Máximo 5 botones por fila) =================
  const homeBtn = new ButtonBuilder()
    .setCustomId("help_home")
    .setLabel("Inicio")
    .setStyle(ButtonStyle.Secondary);
  const homeBtnEmoji = safeEmoji(EMOJI.home);
  if (homeBtnEmoji) homeBtn.setEmoji(homeBtnEmoji);

  const antiRaidBtn = new ButtonBuilder()
    .setCustomId("help_antiraid")
    .setLabel("Anti-Raid [BETA]")
    .setStyle(ButtonStyle.Danger);
  const antiRaidBtnEmoji = safeEmoji("🚨");
  if (antiRaidBtnEmoji) antiRaidBtn.setEmoji(antiRaidBtnEmoji);

  const inviteBtn = new ButtonBuilder()
    .setLabel("Invitar")
    .setStyle(ButtonStyle.Link)
    .setURL(getInviteLink(client.user?.id));
  const inviteBtnEmoji = safeEmoji(EMOJI.invite);
  if (inviteBtnEmoji) inviteBtn.setEmoji(inviteBtnEmoji);

  const supportBtn = buildSupportButton(process.env.SUPPORT_SERVER_INVITE || SUPPORT_SERVER);

  if (totalPages > 1) {
    // Si hay paginación, separamos en 2 filas para que ninguna supere 5 botones
    const prevBtn = new ButtonBuilder()
      .setCustomId(`help_page_prev:${page}`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page <= 1);

    const nextBtn = new ButtonBuilder()
      .setCustomId(`help_page_next:${page}`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages);

    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      homeBtn,
      antiRaidBtn,
      prevBtn,
      nextBtn,
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
