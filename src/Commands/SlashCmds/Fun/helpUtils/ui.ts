import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { CATEGORIES, EMOJI, SUPPORT_SERVER, getInviteLink } from "./config";

export function buildComponents(
  client: HoshikoClient,
  categorized: Record<string, { name: string; desc: string }[]>,
) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder(`${EMOJI.paw} Elige una categoría~`)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Inicio")
        .setDescription("Volver al menú principal")
        .setValue("main")
        .setEmoji(EMOJI.home),
    );

  for (const [cat] of Object.entries(categorized)) {
    if (cat === "AI") continue;
    const info = CATEGORIES[cat] || { emoji: "📁", desc: "Varios" };
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(cat)
        .setDescription(info.desc.substring(0, 100))
        .setValue(cat)
        .setEmoji(info.emoji),
    );
  }

  if (categorized["AI"]) {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Hoshiko AI")
        .setDescription("habla conmigo~ nyaa 🌙")
        .setValue("AI_SPECIAL")
        .setEmoji(EMOJI.ai),
    );
  }

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("help_home")
      .setLabel("Inicio")
      .setStyle(ButtonStyle.Success)
      .setEmoji(EMOJI.home),
    new ButtonBuilder()
      .setLabel("Invitar")
      .setStyle(ButtonStyle.Link)
      .setURL(getInviteLink(client.user?.id))
      .setEmoji(EMOJI.invite),
    new ButtonBuilder()
      .setLabel("Soporte")
      .setStyle(ButtonStyle.Link)
      .setURL(SUPPORT_SERVER)
      .setEmoji(EMOJI.support),
  );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    buttons,
  ];
}
