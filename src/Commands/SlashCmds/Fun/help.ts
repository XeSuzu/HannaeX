import {
  ActionRowBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SlashCommand } from "../../../Interfaces/Command";
import { CATEGORIES, WELCOME_LINES } from "./helpUtils/config";
import {
  buildAIEmbed,
  buildCategoryEmbed,
  buildMainEmbed,
} from "./helpUtils/embeds";
import { buildComponents } from "./helpUtils/ui";

const command: SlashCommand = {
  category: "Information",
  cooldown: 3,
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("🌸 Muestra el menú de ayuda de Hoshiko."),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const memberPerms = interaction.member
      ?.permissions as Readonly<PermissionsBitField>;
    const isOwner = interaction.user.id === process.env.BOT_OWNER_ID;
    const isAdmin =
      memberPerms?.has(PermissionFlagsBits.Administrator) || false;
    const isMod =
      memberPerms?.has(PermissionFlagsBits.ManageMessages) || isAdmin;

    const categorized: Record<string, { name: string; desc: string }[]> = {};
    client.slashCommands.forEach((cmd: any) => {
      const cat = cmd.category || "Utility";
      const catConfig = CATEGORIES[cat];
      if (catConfig?.visibleTo === "Owner" && !isOwner) return;
      if (catConfig?.visibleTo === "Admin" && !isAdmin) return;
      if (catConfig?.visibleTo === "Mod" && !isMod) return;
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push({
        name: cmd.data.name,
        desc: cmd.data.description || "Sin descripción.",
      });
    });

    const welcomeLine =
      WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)];
    const components = buildComponents(client, categorized);
    const mainEmbed = buildMainEmbed(
      client,
      categorized,
      interaction.user,
      welcomeLine,
    );

    const msg = await interaction.editReply({
      embeds: [mainEmbed],
      components: components as any,
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000 * 2,
    });

    collector.on(
      "collect",
      async (i: StringSelectMenuInteraction | ButtonInteraction) => {
        collector.resetTimer();
        let embed: EmbedBuilder;

        if (
          i.customId === "help_home" ||
          (i.isStringSelectMenu() && i.values[0] === "main")
        ) {
          embed = buildMainEmbed(
            client,
            categorized,
            interaction.user,
            welcomeLine,
          );
        } else if (i.isStringSelectMenu()) {
          const selected = i.values[0];
          embed =
            selected === "AI_SPECIAL"
              ? buildAIEmbed(client, categorized["AI"] || [])
              : buildCategoryEmbed(
                  client,
                  selected,
                  categorized[selected] || [],
                );
        } else {
          return;
        }
        await i.update({ embeds: [embed], components: components as any });
      },
    );

    collector.on("end", () => {
      const disabledRows = components.map((row) => {
        const newRow = ActionRowBuilder.from(row as any);
        newRow.components.forEach((c: any) => {
          if (c.data?.style !== ButtonStyle.Link) c.setDisabled(true);
        });
        return newRow;
      });
      interaction
        .editReply({ components: disabledRows as any })
        .catch(() => {});
    });
  },
};

export default command;
