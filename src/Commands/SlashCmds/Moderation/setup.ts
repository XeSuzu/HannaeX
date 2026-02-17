import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { SettingsManager } from "../../../Database/SettingsManager";
import { IAConfigManager } from "../../../Database/IAConfigManager";
import { PremiumManager } from "../../../Database/PremiumManager";

const GLOBAL_BANNER =
  "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif";

export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("⚙️ Configura la seguridad y la personalidad de Hoshiko.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // --- FUNCIÓN GENERADORA DE UI ---
    const generateUI = async (
      guildId: string,
      specificMenu: ActionRowBuilder<StringSelectMenuBuilder> | null = null,
    ) => {
      const [set, aiSet, isPremium] = await Promise.all([
        SettingsManager.getSettings(guildId),
        IAConfigManager.getConfig(guildId),
        PremiumManager.isPremium(guildId),
      ]);

      const modules = set?.securityModules || {
        antiRaid: false,
        antiLinks: false,
      };
      const aiSys = aiSet.aiSystem || {
        mode: "neko",
        behavior: "normal",
        spontaneousChannels: [],
      };

      // Lógica de visualización de Niveles
      const currentBehavior = (aiSys.behavior || "normal").toLowerCase();
      let behaviorDisplay = "";
      let safetyDisplay = "";

      // Mapeo visual para que se entienda la relación Comportamiento <-> Seguridad
      switch (currentBehavior) {
        case "agresivo":
          behaviorDisplay = "😈 AGRESIVO (Tóxico)";
          safetyDisplay = "⚠️ Mínimo (Sin censura)";
          break;
        case "pesado":
          behaviorDisplay = "😒 PESADO (Sarcástico)";
          safetyDisplay = "⚖️ Medio (Permite bromas)";
          break;
        case "normal":
        default:
          behaviorDisplay = "😇 NORMAL (Amigable)";
          safetyDisplay = "🛡️ Robusto (Family Friendly)";
          break;
      }

      const isSpontaneousHere = (aiSys.spontaneousChannels || []).includes(
        interaction.channelId,
      );

      const embed = new EmbedBuilder()
        .setTitle("｡･:* 🐾 **CONFIGURACIÓN DEL NÚCLEO** *:･ﾟ")
        .setDescription(
          `Ajusta mis niveles de seguridad y personalidad.\n💎 **Licencia:** ${isPremium ? "✨ **PREMIUM**" : "🌑 **GRATIS**"}`,
        )
        .setColor(
          currentBehavior === "agresivo"
            ? 0xff0000
            : currentBehavior === "pesado"
              ? 0xffa500
              : 0xffb6c1,
        )
        .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
        .addFields(
          {
            name: "🧠 **NIVEL DE COMPORTAMIENTO (IA)**",
            value: `> 🎭 **Modo Actual:** \`${behaviorDisplay}\`\n> 🛡️ **Filtro IA:** \`${safetyDisplay}\`\n> *El filtro se ajusta automáticamente según el modo.*`,
            inline: false,
          },
          {
            name: "🛡️ **SEGURIDAD DEL SERVIDOR**",
            value: `> ⚔️ **Anti-Raid:** ${modules.antiRaid ? "✅ ON" : "❌ OFF"}\n> 🔗 **Anti-Links:** ${modules.antiLinks ? "✅ ON" : "❌ OFF"}\n> 📝 **Logs:** ${set?.modLogChannel ? `<#${set.modLogChannel}>` : "⚠️ No asignado"}`,
            inline: true,
          },
          {
            name: "🗣️ **CHAT ESPONTÁNEO**",
            value: `> 📍 **En este canal:** ${isSpontaneousHere ? "✅ HABLANDO" : "🔇 CALLADA"}`,
            inline: true,
          },
        )
        .setImage(GLOBAL_BANNER)
        .setFooter({
          text: "Hoshiko System • Configuración Unificada",
          iconURL: interaction.user.displayAvatarURL(),
        });

      // Menú Principal
      const mainMenu =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("setup_main_menu")
            .setPlaceholder("Selecciona una opción...")
            .addOptions([
              {
                label: "Ajustar Comportamiento/Filtro",
                value: "menu_behavior",
                emoji: "🧠",
                description: "Cambia entre Normal, Pesado o Agresivo.",
              },
              {
                label: "Cambiar Identidad (Roleplay)",
                value: "menu_identity",
                emoji: "🎭",
                description: "Neko, Maid, Gymbro, etc.",
              },
              {
                label: "Seguridad (Anti-Raid/Links)",
                value: "menu_security",
                emoji: "🛡️",
                description: "Activa o desactiva protecciones.",
              },
              {
                label: "Chat Espontáneo AQUÍ",
                value: "ai_toggle_spontaneous",
                emoji: "🗣️",
                description: "Activa/Desactiva que hable sola en este canal.",
              },
            ]),
        );

      // Botonera de control
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("setup_home")
          .setLabel("Inicio")
          .setEmoji("🏠")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!specificMenu),
        new ButtonBuilder()
          .setCustomId("setup_refresh")
          .setLabel("Refrescar")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("setup_close")
          .setLabel("Salir")
          .setEmoji("✖️")
          .setStyle(ButtonStyle.Danger),
      );

      return {
        embeds: [embed],
        components: specificMenu
          ? [specificMenu, buttons]
          : [mainMenu, buttons],
      };
    };

    const message = await interaction.editReply(
      await generateUI(interaction.guild.id),
    );

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300_000,
    });

    collector.on("collect", async (i: any) => {
      const guildId = interaction.guild!.id;
      const isPremium = await PremiumManager.isPremium(guildId);

      if (i.isButton()) {
        if (i.customId === "setup_close") {
          await i.deferUpdate();
          return collector.stop();
        }
        await i.update(await generateUI(guildId));
        return;
      }

      if (i.isStringSelectMenu()) {
        const choice = i.values[0];

        // --- NAVEGACIÓN PRINCIPAL ---
        if (i.customId === "setup_main_menu") {
          // 1. MENÚ DE COMPORTAMIENTO (Fusión de Filtros)
          if (choice === "menu_behavior") {
            const subMenu =
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId("submenu_behavior_select")
                  .setPlaceholder("🔥 Elige el nivel de intensidad...")
                  .addOptions([
                    {
                      label: "😇 Normal (Robusto)",
                      value: "normal",
                      emoji: "🛡️",
                      description: "Amigable. Filtro de seguridad MÁXIMO.",
                    },
                    {
                      label: "😒 Pesado (Medio)",
                      value: "pesado",
                      emoji: "💢",
                      description: "Sarcástica/Seca. Filtro MEDIO (Premium).",
                    },
                    {
                      label: "😈 Agresivo (Sin Filtros)",
                      value: "agresivo",
                      emoji: "🔥",
                      description: "Tóxica/Insultos. Filtro MÍNIMO (Premium).",
                    },
                  ]),
              );
            return await i.update(await generateUI(guildId, subMenu));
          }

          // 2. MENÚ DE SEGURIDAD
          if (choice === "menu_security") {
            const subMenu =
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId("submenu_security_select")
                  .setPlaceholder("🛡️ Opciones de Protección")
                  .addOptions([
                    {
                      label: "Alternar Anti-Raid",
                      value: "toggle_antiRaid",
                      emoji: "⚔️",
                    },
                    {
                      label: "Alternar Anti-Links",
                      value: "toggle_antiLinks",
                      emoji: "🔗",
                    },
                    {
                      label: "Asignar Canal Logs",
                      value: "set_logs",
                      emoji: "📝",
                    },
                  ]),
              );
            return await i.update(await generateUI(guildId, subMenu));
          }

          // 3. MENÚ DE IDENTIDAD
          if (choice === "menu_identity") {
            const subMenu =
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId("submenu_identity_select")
                  .setPlaceholder("🎭 Elige el personaje...")
                  .addOptions([
                    { label: "Neko", value: "neko", emoji: "🐱" },
                    { label: "Maid", value: "maid", emoji: "🧹" },
                    { label: "Gymbro", value: "gymbro", emoji: "💪" },
                    { label: "Yandere", value: "yandere", emoji: "🔪" },
                    { label: "Assistant", value: "assistant", emoji: "👓" },
                  ]),
              );
            return await i.update(await generateUI(guildId, subMenu));
          }

          // ACCIÓN DIRECTA: Chat Espontáneo
          if (choice === "ai_toggle_spontaneous") {
            const result = await IAConfigManager.toggleSpontaneousChannel(
              guildId,
              interaction.channelId,
            );
            if (!result.success) {
              await i.reply({
                content: `❌ ${result.message}`,
                flags: [MessageFlags.Ephemeral],
              });
            } else {
              await i.update(await generateUI(guildId));
            }
          }
        }

        // --- LÓGICA DE SUBMENÚS (APLICAR CAMBIOS) ---

        // A) APLICAR COMPORTAMIENTO (Y FILTRO)
        if (i.customId === "submenu_behavior_select") {
          // Verificar Premium
          if (choice !== "normal" && !isPremium) {
            await i.reply({
              content:
                '🔒 **Modo Premium:** Los modos "Pesado" y "Agresivo" requieren suscripción.',
              flags: [MessageFlags.Ephemeral],
            });
            return;
          }

          let safetyLevel = "high"; // Por defecto Normal
          if (choice === "pesado") safetyLevel = "medium";
          if (choice === "agresivo") safetyLevel = "low"; // o 'none'

          // Guardamos AMBOS valores de una vez
          await IAConfigManager.updateConfig(guildId, {
            "aiSystem.behavior": choice,
            aiSafety: safetyLevel,
          });

          return await i.update(await generateUI(guildId));
        }

        // B) APLICAR SEGURIDAD
        if (i.customId === "submenu_security_select") {
          if (choice === "set_logs") {
            const modal = new ModalBuilder()
              .setCustomId("m_logs")
              .setTitle("📝 Canal de Logs");
            const input = new TextInputBuilder()
              .setCustomId("val")
              .setLabel("ID del Canal")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);
            modal.addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(input),
            );
            await i.showModal(modal);
            return;
          }

          const moduleName = choice.split("_")[1];
          const set = await SettingsManager.getSettings(guildId);
          const current = (set?.securityModules as any)?.[moduleName] || false;
          await SettingsManager.updateSettings(guildId, {
            [`securityModules.${moduleName}`]: !current,
          } as any);
          return await i.update(await generateUI(guildId));
        }

        // C) APLICAR IDENTIDAD
        if (i.customId === "submenu_identity_select") {
          const premiumModes = ["yandere", "gymbro"];
          if (premiumModes.includes(choice) && !isPremium) {
            await i.reply({
              content: "🔒 **Identidad Premium:** Requiere suscripción.",
              flags: [MessageFlags.Ephemeral],
            });
            return;
          }
          await IAConfigManager.updateConfig(guildId, {
            "aiSystem.mode": choice,
          });
          return await i.update(await generateUI(guildId));
        }
      }
    });

    // Listener del modal (igual que antes)
    const modalListener = async (modalInteraction: any) => {
      const guildId = interaction.guild!.id;
      if (!modalInteraction.isModalSubmit()) return;
      if (
        modalInteraction.customId === "m_logs" &&
        modalInteraction.user.id === interaction.user.id
      ) {
        const val = modalInteraction.fields.getTextInputValue("val");
        if (!/^\d{17,20}$/.test(val))
          return modalInteraction.reply({
            content: "❌ ID inválida.",
            flags: [MessageFlags.Ephemeral],
          });
        await SettingsManager.updateSettings(guildId, { modLogChannel: val });
        await modalInteraction.deferUpdate();
        await interaction.editReply(await generateUI(guildId));
      }
    };
    interaction.client.on("interactionCreate", modalListener);
    collector.on("end", () =>
      interaction.client.removeListener("interactionCreate", modalListener),
    );
  },
};
