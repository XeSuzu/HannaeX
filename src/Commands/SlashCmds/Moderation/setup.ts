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
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { SettingsManager } from "../../../Database/SettingsManager";
import { IAConfigManager } from "../../../Database/IAConfigManager";
import { PremiumManager } from "../../../Database/PremiumManager";
import { SlashCommand } from "../../../Interfaces/Command";

const GLOBAL_BANNER =
  "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif";

const command: SlashCommand = {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("⚙️ Configura la seguridad y la personalidad de Hoshiko.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

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

      const modules = set?.securityModules || { antiRaid: false, antiLinks: false, snipe: false };
      const aiSys = aiSet.aiSystem || { mode: "neko", behavior: "normal", spontaneousChannels: [] };

      const currentBehavior = (aiSys.behavior || "normal").toLowerCase();
      let behaviorDisplay = "";
      let safetyDisplay = "";

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

      const isSpontaneousHere = (aiSys.spontaneousChannels || []).includes(interaction.channelId);

      // Usamos logChannels.modlog como fuente de verdad
      const modlogChannel = set?.logChannels?.modlog ?? set?.modLogChannel ?? null;
      const logsDisplay = modlogChannel
        ? `<#${modlogChannel}>`
        : "⚠️ Sin configurar — usa \`/setup-logs\`";

      const embed = new EmbedBuilder()
        .setTitle("｡･:* 🐾 **CONFIGURACIÓN DEL NÚCLEO** *:･ﾟ")
        .setDescription(
          `Ajusta mis niveles de seguridad y personalidad.\n💎 **Licencia:** ${isPremium ? "✨ **PREMIUM**" : "🌑 **GRATIS**"}`,
        )
        .setColor(currentBehavior === "agresivo" ? 0xff0000 : currentBehavior === "pesado" ? 0xffa500 : 0xffb6c1)
        .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
        .addFields(
          {
            name: "🧠 **NIVEL DE COMPORTAMIENTO (IA)**",
            value: `> 🎭 **Modo Actual:** \`${behaviorDisplay}\`\n> 🛡️ **Filtro IA:** \`${safetyDisplay}\`\n> *El filtro se ajusta automáticamente según el modo.*`,
            inline: false,
          },
          {
            name: "🛡️ **SEGURIDAD DEL SERVIDOR**",
            value: `> ⚔️ **Anti-Raid:** ${modules.antiRaid ? "✅ ON" : "❌ OFF"}\n> 🔗 **Anti-Links:** ${modules.antiLinks ? "✅ ON" : "❌ OFF"}\n> 🕵️ **Snipe:** ${modules.snipe ? "✅ ON" : "❌ OFF"}\n> 📝 **Logs:** ${logsDisplay}`,
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

      const mainMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("setup_main_menu")
          .setPlaceholder("Selecciona una opción...")
          .addOptions([
            { label: "Ajustar Comportamiento/Filtro", value: "menu_behavior", emoji: "🧠", description: "Cambia entre Normal, Pesado o Agresivo." },
            { label: "Cambiar Identidad (Roleplay)", value: "menu_identity", emoji: "🎭", description: "Neko, Maid, Gymbro, etc." },
            { label: "Seguridad (Anti-Raid/Links)", value: "menu_security", emoji: "🛡️", description: "Activa o desactiva protecciones." },
            { label: "Chat Espontáneo AQUÍ", value: "ai_toggle_spontaneous", emoji: "🗣️", description: "Activa/Desactiva que hable sola en este canal." },
          ]),
      );

      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("setup_home").setLabel("Inicio").setEmoji("🏠").setStyle(ButtonStyle.Secondary).setDisabled(!specificMenu),
        new ButtonBuilder().setCustomId("setup_refresh").setLabel("Refrescar").setEmoji("🔄").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("setup_close").setLabel("Salir").setEmoji("✖️").setStyle(ButtonStyle.Danger),
      );

      return {
        embeds: [embed],
        components: (specificMenu ? [specificMenu, buttons] : [mainMenu, buttons]) as any[],
      };
    };

    const message = await interaction.editReply(await generateUI(interaction.guild.id));

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300_000,
    });

    collector.on("collect", async (i: ButtonInteraction | StringSelectMenuInteraction) => {
      const guildId = interaction.guild!.id;

      // 🌟 Diferir todas las interacciones inmediatamente excepto modales
      try {
        await i.deferUpdate();
      } catch (e) {
        return;
      }

      const isPremium = await PremiumManager.isPremium(guildId);

      // --- BOTONES ---
      if (i.isButton()) {
        if (i.customId === "setup_close") return collector.stop();
        await interaction.editReply(await generateUI(guildId));
        return;
      }

      // --- MENÚS ---
      if (i.isStringSelectMenu()) {
        const choice = i.values[0];

        if (i.customId === "setup_main_menu") {
          if (choice === "menu_behavior") {
            const subMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder().setCustomId("submenu_behavior_select").setPlaceholder("🔥 Elige el nivel de intensidad...").addOptions([
                { label: "😇 Normal (Robusto)", value: "normal", emoji: "🛡️", description: "Amigable. Filtro de seguridad MÁXIMO." },
                { label: "😒 Pesado (Medio)", value: "pesado", emoji: "💢", description: "Sarcástica/Seca. Filtro MEDIO (Premium)." },
                { label: "😈 Agresivo (Sin Filtros)", value: "agresivo", emoji: "🔥", description: "Tóxica/Insultos. Filtro MÍNIMO (Premium)." },
              ]),
            );
            await interaction.editReply(await generateUI(guildId, subMenu));
            return;
          }

          if (choice === "menu_security") {
            const subMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder().setCustomId("submenu_security_select").setPlaceholder("🛡️ Opciones de Protección").addOptions([
                { label: "Alternar Anti-Raid", value: "toggle_antiRaid", emoji: "⚔️" },
                { label: "Alternar Anti-Links", value: "toggle_antiLinks", emoji: "🔗" },
                { label: "Alternar Snipe", value: "toggle_snipe", emoji: "🕵️", description: "Permite o bloquea el comando /snipe en este servidor." },
                { label: "Configurar Logs", value: "go_setup_logs", emoji: "📝", description: "Abre /setup-logs para gestionar canales de log." },
              ]),
            );
            await interaction.editReply(await generateUI(guildId, subMenu));
            return;
          }

          if (choice === "menu_identity") {
            const subMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder().setCustomId("submenu_identity_select").setPlaceholder("🎭 Elige el personaje...").addOptions([
                { label: "Neko", value: "neko", emoji: "🐱" },
                { label: "Maid", value: "maid", emoji: "🧹" },
                { label: "Gymbro", value: "gymbro", emoji: "💪" },
                { label: "Yandere", value: "yandere", emoji: "🔪" },
                { label: "Assistant", value: "assistant", emoji: "👓" },
              ]),
            );
            await interaction.editReply(await generateUI(guildId, subMenu));
            return;
          }

          if (choice === "ai_toggle_spontaneous") {
            const result = await IAConfigManager.toggleSpontaneousChannel(guildId, interaction.channelId);
            if (!result.success) {
              await i.followUp({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });
            } else {
              await interaction.editReply(await generateUI(guildId));
            }
            return;
          }
        }

        // --- SUBMENÚS APLICAR ---
        if (i.customId === "submenu_behavior_select") {
          if (choice !== "normal" && !isPremium) {
            await i.followUp({ content: '🔒 **Modo Premium:** Los modos "Pesado" y "Agresivo" requieren suscripción.', flags: MessageFlags.Ephemeral });
            return;
          }
          const safetyLevel = choice === "pesado" ? "medium" : choice === "agresivo" ? "low" : "high";
          await IAConfigManager.updateConfig(guildId, { "aiSystem.behavior": choice, aiSafety: safetyLevel });
          await interaction.editReply(await generateUI(guildId));
          return;
        }

        if (i.customId === "submenu_security_select") {
          // Si seleccionó "Configurar Logs", redirigir al comando /setup-logs
          if (choice === "go_setup_logs") {
            await i.followUp({
              content: "📋 Usa el comando `/setup-logs` para configurar todos los canales de logs del servidor.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const moduleName = choice.split("_")[1];
          const set = await SettingsManager.getSettings(guildId);

          if (set && set.securityModules) {
            const safeModuleKey = moduleName as keyof typeof set.securityModules;
            const current = set.securityModules[safeModuleKey] || false;

            await SettingsManager.updateSettings(guildId, {
              [`securityModules.${moduleName}`]: !current,
            });
          }

          await interaction.editReply(await generateUI(guildId));
          return;
        }

        if (i.customId === "submenu_identity_select") {
          const premiumModes = ["yandere", "gymbro"];
          if (premiumModes.includes(choice) && !isPremium) {
            await i.followUp({ content: "🔒 **Identidad Premium:** Requiere suscripción.", flags: MessageFlags.Ephemeral });
            return;
          }
          await IAConfigManager.updateConfig(guildId, { "aiSystem.mode": choice });
          await interaction.editReply(await generateUI(guildId));
          return;
        }
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (e) {}
    });
  },
};

export default command;