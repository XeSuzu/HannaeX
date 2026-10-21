import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { AutomodManager } from "../../../Features/AutomodManager";

const command: SlashCommand = {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("setup-automod")
    .setDescription("Configura el sistema de automod para este servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // Ver configuración actual
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("Muestra la configuración actual del automod.")
    )

    // Activar/desactivar módulos
    .addSubcommand((sub) =>
      sub
        .setName("modulo")
        .setDescription("Activa o desactiva un módulo de seguridad.")
        .addStringOption((opt) =>
          opt
            .setName("nombre")
            .setDescription("Módulo a configurar.")
            .setRequired(true)
            .addChoices(
              { name: "Anti-Links", value: "antiLinks" },
              { name: "Anti-Raid", value: "antiRaid" },
              { name: "Anti-Alt", value: "antiAlt" },
              { name: "Anti-Nuke", value: "antiNuke" },
              { name: "IA Moderación", value: "aiModeration" },
              { name: "Filtro de Palabras", value: "wordFilter" },
            )
        )
        .addBooleanOption((opt) =>
          opt.setName("activo").setDescription("Activar o desactivar.").setRequired(true)
        )
    )

    // Agregar link a whitelist
    .addSubcommand((sub) =>
      sub
        .setName("allow-link")
        .setDescription("Añade un dominio a la whitelist de links permitidos.")
        .addStringOption((opt) =>
          opt
            .setName("dominio")
            .setDescription("Dominio a permitir (ej: twitch.tv).")
            .setRequired(true)
        )
    )

    // Quitar link de whitelist
    .addSubcommand((sub) =>
      sub
        .setName("remove-link")
        .setDescription("Quita un dominio de la whitelist.")
        .addStringOption((opt) =>
          opt
            .setName("dominio")
            .setDescription("Dominio a eliminar.")
            .setRequired(true)
        )
    )

    // Whitelist de usuarios
    .addSubcommand((sub) =>
      sub
        .setName("whitelist-user")
        .setDescription("Añade o quita un usuario de la whitelist del automod.")
        .addUserOption((opt) =>
          opt.setName("usuario").setDescription("Usuario a gestionar.").setRequired(true)
        )
        .addBooleanOption((opt) =>
          opt.setName("agregar").setDescription("true = añadir, false = quitar.").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("ai-mode")
        .setDescription("Configura el modo de ejecución de la IA de moderación.")
        .addStringOption((opt) =>
          opt
            .setName("modo")
            .setDescription("shadow = audita sin sanciones; enforce = aplica acciones.")
            .setRequired(true)
            .addChoices(
              { name: "Sombra (auditoría sin sanción directa)", value: "shadow" },
              { name: "Enforce (aplica acciones)", value: "enforce" },
            )
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      const config = await SettingsManager.getSettings(guildId);

      switch (sub) {
        case "view": {
          const mods = config.securityModules || ({} as any);
          const links = config.allowedLinks?.join(", ") || "Ninguno";

          const embed = new EmbedBuilder()
            .setTitle("⚙️ Configuración del Automod")
            .setColor(0xeba6d1)
            .addFields(
              {
                name: "🛡️ Módulos",
                value: [
                  `Anti-Spam: ${mods.antiSpam ? "✅" : "❌"}`,
                  `Anti-Links: ${mods.antiLinks ? "✅" : "❌"}`,
                  `Anti-Raid: ${mods.antiRaid ? "✅" : "❌"}`,
                  `Anti-Alt: ${mods.antiAlt ? "✅" : "❌"}`,
                  `Anti-Nuke: ${mods.antiNuke ? "✅" : "❌"}`,
                  `Filtro de Palabras: ${mods.wordFilter ? "✅" : "❌"}`,
                  `IA Moderación: ${mods.aiModeration ? "✅" : "❌"} (${mods.aiMode || "shadow"})`,
                ].join("\n"),
                inline: true,
              },
              {
                name: "ℹ️ Canal de Logs",
                value: "Usa `/setup-logs` para configurar los canales de logs.",
                inline: true,
              },
              { name: "🔗 Links Permitidos", value: links, inline: false },
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case "modulo": {
          const nombre = interaction.options.getString("nombre", true);
          const activo = interaction.options.getBoolean("activo", true);

          const securityModules = {
            ...(config.securityModules || {}),
            [nombre]: activo,
          };
          await SettingsManager.updateSettings(guildId, {
            securityModules: securityModules as any,
          });

          await interaction.editReply(
            `${activo ? "✅" : "❌"} Módulo **${nombre}** ${activo ? "activado" : "desactivado"}.`
          );
          break;
        }

        case "allow-link": {
          const dominio = interaction.options.getString("dominio", true).toLowerCase().trim();
          const allowed = config.allowedLinks || [];

          if (allowed.includes(dominio)) {
            await interaction.editReply(`ℹ️ **${dominio}** ya está en la whitelist.`);
            break;
          }

          const updated = [...allowed, dominio];
          await SettingsManager.updateSettings(guildId, { allowedLinks: updated });
          await interaction.editReply(`✅ **${dominio}** añadido a la whitelist de links.`);
          break;
        }

        case "remove-link": {
          const dominio = interaction.options.getString("dominio", true).toLowerCase().trim();
          const allowed = config.allowedLinks || [];

          if (!allowed.includes(dominio)) {
            await interaction.editReply(`❌ **${dominio}** no estaba en la whitelist.`);
            break;
          }

          const updated = allowed.filter((d) => d !== dominio);
          await SettingsManager.updateSettings(guildId, { allowedLinks: updated });
          await interaction.editReply(`✅ **${dominio}** eliminado de la whitelist.`);
          break;
        }

        case "whitelist-user": {
          const target = interaction.options.getUser("usuario", true);
          const agregar = interaction.options.getBoolean("agregar", true);

          if (agregar) {
            await AutomodManager.whitelistUser(guildId, target.id);
            await interaction.editReply(`✅ **${target.tag}** añadido a la whitelist del automod.`);
          } else {
            await AutomodManager.removeWhitelistUser(guildId, target.id);
            await interaction.editReply(`✅ **${target.tag}** eliminado de la whitelist del automod.`);
          }
          break;
        }

        case "ai-mode": {
          const modo = interaction.options.getString("modo", true) as "shadow" | "enforce";
          const securityModules = {
            ...(config.securityModules || {}),
            aiMode: modo,
          };
          await SettingsManager.updateSettings(guildId, {
            securityModules: securityModules as any,
          });

          await interaction.editReply(
            `🧠 Modo de IA de moderación establecido en **${modo.toUpperCase()}** (${modo === "shadow" ? "audita en logs sin sanciones directas" : "aplica sanciones"}).`
          );
          break;
        }
      }
    } catch (error) {
      console.error("❌ Error en /setup-automod:", error);
      await interaction.editReply("😿 Hubo un error al procesar la configuración.");
    }
  },
};

export default command;