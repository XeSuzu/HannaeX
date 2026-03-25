// src/Commands/SlashCmds/Setups/autojoin.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  Role,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import ServerConfig from "../../../Models/serverConfig";

const command: SlashCommand = {
  category: "Setups",
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName("setup-autojoin")
    .setDescription(
      "Configura los roles que se asignan automáticamente a los nuevos miembros.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    let settings = await ServerConfig.findOne({ guildId: interaction.guildId });
    if (!settings)
      settings = new ServerConfig({ guildId: interaction.guildId });
    if (!settings.autoJoin) settings.autoJoin = { enabled: false, roles: [] };

    const renderDashboard = async (isEnded = false) => {
      const validRoles = (settings!.autoJoin.roles || [])
        .map((id) => interaction.guild?.roles.cache.get(id))
        .filter((r): r is Role => !!r);

      const enabled = settings!.autoJoin.enabled;

      const embed = new EmbedBuilder()
        .setTitle("Roles de Auto-Join")
        .setDescription("Roles que recibe un usario al entrar al servidor.")
        .setThumbnail(interaction.guild?.iconURL({ size: 128 }) ?? null)
        .setColor(enabled ? "#a8e6cf" : "#ffb3b3")
        .addFields(
          {
            name: "Estado",
            value: enabled ? "🟢 Activa" : "🔴 Inactiva",
            inline: true,
          },
          {
            name: "Roles configurados",
            value:
              validRoles.length > 0
                ? `${validRoles.length}/10\n${validRoles.map((r) => `• ${r.name.toLowerCase()}`).join("\n")}`
                : "0/10 — Ninguno aún.",
            inline: true,
          },
        )
        .setFooter({
          text: isEnded ? "Cambios guardados." : "Hoshiko • Configuración",
        })
        .setTimestamp();

      const rowAdd =
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId("autojoin_add")
            .setPlaceholder("Añadir roles...")
            .setMaxValues(5)
            .setDisabled(isEnded),
        );

      const rows: any[] = [rowAdd];

      if (validRoles.length > 0) {
        rows.push(
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("autojoin_remove")
              .setPlaceholder("Quitar un rol...")
              .setDisabled(isEnded)
              .addOptions(
                validRoles.map((r) => ({
                  label: r.name.toLowerCase(),
                  value: r.id,
                  emoji: "➖",
                })),
              ),
          ),
        );
      }

      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("autojoin_toggle")
            .setLabel(enabled ? "Pausar" : "Activar")
            .setEmoji(enabled ? "🌙" : "✨")
            .setStyle(enabled ? ButtonStyle.Secondary : ButtonStyle.Success)
            .setDisabled(isEnded),
          new ButtonBuilder()
            .setCustomId("autojoin_close")
            .setLabel("Guardar y salir")
            .setEmoji("💾")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(isEnded),
        ),
      );

      return { embeds: [embed], components: rows };
    };

    await interaction.editReply(await renderDashboard());

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "este panel no es tuyo. 🐾",
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      if (i.isRoleSelectMenu() && i.customId === "autojoin_add") {
        const botPos = i.guild?.members.me?.roles.highest.position || 0;
        const toAdd = i.values.filter((id) => {
          const r = i.guild?.roles.cache.get(id);
          return (
            r &&
            r.position < botPos &&
            !r.managed &&
            !settings!.autoJoin.roles.includes(id)
          );
        });

        if (toAdd.length < i.values.length) {
          await i.followUp({
            content:
              "Algunos roles estan fuera de mi alcance y los omiti nya. 🐾",
            ephemeral: true,
          });
        }
        settings!.autoJoin.roles.push(...toAdd);
      }

      if (i.isStringSelectMenu() && i.customId === "autojoin_remove") {
        settings!.autoJoin.roles = settings!.autoJoin.roles.filter(
          (id) => !i.values.includes(id),
        );
      }

      if (i.customId === "autojoin_toggle")
        settings!.autoJoin.enabled = !settings!.autoJoin.enabled;
      if (i.customId === "autojoin_close") return collector.stop("manual");

      await settings!.save();
      await interaction.editReply(await renderDashboard());
    });

    collector.on("end", async (_, reason) => {
      if (reason === "manual") {
        await interaction.editReply({
          content: "Configuracion Guardada. 🐾",
          embeds: [],
          components: [],
        });
      } else {
        await interaction.editReply(await renderDashboard(true));
      }
    });
  },
};

export default command;
