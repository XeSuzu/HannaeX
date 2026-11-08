import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  Message,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { AutomodManager } from "../../../Features/AutomodManager";
import { AutoModSyncService } from "../../../Features/automod/AutoModSyncService";

const command: SlashCommand = {
  category: "Moderation",
  aliases: ["automod-setup", "automod"],
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
              { name: "Anti-Spam", value: "antiSpam" },
              { name: "Anti-Links", value: "antiLinks" },
              { name: "Filtro de Palabras", value: "wordFilter" },
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
    )
    // Canales exentos (para alianzas, plantillas, etc.)
    .addSubcommand((sub) =>
      sub
        .setName("canal-exento")
        .setDescription("Añade o quita un canal de la lista de exclusión del automod, anti-links y anti-spam.")
        .addChannelOption((opt) =>
          opt.setName("canal").setDescription("Canal a eximir o incluir (ej. #alianzas, #plantillas).").setRequired(true)
        )
        .addBooleanOption((opt) =>
          opt.setName("agregar").setDescription("true = excluir canal (permitir links/spam/plantillas), false = quitar exclusión.").setRequired(true)
        )
    )

    // Roles exentos (para miembros de alianzas, VIPs, staff, etc.)
    .addSubcommand((sub) =>
      sub
        .setName("rol-exento")
        .setDescription("Añade o quita un rol de la lista de exclusión del automod, anti-links y anti-spam.")
        .addRoleOption((opt) =>
          opt.setName("rol").setDescription("Rol a eximir o incluir (ej. @Alianzas, @Staff).").setRequired(true)
        )
        .addBooleanOption((opt) =>
          opt.setName("agregar").setDescription("true = excluir rol (permitir links/spam/plantillas), false = quitar exclusión.").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("sync")
        .setDescription("Sincroniza las reglas de seguridad con el AutoMod nativo de Discord.")
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
          const exemptChannels =
            config.exemptChannels && config.exemptChannels.length > 0
              ? config.exemptChannels.map((id) => `<#${id}>`).join(", ")
              : "Ninguno";
          const exemptRoles =
            config.exemptRoles && config.exemptRoles.length > 0
              ? config.exemptRoles.map((id) => `<@&${id}>`).join(", ")
              : "Ninguno";

          const embed = new EmbedBuilder()
            .setTitle("⚙️ Configuración del Automod")
            .setColor(0xeba6d1)
            .addFields(
              {
                name: "🛡️ Módulos",
                value: [
                  `Anti-Spam: ${mods.antiSpam ? "✅" : "❌"}`,
                  `Anti-Links: ${mods.antiLinks ? "✅" : "❌"}`,
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
              { name: "📍 Canales Exentos (Anti-Links / Automod)", value: exemptChannels, inline: false },
              { name: "🎭 Roles Exentos (Anti-Links / Automod)", value: exemptRoles, inline: false },
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case "modulo": {
          const nombre = interaction.options.getString("nombre", true);
          const activo = interaction.options.getBoolean("activo", true);

          await SettingsManager.updateSettings(guildId, {
            [`securityModules.${nombre}`]: activo,
          } as any);

          void AutoModSyncService.syncGuildAutoMod(interaction.guild, client);

          await interaction.editReply(
            `${activo ? "✅" : "❌"} Módulo **${nombre}** ${activo ? "activado" : "desactivado"}. Reglas de Discord sincronizadas.`
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
          void AutoModSyncService.syncGuildAutoMod(interaction.guild, client);
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
          void AutoModSyncService.syncGuildAutoMod(interaction.guild, client);
          await interaction.editReply(`✅ **${dominio}** eliminado de la whitelist.`);
          break;
        }

        case "sync": {
          const syncRes = await AutoModSyncService.syncGuildAutoMod(interaction.guild, client);
          if (!syncRes.success) {
            await interaction.editReply(`❌ No se pudieron sincronizar las reglas: ${syncRes.error}`);
            break;
          }

          const embed = new EmbedBuilder()
            .setTitle("🛡️ Sincronización de AutoMod Nativo")
            .setColor(0x51cf66)
            .setDescription(
              "Las reglas de seguridad se han sincronizado exitosamente con el sistema oficial de AutoMod de Discord."
            )
            .addFields(
              { name: "✨ Reglas creadas", value: `${syncRes.rulesCreated}`, inline: true },
              { name: "🔄 Reglas actualizadas", value: `${syncRes.rulesUpdated}`, inline: true },
              { name: "🛡️ Total reglas de Hoshiko", value: `${syncRes.rulesTotal}`, inline: true }
            )
            .setFooter({ text: "Las reglas nativas de Discord actúan a 0 ms antes de enviar el mensaje." })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
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
          await SettingsManager.updateSettings(guildId, {
            "securityModules.aiMode": modo,
          } as any);

          await interaction.editReply(
            `🧠 Modo de IA de moderación establecido en **${modo.toUpperCase()}** (${modo === "shadow" ? "audita en logs sin sanciones directas" : "aplica sanciones"}).`
          );
          break;
        }

        case "canal-exento": {
          const canal = interaction.options.getChannel("canal", true);
          const agregar = interaction.options.getBoolean("agregar", true);
          const currentExempt = config.exemptChannels || [];

          let updated: string[];
          if (agregar) {
            if (currentExempt.includes(canal.id)) {
              await interaction.editReply(`ℹ️ El canal <#${canal.id}> ya estaba en la lista de exentos.`);
              break;
            }
            updated = [...currentExempt, canal.id];
          } else {
            if (!currentExempt.includes(canal.id)) {
              await interaction.editReply(`❌ El canal <#${canal.id}> no estaba en la lista de exentos.`);
              break;
            }
            updated = currentExempt.filter((id) => id !== canal.id);
          }

          await SettingsManager.updateSettings(guildId, { exemptChannels: updated });
          void AutoModSyncService.syncGuildAutoMod(interaction.guild, client);

          await interaction.editReply(
            agregar
              ? `✅ Canal <#${canal.id}> marcado como **exento** de automod, anti-links y anti-spam (ideal para alianzas, plantillas y arte). Reglas de Discord sincronizadas.`
              : `✅ Canal <#${canal.id}> removido de la lista de exentos. Ahora vuelve a estar protegido por automod.`
          );
          break;
        }

        case "rol-exento": {
          const rol = interaction.options.getRole("rol", true);
          const agregar = interaction.options.getBoolean("agregar", true);
          const currentExempt = config.exemptRoles || [];

          let updated: string[];
          if (agregar) {
            if (currentExempt.includes(rol.id)) {
              await interaction.editReply(`ℹ️ El rol <@&${rol.id}> ya estaba en la lista de exentos.`);
              break;
            }
            updated = [...currentExempt, rol.id];
          } else {
            if (!currentExempt.includes(rol.id)) {
              await interaction.editReply(`❌ El rol <@&${rol.id}> no estaba en la lista de exentos.`);
              break;
            }
            updated = currentExempt.filter((id) => id !== rol.id);
          }

          await SettingsManager.updateSettings(guildId, { exemptRoles: updated });
          void AutoModSyncService.syncGuildAutoMod(interaction.guild, client);

          await interaction.editReply(
            agregar
              ? `✅ Rol <@&${rol.id}> marcado como **exento** de automod, anti-links y anti-spam (alianzas y plantillas permitidas). Reglas de Discord sincronizadas.`
              : `✅ Rol <@&${rol.id}> removido de la lista de exentos.`
          );
          break;
        }
      }
    } catch (error) {
      console.error("❌ Error en /setup-automod:", error);
      await interaction.editReply("😿 Hubo un error al procesar la configuración.");
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    if (
      !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
      !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      await message.reply("⛔ Necesitas el permiso de **Gestionar Servidor** o **Administrador** para usar este comando.");
      return;
    }

    const sub = (args[0] || "view").toLowerCase();
    if (sub === "sync") {
      const syncRes = await AutoModSyncService.syncGuildAutoMod(message.guild, client);
      if (!syncRes.success) {
        await message.reply(`❌ No se pudieron sincronizar las reglas: ${syncRes.error}`);
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Sincronización de AutoMod Nativo")
        .setColor(0x51cf66)
        .setDescription(
          "Las reglas de seguridad se han sincronizado exitosamente con el sistema oficial de AutoMod de Discord."
        )
        .addFields(
          { name: "✨ Reglas creadas", value: `${syncRes.rulesCreated}`, inline: true },
          { name: "🔄 Reglas actualizadas", value: `${syncRes.rulesUpdated}`, inline: true },
          { name: "🛡️ Total reglas de Hoshiko", value: `${syncRes.rulesTotal}`, inline: true }
        )
        .setFooter({ text: "Las reglas nativas de Discord actúan a 0 ms antes de enviar el mensaje." })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      return;
    }

    const config = await SettingsManager.getSettings(message.guild.id);

    if (sub === "canal" || sub === "channel") {
      const action = (args[1] || "").toLowerCase();
      const targetChannel =
        message.mentions.channels.first() ||
        (args[2] ? message.guild.channels.cache.get(args[2].replace(/[<#>]/g, "")) : null) ||
        (args[2] ? message.guild.channels.cache.find((c) => c.name.toLowerCase() === args[2].toLowerCase()) : null);

      if (!["add", "remove", "quitar", "list"].includes(action) || (!targetChannel && action !== "list")) {
        await message.reply("ℹ️ Uso: `hoshi automod canal add #canal` o `hoshi automod canal remove #canal` o `hoshi automod canal list`");
        return;
      }

      const currentExempt = config.exemptChannels || [];

      if (action === "list") {
        const listStr = currentExempt.length > 0 ? currentExempt.map((id) => `<#${id}>`).join(", ") : "Ninguno";
        await message.reply(`📍 **Canales exentos de automod:** ${listStr}`);
        return;
      }

      if (!targetChannel) return;

      if (action === "add") {
        if (currentExempt.includes(targetChannel.id)) {
          await message.reply(`ℹ️ El canal <#${targetChannel.id}> ya estaba en la lista de exentos.`);
          return;
        }
        const updated = [...currentExempt, targetChannel.id];
        await SettingsManager.updateSettings(message.guild.id, { exemptChannels: updated });
        void AutoModSyncService.syncGuildAutoMod(message.guild, client);
        await message.reply(`✅ Canal <#${targetChannel.id}> marcado como **exento** de automod y anti-links. Reglas sincronizadas.`);
        return;
      } else {
        if (!currentExempt.includes(targetChannel.id)) {
          await message.reply(`❌ El canal <#${targetChannel.id}> no estaba en la lista de exentos.`);
          return;
        }
        const updated = currentExempt.filter((id) => id !== targetChannel.id);
        await SettingsManager.updateSettings(message.guild.id, { exemptChannels: updated });
        void AutoModSyncService.syncGuildAutoMod(message.guild, client);
        await message.reply(`✅ Canal <#${targetChannel.id}> removido de la lista de exentos.`);
        return;
      }
    }

    if (sub === "rol" || sub === "role") {
      const action = (args[1] || "").toLowerCase();
      const targetRole =
        message.mentions.roles.first() ||
        (args[2] ? message.guild.roles.cache.get(args[2].replace(/[<@&>]/g, "")) : null) ||
        (args[2] ? message.guild.roles.cache.find((r) => r.name.toLowerCase() === args.slice(2).join(" ").toLowerCase()) : null);

      if (!["add", "remove", "quitar", "list"].includes(action) || (!targetRole && action !== "list")) {
        await message.reply("ℹ️ Uso: `hoshi automod rol add @rol` o `hoshi automod rol remove @rol` o `hoshi automod rol list`");
        return;
      }

      const currentExempt = config.exemptRoles || [];

      if (action === "list") {
        const listStr = currentExempt.length > 0 ? currentExempt.map((id) => `<@&${id}>`).join(", ") : "Ninguno";
        await message.reply(`🎭 **Roles exentos de automod:** ${listStr}`);
        return;
      }

      if (!targetRole) return;

      if (action === "add") {
        if (currentExempt.includes(targetRole.id)) {
          await message.reply(`ℹ️ El rol <@&${targetRole.id}> ya estaba en la lista de exentos.`);
          return;
        }
        const updated = [...currentExempt, targetRole.id];
        await SettingsManager.updateSettings(message.guild.id, { exemptRoles: updated });
        void AutoModSyncService.syncGuildAutoMod(message.guild, client);
        await message.reply(`✅ Rol <@&${targetRole.id}> marcado como **exento** de automod y anti-links. Reglas sincronizadas.`);
        return;
      } else {
        if (!currentExempt.includes(targetRole.id)) {
          await message.reply(`❌ El rol <@&${targetRole.id}> no estaba en la lista de exentos.`);
          return;
        }
        const updated = currentExempt.filter((id) => id !== targetRole.id);
        await SettingsManager.updateSettings(message.guild.id, { exemptRoles: updated });
        void AutoModSyncService.syncGuildAutoMod(message.guild, client);
        await message.reply(`✅ Rol <@&${targetRole.id}> removido de la lista de exentos.`);
        return;
      }
    }

    const mods = config.securityModules || ({} as any);
    const links = config.allowedLinks?.join(", ") || "Ninguno";
    const exemptChannels =
      config.exemptChannels && config.exemptChannels.length > 0
        ? config.exemptChannels.map((id) => `<#${id}>`).join(", ")
        : "Ninguno";
    const exemptRoles =
      config.exemptRoles && config.exemptRoles.length > 0
        ? config.exemptRoles.map((id) => `<@&${id}>`).join(", ")
        : "Ninguno";

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Configuración del Automod")
      .setColor(0xeba6d1)
      .addFields(
        {
          name: "🛡️ Módulos",
          value: [
            `Anti-Spam: ${mods.antiSpam ? "✅" : "❌"}`,
            `Anti-Links: ${mods.antiLinks ? "✅" : "❌"}`,
            `Filtro de Palabras: ${mods.wordFilter ? "✅" : "❌"}`,
            `IA Moderación: ${mods.aiModeration ? "✅" : "❌"} (${mods.aiMode || "shadow"})`,
          ].join("\n"),
          inline: true,
        },
        {
          name: "ℹ️ Sincronización",
          value: "Usa `hoshi automod sync` o `/setup-automod sync` para sincronizar con Discord.",
          inline: true,
        },
        { name: "🔗 Links Permitidos", value: links, inline: false },
        { name: "📍 Canales Exentos", value: exemptChannels, inline: false },
        { name: "🎭 Roles Exentos", value: exemptRoles, inline: false },
      )
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
};

export default command;