import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { QuotaManager } from "../../../Core/AI/Quota/QuotaManager";
import { PersonalMemoryService } from "../../../Core/AI/Memory/PersonalMemoryService";
import { AiExemptionService } from "../../../Core/AI/Quota/AiExemptionService";
import { AiPanelView, type AiPanelTab } from "./aiPanelView";

const command: SlashCommand = {
  category: "AI",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Panel interactivo personal y utilidades de Inteligencia Artificial")
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Abre tu panel interactivo personal (cuotas, estilo, memoria)"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("usage")
        .setDescription("Consulta tu saldo de cuotas diario para conversación e investigación"),
    )
    .addSubcommandGroup((grp) =>
      grp
        .setName("tester")
        .setDescription("Gestión de testers de IA para este servidor de pruebas")
        .addSubcommand((sub) =>
          sub
            .setName("invite")
            .setDescription("Autoriza a un usuario como tester con cuotas ilimitadas en este servidor")
            .addUserOption((opt) =>
              opt.setName("usuario").setDescription("Usuario a invitar").setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Retira la condición de tester a un usuario en este servidor")
            .addUserOption((opt) =>
              opt.setName("usuario").setDescription("Usuario a retirar").setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("list")
            .setDescription("Lista los testers de IA autorizados en este servidor"),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    let subcommand: string | null = null;
    let subGroup: string | null = null;
    try {
      if (typeof interaction.options?.getSubcommandGroup === "function") {
        subGroup = interaction.options.getSubcommandGroup(false);
      }
      if (typeof interaction.options?.getSubcommand === "function") {
        subcommand = interaction.options.getSubcommand(false);
      }
    } catch {}

    const userId = interaction.user?.id || "anonymous";
    const username = interaction.user?.username || "Usuario";
    const userAvatar = typeof interaction.user?.displayAvatarURL === "function"
      ? interaction.user.displayAvatarURL()
      : null;
    const guildId = interaction.guild?.id || null;

    // ─── /ai tester <invite|remove|list> ─────────────────────────────────────
    if (subGroup === "tester") {
      if (!interaction.guild) {
        await interaction.reply({
          content: "❌ La gestión de testers solo está disponible dentro de un servidor.",
          ephemeral: true,
        });
        return;
      }

      const isDev = AiExemptionService.isDeveloper(userId);
      const isOwner = interaction.guild.ownerId === userId;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;

      if (!isDev && !isOwner && !isAdmin) {
        await interaction.reply({
          content: "⛔ Solo los administradores del servidor o el desarrollador pueden gestionar testers de IA.",
          ephemeral: true,
        });
        return;
      }

      if (subcommand === "invite") {
        const target = interaction.options.getUser("usuario", true);
        const res = await AiExemptionService.addTester(interaction.guild.id, target.id, userId);
        await interaction.reply({
          content: res.message,
          ephemeral: true,
        });
        return;
      }

      if (subcommand === "remove") {
        const target = interaction.options.getUser("usuario", true);
        const res = await AiExemptionService.removeTester(interaction.guild.id, target.id);
        await interaction.reply({
          content: res.message,
          ephemeral: true,
        });
        return;
      }

      if (subcommand === "list") {
        const testers = await AiExemptionService.listTesters(interaction.guild.id);
        if (testers.length === 0) {
          await interaction.reply({
            content: "ℹ️ No hay testers de IA registrados actualmente en este servidor.",
            ephemeral: true,
          });
          return;
        }

        const listStr = testers.map((t, idx) => `• <@${t.userId}>`).join("\n");
        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("🧪 Testers de IA Autorizados")
          .setDescription(
            `Los siguientes usuarios disponen de cuotas individuales ilimitadas **exclusivamente en este servidor**:\n\n${listStr}`,
          )
          .setFooter({ text: "Fuera de este servidor, los testers utilizan las cuotas normales ♡" });

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
        return;
      }
    }

    // ─── /ai usage (Retrocompatibilidad directa) ─────────────────────────────
    if (subcommand === "usage") {
      const status = await QuotaManager.getStatus(userId, guildId);

      const renewalDate = new Date(status.conversation.nextRenewalTime);
      const renewalEcuadorStr = renewalDate.toLocaleTimeString("es-EC", {
        timeZone: "America/Guayaquil",
        hour: "2-digit",
        minute: "2-digit",
      });
      const renewalDayStr = renewalDate.toLocaleDateString("es-EC", {
        timeZone: "America/Guayaquil",
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      const hoursRem = Math.floor(status.conversation.timeUntilRenewalMs / (1000 * 60 * 60));
      const minsRem = Math.floor((status.conversation.timeUntilRenewalMs % (1000 * 60 * 60)) / (1000 * 60));

      const isExempt = status.conversation.maxCapacity === Infinity;

      const timeText = isExempt
        ? "Exención activa (Sin límite individual de cuota)"
        : status.conversation.timeUntilRenewalMs > 0
          ? `${hoursRem}h ${minsRem}m (${renewalDayStr} a las ${renewalEcuadorStr} hora Ecuador)`
          : "Ciclo listo para reposición en tu próxima interacción";

      const convVal = isExempt
        ? "• **Saldo disponible:** `∞ Ilimitado` *(Exención individual activa)*\n• **Consumido en el ciclo:** `0`"
        : `• **Saldo disponible:** \`${status.conversation.balance} / ${status.conversation.maxCapacity}\`\n• **Consumido en el ciclo:** \`${status.conversation.consumedInCycle}\``;

      const resVal = isExempt
        ? "• **Saldo disponible:** `∞ Ilimitado` *(Exención individual activa)*\n• **Consumido en el ciclo:** `0`"
        : `• **Saldo disponible:** \`${status.research.balance} / ${status.research.maxCapacity}\`\n• **Consumido en el ciclo:** \`${status.research.consumedInCycle}\``;

      const embed = new EmbedBuilder()
        .setColor(0xffb7c5)
        .setTitle("📊 Consumo y Cuotas de Hoshiko AI")
        .setDescription(`Hola ${username}, aquí tienes el estado de tus depósitos para el ciclo actual de 24 horas:`)
        .addFields(
          {
            name: "💬 Conversación Diaria",
            value: convVal,
            inline: true,
          },
          {
            name: "🔍 Búsqueda e Investigación",
            value: resVal,
            inline: true,
          },
          {
            name: "⏳ Próxima Renovación Parcial",
            value: `• **Tiempo estimado:** ${timeText}\n*(Al cumplirse las 24 horas se repondrá exactamente lo consumido)*`,
            inline: false,
          },
          {
            name: "⭐ Beneficios Premium",
            value: isExempt
              ? "• **Estado:** `Exención Autorizada` *(Developer / Tester en este servidor)*"
              : "• **Estado:** `Próximamente` *(planes y cuotas ampliadas en desarrollo)*",
            inline: false,
          },
        )
        .setFooter({ text: "Hoshiko AI • Zona Horaria: Ecuador (UTC-5) ♡" });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
      return;
    }

    // ─── /ai panel (PANEL INTERACTIVO COMPLETO) ──────────────────────────────
    let currentTab: AiPanelTab = "main";
    const initialUI = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);

    const replyMessage = await interaction.reply({
      ...initialUI,
      ephemeral: true,
      fetchReply: true,
    });

    if (!replyMessage || !("createMessageComponentCollector" in replyMessage)) {
      return;
    }

    const collector = replyMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 300000, // 5 minutos de interacción activa
    });

    collector.on("collect", async (i) => {
      try {
        const id = i.customId;

        // Pestañas de navegación
        if (id === "ai_tab_main") {
          currentTab = "main";
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        if (id === "ai_tab_style") {
          currentTab = "style";
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        if (id === "ai_tab_memories") {
          currentTab = "memories";
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        if (id === "ai_tab_del_select") {
          currentTab = "delete_select";
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        if (id === "ai_btn_refresh") {
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        if (id === "ai_btn_close") {
          collector.stop("closed_by_user");
          await i.update({
            content: "🌸 Panel cerrado. Puedes volver a abrirlo en cualquier momento con `/ai` ♡",
            embeds: [],
            components: [],
          });
          return;
        }

        // Toggle de imágenes ilustrativas
        if (id === "ai_toggle_images") {
          const prefs = await PersonalMemoryService.getPreferences(userId);
          await PersonalMemoryService.updatePreferences(userId, {
            allowVisuals: !prefs.allowVisuals,
          });
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        // Toggle de memoria soberana
        if (id === "ai_toggle_memory") {
          const memory = await PersonalMemoryService.getMemory(userId);
          const currentEnabled = memory?.enabled ?? true;
          await PersonalMemoryService.toggleMemory(userId, !currentEnabled);
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        // Cambio de estilo (Personal Mode)
        if (id.startsWith("ai_set_")) {
          const style = id.replace("ai_set_", "") as "concise" | "balanced" | "detailed";
          await PersonalMemoryService.updatePreferences(userId, { style });
          const ui = await AiPanelView.generate(userId, username, userAvatar, "style", guildId);
          await i.update(ui);
          return;
        }

        // Borrado desde el Select Menu
        if (i.isStringSelectMenu() && id === "ai_select_del_fact") {
          const selectedValue = i.values[0];
          if (selectedValue === "del_all_facts") {
            await PersonalMemoryService.clearAllFacts(userId);
          } else if (selectedValue.startsWith("del_fact_")) {
            const factId = selectedValue.replace("del_fact_", "");
            await PersonalMemoryService.deleteFact(userId, factId);
          }
          currentTab = "memories";
          const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);
          await i.update(ui);
          return;
        }

        // Añadir recuerdo mediante Modal
        if (id === "ai_modal_add_memory") {
          const modal = new ModalBuilder()
            .setCustomId(`modal_add_mem_${Date.now()}`)
            .setTitle("➕ Enseñar un recuerdo a Hoshiko");

          const factInput = new TextInputBuilder()
            .setCustomId("fact_input")
            .setLabel("¿Qué te gustaría que Hoshiko recuerde?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Ej: Mi editor preferido es VS Code / Me gusta el café sin azúcar")
            .setMinLength(5)
            .setMaxLength(140)
            .setRequired(true);

          const modalRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(factInput);
          modal.addComponents(modalRow);

          await i.showModal(modal);

          const modalSubmit = await i
            .awaitModalSubmit({
              time: 120000,
              filter: (m) => m.user.id === userId,
            })
            .catch(() => null);

          if (modalSubmit) {
            const rawFact = modalSubmit.fields.getTextInputValue("fact_input");
            await modalSubmit.deferUpdate().catch(() => null);
            const result = await PersonalMemoryService.addExplicitFact(userId, rawFact);
            currentTab = "memories";
            const ui = await AiPanelView.generate(userId, username, userAvatar, currentTab, guildId);

            if (result.success) {
              await interaction.editReply({
                content: `✨ ${result.message}`,
                ...ui,
              });
            } else {
              await interaction.editReply({
                content: `⚠️ ${result.message}`,
                ...ui,
              });
            }
          }
          return;
        }
      } catch (err: any) {
        console.error("[AI Panel] Error procesando interacción:", err);
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (reason !== "closed_by_user") {
        try {
          await interaction.editReply({ components: [] });
        } catch {}
      }
    });
  },
};

export default command;
