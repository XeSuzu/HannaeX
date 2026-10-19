import {
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { IAConfigManager } from "../../../Database/ai/IAConfigManager";
import { PremiumManager } from "../../../Database/guild/PremiumManager";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { liftServerLockdown } from "../../../Features/automod/aiModeration";
import { SlashCommand } from "../../../Interfaces/Command";
import { handleSnipeChannelSelect } from "./setupUtils/snipe";
import { generateSetupUI, SetupView } from "./setupUtils/ui";

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
    let currentView: SetupView = "main";

    const refreshUI = async (view: SetupView = currentView) => {
      currentView = view;
      const ui = await generateSetupUI(
        guildId,
        interaction.channelId,
        interaction.client.user,
        interaction.user,
        currentView,
      );
      await interaction.editReply(ui);
    };

    const initialUI = await generateSetupUI(
      guildId,
      interaction.channelId,
      interaction.client.user,
      interaction.user,
      "main",
    );
    const message = await interaction.editReply(initialUI);

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300_000,
    });

    collector.on(
      "collect",
      async (i: ButtonInteraction | ChannelSelectMenuInteraction) => {
        try {
          await i.deferUpdate();
        } catch {
          return;
        }
        const isPremium = await PremiumManager.isPremium(guildId);

        // ─── CANAL SELECCIONADO (SNIPE / MODLOG RÁPIDO) ──────────────────
        if (i.isChannelSelectMenu()) {
          if (i.customId === "snipe_channel_select") {
            const activated = await handleSnipeChannelSelect(i, guildId);
            if (activated) await refreshUI("security");
            return;
          }

          if (i.customId === "quick_modlog_select") {
            const selectedChannelId = i.values[0];
            await SettingsManager.updateSettings(guildId, {
              "logChannels.modlog": selectedChannelId,
            } as any);
            await refreshUI("security");
            return;
          }
          return;
        }

        if (!i.isButton()) return;
        const id = i.customId;

        if (id === "setup_close") {
          collector.stop();
          return;
        }

        // ─── NAVEGACIÓN ENTRE VISTAS ─────────────────────────────────────
        if (id.startsWith("nav_")) {
          const targetView = id.replace("nav_", "") as SetupView;
          await refreshUI(targetView);
          return;
        }

        // ─── ACCIÓN DIRECTA: CHAT ESPONTÁNEO ─────────────────────────────
        if (id === "act_spontaneous") {
          const result = await IAConfigManager.toggleSpontaneousChannel(
            guildId,
            interaction.channelId,
          );
          if (!result.success) {
            await i.followUp({
              content: `❌ ${result.message}`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await refreshUI("main");
          }
          return;
        }

        if (id === "act_unlockdown") {
          const restored = await liftServerLockdown(
            interaction.guild!,
            interaction.user.tag,
          );
          await i.followUp({
            content: restored
              ? "🔓 **Lockdown levantado:** `@everyone` puede volver a escribir."
              : "ℹ️ No había un lockdown activo registrado.",
            flags: MessageFlags.Ephemeral,
          });
          await refreshUI("security");
          return;
        }

        // ─── SELECCIÓN: PERFIL DE SEGURIDAD (NIVEL 1 AL 4) ───────────────
        if (id.startsWith("seclvl_")) {
          const lvl = Number(id.replace("seclvl_", ""));
          if ([1, 2, 3, 4].includes(lvl)) {
            await SettingsManager.updateSettings(guildId, {
              "securityModules.securityLevel": lvl,
            } as any);
          }
          await refreshUI("security");
          return;
        }

        // ─── SELECCIÓN: COMPORTAMIENTO ───────────────────────────────────
        if (id.startsWith("beh_")) {
          const choice = id.replace("beh_", "");
          if (choice !== "normal" && !isPremium) {
            await i.followUp({
              content: "🔒 **Modo Premium:** Requiere suscripción activa.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
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
          await refreshUI("behavior");
          return;
        }

        // ─── SELECCIÓN: IDENTIDAD ────────────────────────────────────────
        if (id.startsWith("id_")) {
          const choice = id.replace("id_", "");
          if (["yandere", "gymbro"].includes(choice) && !isPremium) {
            await i.followUp({
              content: "🔒 **Identidad Premium:** Requiere suscripción activa.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await IAConfigManager.updateConfig(guildId, {
            "aiSystem.mode": choice,
          });
          await refreshUI("identity");
          return;
        }

        // ─── INTERRUPTORES: SEGURIDAD ────────────────────────────────────
        if (id.startsWith("sec_")) {
          const moduleName = id.replace("sec_", "");

          const set = await SettingsManager.getSettings(guildId);
          const current =
            set?.securityModules?.[
              moduleName as keyof typeof set.securityModules
            ] || false;

          if (moduleName === "snipe" && !current) {
            await refreshUI("snipe_confirm");
            return;
          }

          await SettingsManager.updateSettings(guildId, {
            [`securityModules.${moduleName}`]: !current,
          });
          await refreshUI("security");
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

