import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  Role,
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-autojoin")
    .setDescription("🤖 Dashboard: Configura los roles automáticos al entrar")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    // 1. Cargar Configuración
    let settings = await ServerConfig.findOne({ guildId: interaction.guildId });
    if (!settings)
      settings = new ServerConfig({ guildId: interaction.guildId });

    // Inicializar si no existe
    if (!settings.autoJoin) settings.autoJoin = { enabled: false, roles: [] };

    // --- RENDERIZADOR DEL DASHBOARD ---
    const renderDashboard = async () => {
      // Verificar qué roles siguen existiendo en el servidor (limpieza visual)
      const validRoles: Role[] = [];
      const invalidIds: string[] = [];

      for (const roleId of settings!.autoJoin.roles) {
        const role = interaction.guild?.roles.cache.get(roleId);
        if (role) validRoles.push(role);
        else invalidIds.push(roleId);
      }

      // Si hay roles borrados, limpiar DB silenciosamente
      if (invalidIds.length > 0) {
        settings!.autoJoin.roles = settings!.autoJoin.roles.filter(
          (id) => !invalidIds.includes(id),
        );
        await settings!.save();
      }

      const statusEmoji = settings!.autoJoin.enabled ? "🟢" : "🔴";
      const statusText = settings!.autoJoin.enabled ? "ACTIVO" : "INACTIVO";
      const rolesList =
        validRoles.length > 0
          ? validRoles.map((r) => `> 🛡️ ${r}`).join("\n")
          : "> *No hay roles configurados.*";

      const embed = new EmbedBuilder()
        .setTitle("🤖 Configuración de Auto-Join")
        .setDescription(
          "Los roles configurados aquí se otorgarán automáticamente a los usuarios nuevos cuando entren al servidor.",
        )
        .setColor(settings!.autoJoin.enabled ? "#57F287" : "#ED4245")
        .addFields(
          {
            name: "Estado del Sistema",
            value: `\` ${statusEmoji} ${statusText} \``,
            inline: true,
          },
          {
            name: `Roles Asignados (${validRoles.length})`,
            value: rolesList,
            inline: false,
          },
        )
        .setFooter({
          text: "Selecciona roles en el menú de abajo para agregar.",
        });

      // COMPONENTES

      // 1. Selector de Roles (Para AGREGAR)
      const rowAdd =
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId("autojoin_add")
            .setPlaceholder("➕ Seleccionar roles para agregar...")
            .setMinValues(1)
            .setMaxValues(10),
        );

      // 2. Selector de Eliminación (Solo si hay roles)
      const rows: any[] = [rowAdd];

      if (validRoles.length > 0) {
        const rowRemove =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("autojoin_remove")
              .setPlaceholder("➖ Seleccionar roles para quitar...")
              .addOptions(
                validRoles.map((r) => ({
                  label: r.name,
                  value: r.id,
                  emoji: "🗑️",
                })),
              ),
          );
        rows.push(rowRemove);
      }

      // 3. Botón Toggle y Salir
      const rowControls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("autojoin_toggle")
          .setLabel(
            settings!.autoJoin.enabled
              ? "Desactivar Sistema"
              : "Activar Sistema",
          )
          .setStyle(
            settings!.autoJoin.enabled
              ? ButtonStyle.Danger
              : ButtonStyle.Success,
          ),
        new ButtonBuilder()
          .setCustomId("autojoin_close")
          .setLabel("Guardar y Cerrar")
          .setStyle(ButtonStyle.Secondary),
      );
      rows.push(rowControls);

      return { embeds: [embed], components: rows };
    };

    // ENVIAR MENSAJE INICIAL
    const msg = await interaction.editReply(await renderDashboard());

    // COLLECTOR
    const collector = msg.createMessageComponentCollector({ time: 300000 }); // 5 min

    collector.on("collect", async (i) => {
      // A) AGREGAR ROLES
      if (i.customId === "autojoin_add" && i.isRoleSelectMenu()) {
        await i.deferUpdate();
        const selectedIds = i.values;
        const myRolePosition = i.guild?.members.me?.roles.highest.position || 0;
        let addedCount = 0;
        let errorHierarchy = false;

        for (const roleId of selectedIds) {
          const role = i.guild?.roles.cache.get(roleId);
          // Validar Jerarquía y Duplicados
          if (
            role &&
            role.position < myRolePosition &&
            !settings!.autoJoin.roles.includes(roleId) &&
            !role.managed
          ) {
            settings!.autoJoin.roles.push(roleId);
            addedCount++;
          } else if (role && role.position >= myRolePosition) {
            errorHierarchy = true;
          }
        }

        if (addedCount > 0 && !settings!.autoJoin.enabled)
          settings!.autoJoin.enabled = true; // Activar auto si agregamos
        await settings!.save();

        const response = await renderDashboard();
        await i.editReply(response);

        if (errorHierarchy)
          await i.followUp({
            content:
              "⚠️ Algunos roles no se agregaron porque son superiores a mi rol o son de bots.",
            ephemeral: true,
          });
      }

      // B) QUITAR ROLES
      if (i.customId === "autojoin_remove" && i.isStringSelectMenu()) {
        await i.deferUpdate();
        const toRemove = i.values;
        settings!.autoJoin.roles = settings!.autoJoin.roles.filter(
          (id) => !toRemove.includes(id),
        );

        if (settings!.autoJoin.roles.length === 0)
          settings!.autoJoin.enabled = false;
        await settings!.save();

        await i.editReply(await renderDashboard());
      }

      // C) TOGGLE ON/OFF
      if (i.customId === "autojoin_toggle") {
        await i.deferUpdate();
        settings!.autoJoin.enabled = !settings!.autoJoin.enabled;
        await settings!.save();
        await i.editReply(await renderDashboard());
      }

      // D) CERRAR
      if (i.customId === "autojoin_close") {
        await i.update({
          content: "✅ **Configuración guardada.**",
          components: [],
        });
        collector.stop();
      }
    });
  },
};
