// src/Handlers/Buttons/racha.ts
import {
  MessageComponentInteraction,
  ModalSubmitInteraction,
  Message,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { IStreakGroup, StreakGroup } from "../../Models/StreakGroup";
import { IStreakMember, StreakMember } from "../../Models/StreakMember";
import { generateStreakCard } from "../../Services/CardService";
import { claimStreak, useFreeze } from "../../Services/StreakService";
import { HoshikoClient } from "../..";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

function getTierEmoji(tier: string): string {
  const emojis: Record<string, string> = {
    // Tiers del modelo StreakGroup.ts
    Mayoi:    "🖤",
    Ketsui:   "🔥",
    Aruki:    "💜",
    Negai:    "🌌",
    Arashi:   "🌈",
    Kiseki:   "👑",
    // Legacy/otros nombres por si acaso
    starter:  "🖤",
    burning:  "🔥",
    star:     "💜",
    guardian: "🌌",
    legend:   "🌈",
    immortal: "👑",
  };
  return emojis[tier] || "❓";
}

async function sendTierUpNotification(
  groupId: string,
  tierUp: { from: string; to: string },
  client: HoshikoClient
) {
  const group = await StreakGroup.findById(groupId);
  if (!group || !group.createdInChannelId) return;

  try {
    const channel = await client.channels.fetch(group.createdInChannelId);
    // The channel must be a type that can have messages sent to it.
    if (!channel || !('send' in channel) || !channel.isTextBased()) return;

    const tierEmoji = getTierEmoji(tierUp.to);
    const embed = new EmbedBuilder()
      .setTitle(`🎉 ¡NUEVO TIER ALCANZADO! 🎉`)
      .setDescription(`¡La racha **${group.name}** ha subido de nivel!\n\n**${tierUp.from}** ➡ **${tierUp.to}** ${tierEmoji}`)
      .setColor(0xffd700) // Gold color
      .setTimestamp();

    const membersMention = group.memberIds.map((id) => `<@${id}>`).join(" ");

    await channel.send({ content: `¡Felicidades, ${membersMention}!`, embeds: [embed] });
  } catch (e) {
    console.error(`[Racha] No se pudo enviar la notificación de tier-up para el grupo ${groupId}:`, e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export async function handleRachaButton(interaction: MessageComponentInteraction | ModalSubmitInteraction, client: HoshikoClient): Promise<void> {
  // 1. Definimos una función de respuesta inteligente
  const safeReply = async (content: any) => {
    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(content);
      } else {
        return await interaction.reply({ ...content, ephemeral: true });
      }
    } catch (e) {
      console.error("Error al responder:", e);
    }
  };

  try {
    const customId = interaction.customId;

    // ── MODAL SUBMIT: RENOMBRAR RACHA ────────────────────────────────────────
    if (interaction.isModalSubmit() && customId.startsWith("racha_rename_modal_")) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const groupId = customId.split("_")[3];
      const newName = interaction.fields.getTextInputValue("newNameInput");

      try {
        const streak = await StreakGroup.findById(groupId);

        if (!streak) {
          await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada mientras la renombrabas." });
          return;
        }

        if (streak.ownerId !== interaction.user.id) {
          await safeReply({ content: "⛔ ¡Hey! Solo el propietario puede renombrar esta racha." });
          return;
        }

        const oldName = streak.name;
        streak.name = newName;
        await streak.save();

        await safeReply({
          content: `✅ ¡Racha renombrada con éxito!\n\n**Antes:** \`${oldName}\`\n**Ahora:** \`${newName}\``,
        });
      } catch (error) {
        console.error("Error renombrando racha:", error);
        await safeReply({
          content: "❌ Ocurrió un error al intentar renombrar la racha. Por favor, inténtalo de nuevo.",
        });
      }
      return;
    }

    // A partir de aquí, solo son componentes de mensaje. Si no lo es, salimos.
    if (!interaction.isMessageComponent()) return;

    // ── RECLAMAR PENDIENTES ───────────────────────────────────────────────────
    if (customId === "racha_claim_pending" || customId === "racha_claim_all_pending") {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const pending: IStreakMember[] = await StreakMember.find({
        userId:      interaction.user.id,
        dailyStatus: "pending",
      });

      if (pending.length === 0) {
        await safeReply({
          content: "✅ **¡Todas tus rachas están al día!**\nNo hay pendientes.",
        });
        return;
      }

      // Si solo hay 1 pendiente → reclamar directo
      if (pending.length === 1) {
        const groupId = pending[0].groupId.toString();
        const result = await claimStreak(interaction.user.id, groupId);
        const group  = await StreakGroup.findById(pending[0].groupId);

        const embed = new EmbedBuilder().setTitle("✅ Racha reclamada");

        if (result.ok) {
          embed
            .setColor(0x00ff88)
            .setDescription(
              `**${group?.name}** → **Reclamado** ✅\n` +
              `Racha actual: **${result.currentStreak} días** ${getTierEmoji(group?.tier || "starter")}`
            );

          if (result.hofAchieved) {
            embed.addFields({
              name:   "👑 ¡HALL OF FAME ALCANZADO!",
              value:  `¡${group?.name} es ahora leyenda eterna! 🎉`,
              inline: false,
            });
          }
        } else {
          embed.setColor(0xff6b6b).setDescription("❌ Error: " + result.reason);
        }

        await safeReply({ embeds: [embed] });

        if (result.ok && result.tierUp) {
          await sendTierUpNotification(groupId, result.tierUp, client);
        }
        return;
      }

      // Múltiples pendientes → select menu con grupos cargados
      const groupIds  = pending.map((m) => m.groupId);
      const groups: IStreakGroup[] = await StreakGroup.find({ _id: { $in: groupIds } });
      const groupMap  = new Map(groups.map((g: IStreakGroup) => [g._id.toString(), g]));

      const select = new StringSelectMenuBuilder()
        .setCustomId("racha_claim_select")
        .setPlaceholder("Selecciona la racha para reclamar")
        .addOptions(
          pending.slice(0, 25).map((m: IStreakMember) => {
            const group: IStreakGroup | undefined = groupMap.get(m.groupId.toString());
            return new StringSelectMenuOptionBuilder()
              .setLabel(group?.name || "Racha desconocida")
              .setDescription(`${m.totalClaims} claims • ${getTierEmoji(group?.tier || "starter")} ${group?.tier || ""}`)
              .setValue(m.groupId.toString());
          })
        );

      await safeReply({
        content:    `Tienes **${pending.length} rachas pendientes**. Selecciona una para reclamar:`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      });

    // ── RECLAMAR DESDE EL SELECT MENU ─────────────────────────────────────────
    } else if (interaction.isStringSelectMenu() && customId === "racha_claim_select") {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const groupId = interaction.values[0]; // Obtenemos el ID de la racha seleccionada
      const result = await claimStreak(interaction.user.id, groupId);
      const group = await StreakGroup.findById(groupId);

      const embed = new EmbedBuilder().setTitle("✅ Racha reclamada");

      if (result.ok) {
        embed
          .setColor(0x00ff88)
          .setDescription(
            `**${group?.name}** → **Reclamado** ✅\n` +
            `Racha actual: **${result.currentStreak} días** ${getTierEmoji(group?.tier || "starter")}`
          );

        if (result.hofAchieved) {
          embed.addFields({
            name:   "👑 ¡HALL OF FAME ALCANZADO!",
            value:  `¡${group?.name} es ahora leyenda eterna! 🎉`,
            inline: false,
          });
        }
      } else {
        embed.setColor(0xff6b6b).setDescription("❌ Error: " + result.reason);
      }

      await safeReply({ embeds: [embed] });

      if (result.ok && result.tierUp) {
        await sendTierUpNotification(groupId, result.tierUp, client);
      }
      return;

    // ── GESTIONAR RACHA (desde el select menu) ───────────────────────────────
    } else if (interaction.isStringSelectMenu() && customId === "racha_manage_select") {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const groupId = interaction.values[0];
      const streak = await StreakGroup.findById(groupId);

      if (!streak) {
        await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
        return;
      }

      // Necesitamos los datos del miembro para el botón de freeze
      const member = await StreakMember.findOne({ userId: interaction.user.id, groupId });
      const freezesAvailable = member?.freezesAvailable ?? 0;
      const alreadyCovered = member?.dailyStatus === 'claimed' || member?.freezeUsedToday === true;
      // ----------------------------------------------------------------
      // 🎨 AQUÍ IRÁ LA GENERACIÓN DE LA TARJETA PNG
      // ----------------------------------------------------------------
      const cardBuffer = await generateStreakCard(groupId, client);
      const attachment = new AttachmentBuilder(cardBuffer, { name: `streak-${groupId}.png` });

      const embed = new EmbedBuilder()
        .setColor(0x2f3136) // Un color neutro para el embed
        .setImage(`attachment://streak-${groupId}.png`)
        .setFooter({ text: `ID de la racha: ${groupId}` });

      const managementRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`racha_rename_${groupId}`)
          .setLabel("Renombrar")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✏️"),
        new ButtonBuilder()
          .setCustomId(`racha_invite_${groupId}`)
          .setLabel("Invitar")
          .setStyle(ButtonStyle.Success)
          .setEmoji("➕")
          // Deshabilitar si es un duo o si ya alcanzó el máximo de miembros (lógica futura)
          .setDisabled(streak.type === "duo"),
        new ButtonBuilder()
          .setCustomId(`racha_leave_${groupId}`)
          .setLabel("Abandonar")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("❌"),
        new ButtonBuilder()
          .setCustomId(`racha_use_freeze_${groupId}`)
          .setLabel(`Usar Freeze (${freezesAvailable})`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("❄️")
          .setDisabled(freezesAvailable <= 0 || alreadyCovered)
      );

      await safeReply({
        embeds: [embed],
        components: [managementRow],
        files: [attachment],
      });
      return;

    // ── ACCIÓN: USAR FREEZE ──────────────────────────────────────────────────
    } else if (interaction.isButton() && customId.startsWith("racha_use_freeze_")) {
      const groupId = customId.replace("racha_use_freeze_", "");
      const result = await useFreeze(interaction.user.id, groupId);

      if (result.ok) {
        await safeReply({
          content: "✅ ¡Freeze utilizado! Tu racha está a salvo para el ciclo de hoy. No necesitas reclamar.",
          components: [] // Remove buttons to prevent further interaction
        });
      } else {
        let reasonText = "Ocurrió un error desconocido.";
        switch (result.reason) {
          case "no_freezes":
            reasonText = "No te quedan freezes disponibles.";
            break;
          case "already_frozen":
            reasonText = "Ya has utilizado un freeze para esta racha hoy.";
            break;
          case "not_found":
            reasonText = "No se encontró tu membresía en esta racha.";
            break;
        }
        await safeReply({ content: `❌ ${reasonText}` });
      }
      return;

    // ── ACCIONES DE GESTIÓN (botones del panel) ──────────────────────────────
    } else if (interaction.isButton() && customId.startsWith("racha_rename_")) {
      const groupId = customId.split("_")[2];
      const streak = await StreakGroup.findById(groupId);

      if (!streak) {
        await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
        return;
      }

      // Solo el owner puede renombrar
      if (interaction.user.id !== streak.ownerId) {
        await safeReply({ content: "❌ Solo el propietario de la racha puede renombrarla." });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`racha_rename_modal_${groupId}`)
        .setTitle("✏️ Renombrar Racha");

      const nameInput = new TextInputBuilder()
        .setCustomId("newNameInput")
        .setLabel("Nuevo nombre para la racha")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Un nombre épico para tu racha...")
        .setValue(streak.name)
        .setMaxLength(32)
        .setRequired(true);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
      return; // No hay respuesta directa, solo se muestra el modal

    } else if (interaction.isButton() && customId.startsWith("racha_invite_")) {
      const groupId = customId.split("_")[2];
      const streak = await StreakGroup.findById(groupId);

      if (!streak) {
        await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
        return;
      }

      // --- Validaciones ---
      if (interaction.user.id !== streak.ownerId) {
        await safeReply({ content: "❌ Solo el propietario de la racha puede invitar a nuevos miembros." });
        return;
      }
      if (streak.type === "duo") {
        await safeReply({ content: "❌ No puedes invitar a nadie a una racha de tipo 'duo'." });
        return;
      }
      const MAX_MEMBERS = 5;
      if (streak.memberIds.length >= MAX_MEMBERS) {
        await safeReply({ content: `❌ La racha ya está llena (${streak.memberIds.length}/${MAX_MEMBERS} miembros).` });
        return;
      }

      await safeReply({ content: "👤 Menciona al usuario que quieres invitar a la racha. Tienes 30 segundos." });

      const filter = (m: Message) => m.author.id === interaction.user.id;

      const channel = interaction.channel;
      if (!channel || !("createMessageCollector" in channel)) {
        await safeReply({ content: "❌ No puedo escuchar respuestas en este tipo de canal." });
        return;
      }
      const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });

      let collected = false;

      collector.on("collect", async (message: Message) => {
        collected = true;
        const targetUser = message.mentions.users.first();

        await message.delete().catch(() => {});

        if (!targetUser || targetUser.bot || targetUser.id === interaction.user.id) {
          await interaction.editReply({ content: "❌ Mención inválida. Debes mencionar a otro usuario que no sea un bot." });
          return;
        }
        if (streak.memberIds.includes(targetUser.id)) {
          await interaction.editReply({ content: `❌ **${targetUser.username}** ya es miembro de esta racha.` });
          return;
        }

        streak.memberIds.push(targetUser.id);
        await new StreakMember({ userId: targetUser.id, groupId: streak._id }).save();
        await streak.save();

        await interaction.editReply({ content: `✅ ¡**${targetUser.username}** ha sido invitado a la racha **${streak.name}**!` });
      });

      collector.on("end", async () => {
        if (!collected) {
          await interaction.editReply({ content: "⏰ Tiempo agotado. La invitación ha sido cancelada." }).catch(() => {});
        }
      });
      return;

    // ── CONFIRMAR ABANDONO ───────────────────────────────────────────────
    } else if (interaction.isButton() && customId.startsWith("racha_leave_confirm_")) {

      const groupId = customId.replace("racha_leave_confirm_", "");
      const streak = await StreakGroup.findById(groupId);

      if (!streak) {
        await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
        return;
      }
    
      // Eliminar miembro
      streak.memberIds = streak.memberIds.filter(id => id !== interaction.user.id);
    
      // Si queda 1 o 0 miembros → disolver automáticamente
      if (streak.memberIds.length < 2) {
        streak.status = "dissolved";
        await StreakMember.deleteMany({ groupId: streak._id });
        await streak.save();
    
        await safeReply({
          content: "💀 Has abandonado la racha. Como ahora tiene menos de 2 miembros, ha sido disuelta.",
          components: []
        });
        return;
      }
    
      // Si era el owner → transferir propiedad
      if (streak.ownerId === interaction.user.id) {
        streak.ownerId = streak.memberIds[0];
      }
    
      await StreakMember.deleteOne({
        userId: interaction.user.id,
        groupId: streak._id
      });
    
      await streak.save();
    
      await safeReply({
        content: "🚪 Has abandonado la racha correctamente.",
        components: []
      });
    
      return;
    
    
    // ── CANCELAR ABANDONO ───────────────────────────────────────────────
    } else if (interaction.isButton() && customId === "racha_leave_cancel") {
    
      await safeReply({
        content: "❎ Operación cancelada.",
        components: []
      });
    
      return;
    
    
    // ── INICIAR ABANDONO ─────────────────────────────────────────────────
    } else if (interaction.isButton() && customId.startsWith("racha_leave_")) {
    
      const groupId = customId.replace("racha_leave_", "");
      const streak = await StreakGroup.findById(groupId);
    
      if (!streak) {
        await safeReply({ content: "❌ No encontré esa racha. Pudo haber sido eliminada." });
        return;
      }
    
      const confirmationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`racha_leave_confirm_${groupId}`)
          .setLabel("Sí, abandonar esta racha")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("racha_leave_cancel")
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Secondary)
      );
    
      let warningMessage = `⚠️ ¿Estás seguro de que quieres abandonar la racha **${streak.name}**? Esta acción no se puede deshacer.`;
    
      if (streak.memberIds.length <= 2) {
        warningMessage += "\n\n**¡Cuidado!** Quedan muy pocos miembros. Si abandonas, la racha se disolverá permanentemente.";
      } else if (streak.ownerId === interaction.user.id) {
        warningMessage += "\n\n**¡Cuidado!** Eres el propietario. Si abandonas, la propiedad se transferirá a otro miembro.";
      }
    
      await safeReply({
        content: warningMessage,
        components: [confirmationRow],
      });
    
      return;

    // ── MIS RACHAS ────────────────────────────────────────────────────────────
    } else if (customId === "racha_my_streaks") {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      const userStreaks = await StreakGroup.aggregate<IStreakGroup & { myStatus: string }>([
        {
          $match: {
            memberIds: interaction.user.id,
            status: { $ne: "dissolved" },
          },
        },
        {
          $lookup: {
            from:     "streak_members",
            localField: "_id",
            foreignField: "groupId",
            as:       "memberData",
            pipeline: [{ $match: { userId: interaction.user.id } }],
          },
        },
        {
          $addFields: {
            myStatus: { $arrayElemAt: ["$memberData.dailyStatus", 0] },
          },
        },
        { $sort: { currentStreak: -1 } },
      ]);

      if (userStreaks.length === 0) {
        await safeReply({
          content:   "No estás en ninguna racha activa. Crea una con `/racha crear`.",
        });
        return;
      }

      // Si hay más de una racha, mostrar un menú para que elija cuál gestionar
      if (userStreaks.length > 1) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("racha_manage_select")
          .setPlaceholder("Selecciona una racha para ver sus detalles")
          .addOptions(
            userStreaks.slice(0, 25).map((s) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(s.name)
                .setDescription(`Racha actual: ${s.currentStreak} días • Tier: ${s.tier}`)
                .setValue(s._id.toString())
                .setEmoji(getTierEmoji(s.tier))
            )
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await safeReply({
          content: "Tienes varias rachas activas. ¿Cuál quieres ver en detalle?",
          components: [row],
        });
        return;
      }

      // Si solo hay una racha, mostrar su panel de gestión directamente
      const streak = userStreaks[0];
      const groupId = streak._id.toString();
      
      const member = await StreakMember.findOne({ userId: interaction.user.id, groupId });
      const freezesAvailable = member?.freezesAvailable ?? 0;
      const alreadyCovered = streak.myStatus === 'claimed' || member?.freezeUsedToday === true;

      // ----------------------------------------------------------------
      // 🎨 AQUÍ IRÁ LA GENERACIÓN DE LA TARJETA PNG
      // ----------------------------------------------------------------
      const cardBuffer = await generateStreakCard(groupId, client);
      const attachment = new AttachmentBuilder(cardBuffer, { name: `streak-${groupId}.png` });

      const embed = new EmbedBuilder()
        .setColor(0x2f3136) // Un color neutro para el embed
        .setImage(`attachment://streak-${groupId}.png`)
        .setFooter({ text: `ID de la racha: ${groupId}` });

      const managementRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`racha_rename_${groupId}`)
          .setLabel("Renombrar")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✏️"),
        new ButtonBuilder()
          .setCustomId(`racha_invite_${groupId}`)
          .setLabel("Invitar")
          .setStyle(ButtonStyle.Success)
          .setEmoji("➕")
          .setDisabled(streak.type === "duo"),
        new ButtonBuilder()
          .setCustomId(`racha_leave_${groupId}`)
          .setLabel("Abandonar")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("❌"),
        new ButtonBuilder()
          .setCustomId(`racha_use_freeze_${groupId}`)
          .setLabel(`Usar Freeze (${freezesAvailable})`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("❄️")
          .setDisabled(freezesAvailable <= 0 || alreadyCovered)
      );

      await safeReply({
        embeds:     [embed],
        components: [managementRow],
        files: [attachment],
      });

    // ── CREAR NUEVA (redirige al comando) ─────────────────────────────────────
    } else if (customId === "racha_create_new") {
      await safeReply({
        content:   "➕ Usa `/racha crear` para crear una nueva racha con alguien~",
      });

    // ── TOP ───────────────────────────────────────────────────────────────────
    } else if (customId === "racha_top") {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      const top = await StreakGroup.find({ status: "active" })
        .sort({ currentStreak: -1 })
        .limit(10);

      if (top.length === 0) {
        await safeReply({
          content:   "No hay rachas activas todavía. ¡Sé el primero!",
        });
        return;
      }

      const lines = top.map((s: IStreakGroup, i: number) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
        return `${medal} **${s.name}** ${getTierEmoji(s.tier)} — **${s.currentStreak} días**`;
      });

      const embed = new EmbedBuilder()
        .setTitle("🏆 Top Rachas Globales")
        .setColor(0xffd700)
        .setDescription(lines.join("\n"))
        .setFooter({ text: "Reclama cada día para mantenerte en el top 🔥" });

      await safeReply({ embeds: [embed] });

    // ── HELP ──────────────────────────────────────────────────────────────────
    } else if (customId === "racha_help") {
      await safeReply({
        content: "📖 Para ver la guía completa e interactiva, por favor usa el comando `/racha help`.",
      });
    }
  } catch (error: any) {
    // 🚨 ESTO ES LO MÁS IMPORTANTE: Si el código falla, te lo dirá en Discord
    console.error("❌ ERROR EN RACHA HANDLER:", error);
    await safeReply({
      content: `❌ **¡Mya! Algo salió mal:** \`\`\`${error.message}\`\`\``,
    });
  }
}