import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { PersonalMemoryService } from "../../../Core/AI/Memory/PersonalMemoryService";

export default {
  category: "AI",
  data: new SlashCommandBuilder()
    .setName("memory")
    .setDescription("Gestiona tu memoria personal y soberana con Hoshiko 🧠")
    .addSubcommand((sub) =>
      sub
        .setName("ver")
        .setDescription("Muestra tus recuerdos personales globales"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("guardar")
        .setDescription("Guarda un recuerdo explícito en tu memoria personal")
        .addStringOption((opt) =>
          opt
            .setName("recuerdo")
            .setDescription(
              "El hecho o dato que deseas que Hoshiko recuerde (5-140 caracteres)",
            )
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("categoria")
            .setDescription("Categoría del recuerdo")
            .setRequired(false)
            .addChoices(
              { name: "Personalizado", value: "custom" },
              { name: "Gustos y Hobbies", value: "gustos" },
              { name: "Estudios", value: "estudios" },
              { name: "Trabajo", value: "trabajo" },
              { name: "General", value: "general" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("borrar")
        .setDescription("Borra recuerdos de tu memoria personal")
        .addStringOption((opt) =>
          opt
            .setName("opcion")
            .setDescription("¿Qué deseas borrar?")
            .setRequired(true)
            .addChoices(
              { name: "Todo", value: "todo" },
              { name: "Un recuerdo específico", value: "uno" },
            ),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("numero")
            .setDescription("Número del recuerdo a borrar (usa /memory ver)")
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ajustes")
        .setDescription("Activa o desactiva tu memoria personal")
        .addStringOption((opt) =>
          opt
            .setName("estado")
            .setDescription("Estado de la memoria")
            .setRequired(true)
            .addChoices(
              { name: "Activada", value: "activada" },
              { name: "Desactivada", value: "desactivada" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("legados")
        .setDescription(
          "Revisa y migra con consentimiento tus recuerdos anteriores",
        )
        .addStringOption((opt) =>
          opt
            .setName("accion")
            .setDescription("Acción sobre recuerdos legados")
            .setRequired(false)
            .addChoices(
              { name: "Ver pendientes", value: "ver" },
              { name: "Confirmar y migrar", value: "confirmar" },
            ),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("numero")
            .setDescription("Número del recuerdo legado a confirmar")
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false),
        ),
    ),

  ephemeral: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ─── /memory ver ─────────────────────────────────────────────────────────
    if (subcommand === "ver") {
      const memory = await PersonalMemoryService.getMemory(userId);
      const facts = memory?.facts || [];

      if (facts.length === 0) {
        await interaction.editReply({
          content:
            "No tienes recuerdos personales guardados aún 🌸 Usa `/memory guardar` para enseñarme algo sobre ti.",
        });
        return;
      }

      const factList = facts
        .map((f, i) => {
          const tag =
            f.source === "legacy_migrated_confirmed"
              ? "*(legado confirmado)*"
              : `[${f.category}]`;
          return `\`${i + 1}.\` ${f.fact} ${tag}`;
        })
        .join("\n");

      const status = memory?.enabled
        ? "✅ Activada (utilizada en conversaciones)"
        : "⏸️ Desactivada (no se envía a la IA)";

      const embed = new EmbedBuilder()
        .setTitle("🧠 Tu Memoria Personal Global")
        .setDescription(`**Estado:** ${status}\n\n${factList}`)
        .setColor(0xff8fab)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({
          text: `${facts.length}/20 recuerdos • Privada y exclusiva de tu usuario`,
          iconURL: interaction.client.user?.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ─── /memory guardar ─────────────────────────────────────────────────────
    if (subcommand === "guardar") {
      const recuerdo = interaction.options.getString("recuerdo", true);
      const categoria = (interaction.options.getString("categoria") ||
        "custom") as any;

      const result = await PersonalMemoryService.addExplicitFact(
        userId,
        recuerdo,
        categoria,
      );

      await interaction.editReply({
        content: result.message,
      });
      return;
    }

    // ─── /memory borrar ──────────────────────────────────────────────────────
    if (subcommand === "borrar") {
      const opcion = interaction.options.getString("opcion", true);

      if (opcion === "todo") {
        await PersonalMemoryService.clearAllFacts(userId);
        await interaction.editReply({
          content:
            "¡Listo! He borrado todos tus recuerdos de la memoria personal global~ 🌸",
        });
        return;
      }

      if (opcion === "uno") {
        const numero = interaction.options.getInteger("numero");
        if (!numero) {
          await interaction.editReply({
            content:
              "Necesitas indicar el número del recuerdo a borrar~ Usa `/memory ver` primero para consultarlos. 👀",
          });
          return;
        }

        const success = await PersonalMemoryService.deleteFact(userId, numero);
        if (!success) {
          await interaction.editReply({
            content: `No encontré el recuerdo número **${numero}**~ Usa \`/memory ver\` para verificar tus recuerdos. 🌸`,
          });
          return;
        }

        await interaction.editReply({
          content: `¡Listo! Borré el recuerdo número **${numero}** de tu memoria personal global 🗑️`,
        });
        return;
      }
    }

    // ─── /memory ajustes ─────────────────────────────────────────────────────
    if (subcommand === "ajustes") {
      const estado = interaction.options.getString("estado", true);
      const enabled = estado === "activada";

      await PersonalMemoryService.toggleMemory(userId, enabled);
      await interaction.editReply({
        content: enabled
          ? "✅ Memoria personal **activada**. Hoshiko tendrá en cuenta tus recuerdos al conversar contigo 🌸"
          : "⏸️ Memoria personal **desactivada**. Hoshiko no utilizará tus recuerdos en ninguna conversación.",
      });
      return;
    }

    // ─── /memory legados ─────────────────────────────────────────────────────
    if (subcommand === "legados") {
      const accion = interaction.options.getString("accion") || "ver";
      const legacyFacts = await PersonalMemoryService.getLegacyFacts(userId);

      if (legacyFacts.length === 0) {
        await interaction.editReply({
          content:
            "No tienes recuerdos antiguos pendientes de revisión en la base legada 🌸",
        });
        return;
      }

      if (accion === "confirmar") {
        const numero = interaction.options.getInteger("numero");
        if (!numero || numero < 1 || numero > legacyFacts.length) {
          await interaction.editReply({
            content:
              "Por favor indica un número válido de recuerdo legado a confirmar (usa `/memory legados accion:ver`).",
          });
          return;
        }

        const target = legacyFacts[numero - 1];
        const res = await PersonalMemoryService.confirmLegacyFact(
          userId,
          target.fact,
        );
        await interaction.editReply({
          content: res.message,
        });
        return;
      }

      // accion: "ver"
      const list = legacyFacts
        .map((f, i) => `\`${i + 1}.\` ${f.fact}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📜 Recuerdos Anteriores Pendientes de Confirmación")
        .setDescription(
          `Hoshiko tiene guardados los siguientes recuerdos de la versión anterior.\n` +
            `Por tu privacidad, **NO se utilizan** en tus conversaciones actuales a menos que los confirmes explícitamente.\n\n` +
            `${list}\n\n` +
            `*Para conservar un recuerdo, usa:* \`/memory legados accion:confirmar numero:<N>\`\n` +
            `*Nota: Los recuerdos no confirmados serán purgados permanentemente tras el plazo de 60 días.*`,
        )
        .setColor(0xff8fab)
        .setFooter({
          text: `${legacyFacts.length} recuerdos pendientes de confirmación`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
};
