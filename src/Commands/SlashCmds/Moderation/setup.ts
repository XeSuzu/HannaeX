import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { IAConfigManager } from "../../../Database/IAConfigManager";
import { PremiumManager } from "../../../Database/PremiumManager";
import { SettingsManager } from "../../../Database/SettingsManager";
import { SlashCommand } from "../../../Interfaces/Command";
import { handleSnipeToggle } from "./setupUtils/snipe";
import { generateSetupUI, SetupMenus } from "./setupUtils/ui";

const command: SlashCommand = {
  category: "Moderation",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("⚙️ Configura la seguridad y la personalidad de Hoshiko.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const guildId = interaction.guild.id;

    const refreshUI = async (menu = null) => {
      const ui = await generateSetupUI(
        guildId,
        interaction.channelId,
        interaction.client.user,
        interaction.user,
        menu,
      );
      await interaction.editReply(ui);
    };

    const ui = await generateSetupUI(
      guildId,
      interaction.channelId,
      interaction.client.user,
      interaction.user,
    );
    const message = await interaction.editReply(ui);

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300_000,
    });

    collector.on(
      "collect",
      async (i: ButtonInteraction | StringSelectMenuInteraction) => {
        try {
          await i.deferUpdate();
        } catch {
          return;
        }
        const isPremium = await PremiumManager.isPremium(guildId);

        if (i.isButton()) {
          if (i.customId === "setup_close") return collector.stop();
          await refreshUI();
          return;
        }

        if (i.isStringSelectMenu()) {
          const choice = i.values[0];

          if (i.customId === "setup_main_menu") {
            if (choice === "menu_behavior")
              return refreshUI(SetupMenus.behavior() as any);
            if (choice === "menu_security")
              return refreshUI(SetupMenus.security() as any);
            if (choice === "menu_identity")
              return refreshUI(SetupMenus.identity() as any);
            if (choice === "ai_toggle_spontaneous") {
              const result = await IAConfigManager.toggleSpontaneousChannel(
                guildId,
                interaction.channelId,
              );
              if (!result.success)
                await i.followUp({
                  content: `❌ ${result.message}`,
                  flags: MessageFlags.Ephemeral,
                });
              else await refreshUI();
              return;
            }
          }

          if (i.customId === "submenu_behavior_select") {
            if (choice !== "normal" && !isPremium)
              return i.followUp({
                content: "🔒 **Modo Premium:** Requiere suscripción.",
                flags: MessageFlags.Ephemeral,
              }) as any;
            const safetyLevel =
              choice === "pesado"
                ? "medium"
                : choice === "agresivo"
                  ? "low"
                  : "high";
            await IAConfigManager.updateConfig(guildId, {
              "aiSystem.behavior": choice,
              aiSafety: safetyLevel,
            });
            return refreshUI();
          }

          if (i.customId === "submenu_security_select") {
            if (choice === "go_setup_logs")
              return i.followUp({
                content:
                  "📋 Usa `/setup-logs` para configurar todos los canales.",
                flags: MessageFlags.Ephemeral,
              }) as any;
            if (choice === "toggle_snipe")
              return handleSnipeToggle(interaction, i, guildId, refreshUI);

            const moduleName = choice.split("_")[1];
            const set = await SettingsManager.getSettings(guildId);
            if (set?.securityModules) {
              const current =
                set.securityModules[
                  moduleName as keyof typeof set.securityModules
                ] || false;
              await SettingsManager.updateSettings(guildId, {
                [`securityModules.${moduleName}`]: !current,
              });
            }
            return refreshUI();
          }

          if (i.customId === "submenu_identity_select") {
            if (["yandere", "gymbro"].includes(choice) && !isPremium)
              return i.followUp({
                content: "🔒 **Identidad Premium:** Requiere suscripción.",
                flags: MessageFlags.Ephemeral,
              }) as any;
            await IAConfigManager.updateConfig(guildId, {
              "aiSystem.mode": choice,
            });
            return refreshUI();
          }
        }
      },
    );

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch {}
    });
  },
};

export default command;
