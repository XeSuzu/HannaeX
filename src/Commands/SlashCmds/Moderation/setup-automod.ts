import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoClient } from "../../../index";
import GuildConfig from "../../../Models/GuildConfig";
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
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient): Promise<void> {
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      let config = await GuildConfig.findOne({ guildId });
      if (!config) config = new GuildConfig({ guildId });

      switch (sub) {
        case "view": {
          const mods = config.securityModules;
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
                  `IA Moderación: ${mods.aiModeration ? "✅" : "❌"}`,
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

          (config.securityModules as any)[nombre] = activo;
          await config.save();

          await interaction.editReply(
            `${activo ? "✅" : "❌"} Módulo **${nombre}** ${activo ? "activado" : "desactivado"}.`
          );
          break;
        }

        case "allow-link": {
          const dominio = interaction.options.getString("dominio", true).toLowerCase().trim();

          if (!config.allowedLinks) config.allowedLinks = [];
          if (config.allowedLinks.includes(dominio)) {
            await interaction.editReply(`ℹ️ **${dominio}** ya está en la whitelist.`);
            break;
          }

          config.allowedLinks.push(dominio);
          await config.save();
          await interaction.editReply(`✅ **${dominio}** añadido a la whitelist de links.`);
          break;
        }

        case "remove-link": {
          const dominio = interaction.options.getString("dominio", true).toLowerCase().trim();

          if (!config.allowedLinks?.includes(dominio)) {
            await interaction.editReply(`❌ **${dominio}** no estaba en la whitelist.`);
            break;
          }

          config.allowedLinks = config.allowedLinks.filter((d) => d !== dominio);
          await config.save();
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
      }
    } catch (error) {
      console.error("❌ Error en /setup-automod:", error);
      await interaction.editReply("😿 Hubo un error al procesar la configuración.");
    }
  },
};

export default command;