import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 3,
  options: {
    ephemeral: true,
  },
  data: new SlashCommandBuilder()
    .setName("wordfilter")
    .setDescription("Gestiona el filtro de palabras prohibidas con motor Anti-Bypass.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Añade una palabra a la lista prohibida.")
        .addStringOption((opt) =>
          opt
            .setName("palabra")
            .setDescription("Término a bloquear")
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(50),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Elimina una palabra de la lista prohibida.")
        .addStringOption((opt) =>
          opt
            .setName("palabra")
            .setDescription("Término a remover")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Muestra la lista de palabras prohibidas en el servidor."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("Activa o desactiva el filtro de palabras en el servidor.")
        .addBooleanOption((opt) =>
          opt
            .setName("activo")
            .setDescription("Estado deseado del filtro")
            .setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply("Este comando solo puede ejecutarse en un servidor.");
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const settings = (await SettingsManager.getSettings(guildId)) as any;

    const currentWords: string[] = Array.isArray(settings?.bannedWords)
      ? [...settings.bannedWords]
      : [];
    const currentMods = settings?.securityModules || {};
    const isFilterActive = Boolean(currentMods.wordFilter);

    const embed = new EmbedBuilder().setColor(0xffb6c1).setTimestamp();

    switch (subcommand) {
      case "add": {
        const rawWord = interaction.options.getString("palabra", true).trim().toLowerCase();
        if (rawWord.length < 2) {
          await interaction.editReply("❌ La palabra debe tener al menos 2 caracteres.");
          return;
        }

        if (currentWords.some((w) => w.toLowerCase() === rawWord)) {
          await interaction.editReply(`ℹ️ La palabra \`${rawWord}\` ya está en la lista de términos prohibidos.`);
          return;
        }

        currentWords.push(rawWord);
        await SettingsManager.updateSettings(guildId, {
          bannedWords: currentWords,
        });

        embed
          .setTitle("🛡️ Palabra Añadida al Filtro")
          .setDescription(
            `Se ha añadido el término \`${rawWord}\` a la lista de palabras prohibidas.\n` +
              `El motor **Anti-Bypass** bloqueará automáticamente variantes con leetspeak, acentos, espaciados y repeticiones.`,
          );

        if (!isFilterActive) {
          embed.setFooter({
            text: "Nota: El módulo wordFilter está desactivado. Actívalo con /wordfilter toggle.",
          });
        }

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case "remove": {
        const rawWord = interaction.options.getString("palabra", true).trim().toLowerCase();
        const initialCount = currentWords.length;
        const updatedWords = currentWords.filter((w) => w.toLowerCase() !== rawWord);

        if (updatedWords.length === initialCount) {
          await interaction.editReply(`❌ La palabra \`${rawWord}\` no se encontró en la lista.`);
          return;
        }

        await SettingsManager.updateSettings(guildId, {
          bannedWords: updatedWords,
        });

        embed
          .setTitle("🗑️ Palabra Removida del Filtro")
          .setDescription(`Se ha eliminado \`${rawWord}\` de la lista de palabras prohibidas.`);

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case "list": {
        const statusEmoji = isFilterActive ? "🟢 Activo" : "🔴 Desactivado";
        embed.setTitle("📋 Filtro de Palabras Prohibidas");

        const formattedList =
          currentWords.length > 0
            ? currentWords.map((w) => `• \`${w}\``).join("\n")
            : "_No hay palabras configuradas en este servidor._";

        embed.addFields(
          { name: "Estado del Módulo", value: statusEmoji, inline: true },
          { name: "Total Términos", value: `${currentWords.length}`, inline: true },
          { name: "Términos Bloqueados", value: formattedList.slice(0, 1024), inline: false },
        );

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case "toggle": {
        const explicitState = interaction.options.getBoolean("activo");
        const nextState = explicitState !== null ? explicitState : !isFilterActive;

        await SettingsManager.updateSettings(guildId, {
          securityModules: {
            ...currentMods,
            wordFilter: nextState,
          },
        });

        embed
          .setTitle("⚙️ Configuración del Filtro de Palabras")
          .setDescription(
            `El filtro de palabras prohibidas ahora está **${nextState ? "ACTIVADO 🟢" : "DESACTIVADO 🔴"}** en este servidor.`,
          );

        await interaction.editReply({ embeds: [embed] });
        break;
      }
    }
  },
};

export default command;
