import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  PermissionFlagsBits,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

// ==========================================================
// 📝 CONFIGURACIÓN DE ACCESO
// ==========================================================
// Pon aquí TU ID y las IDs de tus testers.
const ALLOWED_USERS = [
  "798965856204750898", // Tú (Owner)
  "1062956852897390612", // Tester 1
  "1032167572713525299",
  "824163470416150528",
  "824163470416150528", // Tester 2
];

// ==========================================================
// 🧪 MISIONES
// ==========================================================
const TEST_SCENARIOS: Record<
  string,
  { emoji: string; title: string; tasks: string[] }
> = {
  social: {
    emoji: "📸",
    title: "Redes Sociales",
    tasks: [
      "Texto largo en Twitter",
      "Instagram sin foto",
      "Menciones rotas",
      "Emojis de otros servers",
    ],
  },
  economy: {
    emoji: "💰",
    title: "Economía",
    tasks: [
      "Transferir negativos (-500)",
      "Comprar sin dinero",
      "Cheat de dinero infinito",
      "Auto-pago",
    ],
  },
  security: {
    emoji: "🛡️",
    title: "Seguridad",
    tasks: ["Anti-Alt bypass", "Botones viejos", "Banear al dueño"],
  },
};

const command: SlashCommand = {
  // 🔴 IMPORTANTE: Ponemos 'Utility' o 'Public' para que el sistema NO lo bloquee automáticamente.
  category: "Utility",

  data: new SlashCommandBuilder()
    .setName("test-guide")
    .setDescription("🧪 [TESTERS] Manual de misiones.")
    // Permitimos que cualquiera vea el comando, pero lo filtramos dentro
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // 🔒 VERIFICACIÓN POR ID DIRECTA (Infalible)
    if (!ALLOWED_USERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: `⛔ **Acceso Denegado:** Tu ID (\`${interaction.user.id}\`) no está en la lista de Testers autorizados.`,
        ephemeral: true,
      });
    }

    // ❌ ELIMINADO: await interaction.deferReply({ ephemeral: true });

    // --- MENÚ ---
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("test_mission_select")
      .setPlaceholder("📂 Elige una categoría para testear...");

    for (const [key, data] of Object.entries(TEST_SCENARIOS)) {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(data.title)
          .setValue(key)
          .setEmoji(data.emoji),
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🧪 MODO TESTER ACTIVADO")
      .setDescription(
        `Hola **${interaction.user.username}**. Tienes acceso autorizado.\nSelecciona una categoría abajo para ver qué debes intentar romper.`,
      )
      .setColor("#00FF00");

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    const msg = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    // --- COLLECTOR ---
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000 * 10,
    });

    collector.on("collect", async (i) => {
      const scenario = TEST_SCENARIOS[i.values[0]];
      const taskEmbed = new EmbedBuilder()
        .setTitle(`${scenario.emoji} ${scenario.title}`)
        .setColor("#FF0000")
        .setDescription(scenario.tasks.map((t) => `🔹 ${t}`).join("\n\n"))
        .setFooter({ text: "Reporta bugs en el canal correspondiente." });

      await i.update({ embeds: [taskEmbed], components: [row] });
    });
  },
};
export default command;