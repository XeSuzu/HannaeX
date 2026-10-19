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
import { getCommandDetail } from "./helpUtils/commandDetails";
import {
  buildAntiraidEmbed,
  buildCategoryEmbed,
  buildCommandDetailEmbed,
  buildMainEmbed,
  buildModerationEmbed,
} from "./helpUtils/embeds";
import { buildHelpComponents } from "./helpUtils/ui";

const PAGE_SIZE = 8;

const command: SlashCommand = {
  category: "Information",
  cooldown: 3,
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("🌸 Muestra el centro de documentación y manual de comandos de Hoshiko."),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const memberPerms = interaction.member
      ?.permissions as Readonly<PermissionsBitField>;
    const isOwner = interaction.user.id === process.env.BOT_OWNER_ID;
    const isAdmin =
      memberPerms?.has(PermissionFlagsBits.Administrator) || isOwner;
    const isMod =
      memberPerms?.has(PermissionFlagsBits.ManageMessages) ||
      memberPerms?.has(PermissionFlagsBits.ModerateMembers) ||
      isAdmin;

    const categorized: Record<string, { name: string; desc: string }[]> = {};
    const commandMap = new Map<string, any>();

    client.slashCommands.forEach((cmd: any) => {
      const cat = cmd.category || "Utility";
      const catConfig = CATEGORIES[cat];
      if (catConfig?.visibleTo === "Owner" && !isOwner) return;
      if (catConfig?.visibleTo === "Admin" && !isAdmin) return;
      if (catConfig?.visibleTo === "Mod" && !isMod) return;

      const name = cmd.data?.name || cmd.name;
      const desc = cmd.data?.description || cmd.description || "Sin descripción.";

      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push({ name, desc });
      commandMap.set(name, cmd);
    });

    const welcomeLine =
      WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)];

    let currentCategory: string = "main";
    let currentPage: number = 1;

    const initialComponents = buildHelpComponents(client, categorized, "main");
    const mainEmbed = buildMainEmbed(
      client,
      categorized,
      interaction.user,
      welcomeLine,
    );

    let lastComponents = initialComponents;

    const msg = await interaction.editReply({
      embeds: [mainEmbed],
      components: initialComponents as any,
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000 * 3, // 3 minutos de interacción activa
    });

    collector.on(
      "collect",
      async (i: StringSelectMenuInteraction | ButtonInteraction) => {
        try {
          collector.resetTimer();
          let embed: EmbedBuilder;

          // ================= CASO 1: BOTONES =================
          if (i.isButton()) {
            if (i.customId === "help_home") {
              currentCategory = "main";
              currentPage = 1;
              embed = buildMainEmbed(client, categorized, interaction.user, welcomeLine);
              lastComponents = buildHelpComponents(client, categorized, "main");
              await i.update({ embeds: [embed], components: lastComponents as any });
              return;
            }

            if (i.customId === "help_antiraid") {
              currentCategory = "ANTIRAID_SPECIAL";
              currentPage = 1;
              embed = buildAntiraidEmbed(client);
              lastComponents = buildHelpComponents(client, categorized, "ANTIRAID_SPECIAL");
              await i.update({ embeds: [embed], components: lastComponents as any });
              return;
            }

            if (i.customId.startsWith("help_page_")) {
              const [action, pageStr] = i.customId.replace("help_page_", "").split(":");
              const prevPage = parseInt(pageStr, 10) || 1;
              const cmds = categorized[currentCategory] || [];
              const totalPages = Math.max(1, Math.ceil(cmds.length / PAGE_SIZE));
              const targetPage = action === "next" ? prevPage + 1 : prevPage - 1;
              currentPage = Math.min(Math.max(1, targetPage), totalPages);

              embed = buildCategoryEmbed(client, currentCategory, cmds, currentPage, PAGE_SIZE);
              lastComponents = buildHelpComponents(client, categorized, currentCategory, cmds, currentPage, totalPages);
              await i.update({ embeds: [embed], components: lastComponents as any });
              return;
            }
          }

          // ================= CASO 2: MENÚ DE COMANDOS INDIVIDUALES =================
          if (i.isStringSelectMenu() && i.customId === "help_cmd_select") {
            const rawVal = i.values[0];
            const cmdName = rawVal.replace("cmd:", "");
            const slashCmd = commandMap.get(cmdName);
            const detail = getCommandDetail(cmdName, slashCmd);

            embed = buildCommandDetailEmbed(client, detail);
            const cmds = categorized[currentCategory] || [];
            const totalPages = Math.max(1, Math.ceil(cmds.length / PAGE_SIZE));
            lastComponents = buildHelpComponents(client, categorized, currentCategory, cmds, currentPage, totalPages);
            await i.update({ embeds: [embed], components: lastComponents as any });
            return;
          }

          // ================= CASO 3: MENÚ DE CATEGORÍAS =================
          if (i.isStringSelectMenu() && i.customId === "help_menu") {
            const selected = i.values[0];

            if (selected === "main") {
              currentCategory = "main";
              currentPage = 1;
              embed = buildMainEmbed(client, categorized, interaction.user, welcomeLine);
              lastComponents = buildHelpComponents(client, categorized, "main");
              await i.update({ embeds: [embed], components: lastComponents as any });
              return;
            }

            if (selected === "MODERATION_SPECIAL") {
              currentCategory = "MODERATION_SPECIAL";
              currentPage = 1;
              embed = buildModerationEmbed(client);
              lastComponents = buildHelpComponents(client, categorized, "MODERATION_SPECIAL");
              await i.update({ embeds: [embed], components: lastComponents as any });
              return;
            }

            if (selected === "ANTIRAID_SPECIAL") {
              currentCategory = "ANTIRAID_SPECIAL";
              currentPage = 1;
              embed = buildAntiraidEmbed(client);
              lastComponents = buildHelpComponents(client, categorized, "ANTIRAID_SPECIAL");
              await i.update({ embeds: [embed], components: lastComponents as any });
              return;
            }

            // Categoría normal
            currentCategory = selected;
            currentPage = 1;
            const cmds = categorized[selected] || [];
            const totalPages = Math.max(1, Math.ceil(cmds.length / PAGE_SIZE));

            embed = buildCategoryEmbed(client, selected, cmds, currentPage, PAGE_SIZE);
            lastComponents = buildHelpComponents(client, categorized, selected, cmds, currentPage, totalPages);
            await i.update({ embeds: [embed], components: lastComponents as any });
            return;
          }
        } catch (err) {
          console.error("[Help Interaction Error]", err);
          const fallbackPayload = {
            content: "🌸 No pude cargar esa sección en este momento. Por favor, pulsa **Inicio** o ejecuta `/help` de nuevo.",
            ephemeral: true,
          };
          if (i.deferred || i.replied) {
            await i.followUp(fallbackPayload).catch(() => {});
          } else {
            await i.reply(fallbackPayload).catch(() => {});
          }
        }
      },
    );

    collector.on("end", () => {
      const disabledRows = lastComponents.map((row) => {
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
