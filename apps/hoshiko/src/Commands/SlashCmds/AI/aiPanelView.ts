import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { QuotaManager } from "../../../Core/AI/Quota/QuotaManager";
import { PersonalMemoryService } from "../../../Core/AI/Memory/PersonalMemoryService";

export type AiPanelTab = "main" | "style" | "memories" | "delete_select";

export class AiPanelView {
  private static readonly COLOR_HOSHIKO = 0xffb7c5;

  private static renderProgressBar(current: number, max: number, length: number = 8): string {
    if (max === Infinity || current === Infinity) {
      return `[\`████████\`] ∞ Ilimitado`;
    }
    const safeMax = Math.max(1, max);
    const safeCurrent = Math.max(0, Math.min(current, safeMax));
    const filled = Math.round((safeCurrent / safeMax) * length);
    const empty = Math.max(0, length - filled);
    return `[\`${"█".repeat(filled)}${"░".repeat(empty)}\`] ${current}/${max}`;
  }

  static async generate(
    userId: string,
    username: string,
    userAvatar?: string | null,
    tab: AiPanelTab = "main",
    guildId?: string | null,
  ): Promise<{ embeds: EmbedBuilder[]; components: ActionRowBuilder<any>[] }> {
    const [status, prefs, memory] = await Promise.all([
      QuotaManager.getStatus(userId, guildId),
      PersonalMemoryService.getPreferences(userId),
      PersonalMemoryService.getMemory(userId),
    ]);

    const renewalDate = new Date(status.conversation.nextRenewalTime);
    const renewalHourEcuador = renewalDate.toLocaleTimeString("es-EC", {
      timeZone: "America/Guayaquil",
      hour: "2-digit",
      minute: "2-digit",
    });
    const renewalDayEcuador = renewalDate.toLocaleDateString("es-EC", {
      timeZone: "America/Guayaquil",
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const hoursRem = Math.floor(status.conversation.timeUntilRenewalMs / (1000 * 60 * 60));
    const minsRem = Math.floor((status.conversation.timeUntilRenewalMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeText =
      status.conversation.timeUntilRenewalMs > 0
        ? `${hoursRem}h ${minsRem}m (${renewalDayEcuador} a las ${renewalHourEcuador} hora Ecuador)`
        : "Listo para renovación";

    const styleLabel =
      prefs.style === "concise"
        ? "⚡ Conciso (1-2 oraciones)"
        : prefs.style === "detailed"
          ? "📖 Detallado (a fondo)"
          : "🌸 Balanceado (natural)";

    const visualsLabel = prefs.allowVisuals ? "✅ Activadas" : "🚫 Desactivadas";
    const memoryEnabled = memory?.enabled ?? true;
    const factsCount = memory?.facts?.length || 0;

    // ─── TAB: MAIN (PANEL PRINCIPAL) ──────────────────────────────────────────
    if (tab === "main") {
      const convBar = this.renderProgressBar(status.conversation.balance, status.conversation.maxCapacity);
      const resBar = this.renderProgressBar(status.research.balance, status.research.maxCapacity);

      const embed = new EmbedBuilder()
        .setColor(this.COLOR_HOSHIKO)
        .setTitle("🌸 Panel Personal de Hoshiko AI")
        .setDescription(
          `Hola **${username}**, aquí gestionas de forma privada tus cuotas, estilo de conversación y memoria personal:`,
        )
        .addFields(
          {
            name: "💬 Conversación Diaria (24h)",
            value: `• **Saldo:** ${convBar}\n• **Consumido en el ciclo:** \`${status.conversation.consumedInCycle}\``,
            inline: true,
          },
          {
            name: "🔍 Investigación y Búsqueda",
            value: `• **Saldo:** ${resBar}\n• **Consumido en el ciclo:** \`${status.research.consumedInCycle}\``,
            inline: true,
          },
          {
            name: "⏳ Próxima Reposición de Cuotas",
            value: `• **Tiempo estimado:** ${timeText}\n*(Reinicio diario a las 00:00 hora de Ecuador)*`,
            inline: false,
          },
          {
            name: "🎭 Tus Preferencias (Personal Mode)",
            value: `• **Estilo:** \`${styleLabel}\`\n• **Imágenes ilustrativas:** \`${visualsLabel}\``,
            inline: true,
          },
          {
            name: "🧠 Memoria Soberana",
            value: `• **Recuerdos activos:** \`${factsCount} / 20 recuerdos\`\n• **Estado:** ${
              memoryEnabled ? "✅ `Activa`" : "⏸️ `Pausada`"
            }`,
            inline: true,
          },
          {
            name: "⭐ Plan y Estado",
            value:
              status.conversation.maxCapacity === Infinity
                ? "• **Plan:** `Exención Activa (Ilimitado)`\n• **Límites individuales:** *Desactivados*"
                : "• **Plan:** `Free`\n• **Premium:** *Próximamente disponible en Hoshiko*",
            inline: false,
          },
        )
        .setFooter({ text: "Hoshiko AI • Zona Horaria Oficial: Ecuador (UTC-5) ♡" });

      if (userAvatar) {
        embed.setThumbnail(userAvatar);
      }

      const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ai_tab_style")
          .setLabel("Cambiar Estilo")
          .setEmoji("🌸")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("ai_toggle_images")
          .setLabel(prefs.allowVisuals ? "Imágenes: On" : "Imágenes: Off")
          .setEmoji("🖼️")
          .setStyle(prefs.allowVisuals ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("ai_tab_memories")
          .setLabel("Ver Recuerdos")
          .setEmoji("🧠")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("ai_toggle_memory")
          .setLabel(memoryEnabled ? "Pausar Memoria" : "Reanudar Memoria")
          .setEmoji(memoryEnabled ? "⏸️" : "▶️")
          .setStyle(ButtonStyle.Secondary),
      );

      const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ai_modal_add_memory")
          .setLabel("Añadir Recuerdo")
          .setEmoji("➕")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("ai_tab_del_select")
          .setLabel("Borrar Recuerdo")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(factsCount === 0),
        new ButtonBuilder()
          .setCustomId("ai_btn_refresh")
          .setLabel("Refrescar")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("ai_btn_close")
          .setLabel("Cerrar")
          .setEmoji("✖️")
          .setStyle(ButtonStyle.Secondary),
      );

      return { embeds: [embed], components: [row1, row2] };
    }

    // ─── TAB: STYLE (CAMBIO DE ESTILO) ────────────────────────────────────────
    if (tab === "style") {
      const embed = new EmbedBuilder()
        .setColor(this.COLOR_HOSHIKO)
        .setTitle("🌸 Ajustar Estilo de Conversación (Personal Mode)")
        .setDescription(
          `Selecciona cómo prefieres que Hoshiko te responda en este servidor y en cualquier conversación privada:\n\n` +
          `• **⚡ Conciso:** Respuestas muy directas y breves (1 a 2 oraciones), ahorrando tiempo sin rodeos.\n` +
          `• **🌸 Balanceado:** Estilo natural, adaptativo, cálido y equilibrado (recomendado).\n` +
          `• **📖 Detallado:** Explicaciones profundas, paso a paso, con mayor contexto y estructura.\n\n` +
          `*Estilo actualmente seleccionado:* **${styleLabel}**`,
        )
        .setFooter({ text: "Tus preferencias son globales por usuario y 100% privadas ♡" });

      const styleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ai_set_concise")
          .setLabel("Conciso")
          .setEmoji("⚡")
          .setStyle(prefs.style === "concise" ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(prefs.style === "concise"),
        new ButtonBuilder()
          .setCustomId("ai_set_balanced")
          .setLabel("Balanceado")
          .setEmoji("🌸")
          .setStyle(prefs.style === "balanced" ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(prefs.style === "balanced"),
        new ButtonBuilder()
          .setCustomId("ai_set_detailed")
          .setLabel("Detallado")
          .setEmoji("📖")
          .setStyle(prefs.style === "detailed" ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(prefs.style === "detailed"),
        new ButtonBuilder()
          .setCustomId("ai_tab_main")
          .setLabel("Volver")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary),
      );

      return { embeds: [embed], components: [styleRow] };
    }

    // ─── TAB: MEMORIES (VER RECUERDOS) ────────────────────────────────────────
    if (tab === "memories") {
      const facts = memory?.facts || [];
      const factList =
        facts.length > 0
          ? facts
              .map((f, i) => {
                const tag =
                  f.category === "dynamic"
                    ? " *(dinámica de trato)*"
                    : f.source === "auto_extracted"
                      ? " *(aprendido en chat)*"
                      : f.source === "explicit"
                        ? " *(añadido manual)*"
                        : f.source === "legacy_migrated_confirmed"
                          ? " *(legado migrado)*"
                          : "";
                return `**${i + 1}.** ${f.fact}${tag}`;
              })
              .join("\n")
          : "*Aún no tienes recuerdos guardados.* Pulsa **Añadir Recuerdo** abajo para enseñarme algo importante ♡";

      const embed = new EmbedBuilder()
        .setColor(this.COLOR_HOSHIKO)
        .setTitle("🧠 Tus Recuerdos Personales")
        .setDescription(
          `Estos hechos son tenidos en cuenta de forma orgánica por Hoshiko cuando conversa contigo:\n\n${factList}\n\n` +
          `*Límite:* \`${facts.length} / 20 recuerdos guardados\``,
        )
        .setFooter({ text: "Memoria soberana: Puedes eliminar recuerdos cuando quieras ♡" });

      const memRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ai_modal_add_memory")
          .setLabel("Añadir Recuerdo")
          .setEmoji("➕")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("ai_tab_del_select")
          .setLabel("Borrar Recuerdo")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(facts.length === 0),
        new ButtonBuilder()
          .setCustomId("ai_tab_main")
          .setLabel("Volver al Panel")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary),
      );

      return { embeds: [embed], components: [memRow] };
    }

    // ─── TAB: DELETE SELECT (BORRAR RECUERDO) ─────────────────────────────────
    const facts = memory?.facts || [];
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🗑️ Eliminar un Recuerdo")
      .setDescription(
        "Selecciona en el menú desplegable de abajo el recuerdo específico que deseas eliminar de tu memoria, o elige vaciarla por completo:",
      );

    const selectOptions: StringSelectMenuOptionBuilder[] = facts.slice(0, 24).map((f, i) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`Recuerdo #${i + 1}`)
        .setDescription(f.fact.length > 80 ? `${f.fact.slice(0, 77)}...` : f.fact)
        .setValue(`del_fact_${f.id}`)
        .setEmoji("🗑️"),
    );

    selectOptions.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("Vaciar toda mi memoria")
        .setDescription("Elimina de forma irreversible todos tus recuerdos guardados")
        .setValue("del_all_facts")
        .setEmoji("⚠️"),
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ai_select_del_fact")
      .setPlaceholder("Elige qué recuerdo deseas borrar...")
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ai_tab_main")
        .setLabel("Cancelar / Volver")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary),
    );

    return { embeds: [embed], components: [selectRow, backRow] };
  }
}
