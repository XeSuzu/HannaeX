import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import LevelConfig from "../../../Models/LevelConfig";

export default {
  data: new SlashCommandBuilder()
    .setName("setup-levels")
    .setDescription("⚙️ Configura el sistema de niveles del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // Ver configuración
    .addSubcommand((s) =>
      s.setName("view").setDescription("👁️ Ver toda la configuración actual"),
    )

    // Sistema general
    .addSubcommandGroup((g) =>
      g
        .setName("sistema")
        .setDescription("Configuración general del sistema")
        .addSubcommand((s) =>
          s
            .setName("toggle")
            .setDescription("🔘 Activar o desactivar el sistema de niveles")
            .addBooleanOption((o) =>
              o
                .setName("activo")
                .setDescription("true = activado, false = desactivado")
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("modo-anuncio")
            .setDescription("📢 Cómo anunciar las subidas de nivel")
            .addStringOption((o) =>
              o
                .setName("modo")
                .setDescription("Tipo de anuncio")
                .setRequired(true)
                .addChoices(
                  { name: "Todos los niveles", value: "all" },
                  {
                    name: "Solo niveles importantes (5, 10, 15...)",
                    value: "milestone",
                  },
                  { name: "Silencioso (no anunciar)", value: "silent" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("dm")
            .setDescription("📨 Enviar anuncios por DM en vez de canal")
            .addBooleanOption((o) =>
              o
                .setName("activo")
                .setDescription("Activar anuncios por DM")
                .setRequired(true),
            ),
        ),
    )

    // XP por mensajes
    .addSubcommandGroup((g) =>
      g
        .setName("xp-mensajes")
        .setDescription("Configurar XP por mensajes")
        .addSubcommand((s) =>
          s
            .setName("base")
            .setDescription("💬 XP base ganada por mensaje")
            .addIntegerOption((o) =>
              o
                .setName("cantidad")
                .setDescription("XP por mensaje (5-100)")
                .setMinValue(5)
                .setMaxValue(100)
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("cooldown")
            .setDescription("⏱️ Tiempo entre ganancias de XP")
            .addIntegerOption((o) =>
              o
                .setName("segundos")
                .setDescription("Segundos (10-300)")
                .setMinValue(10)
                .setMaxValue(300)
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("min-longitud")
            .setDescription("📏 Mínimo de caracteres para ganar XP")
            .addIntegerOption((o) =>
              o
                .setName("caracteres")
                .setDescription("Caracteres mínimos (1-50)")
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("multiplicador")
            .setDescription("🎁 Multiplicador global de XP (para eventos)")
            .addNumberOption((o) =>
              o
                .setName("valor")
                .setDescription("Multiplicador (0.5-3.0)")
                .setMinValue(0.5)
                .setMaxValue(3.0)
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("mencion-bonus")
            .setDescription("💭 XP extra por mencionar a otros")
            .addIntegerOption((o) =>
              o
                .setName("xp")
                .setDescription("XP extra por mención (0-20)")
                .setMinValue(0)
                .setMaxValue(20)
                .setRequired(true),
            ),
        ),
    )

    // XP por voz
    .addSubcommandGroup((g) =>
      g
        .setName("xp-voz")
        .setDescription("Configurar XP por tiempo en voz")
        .addSubcommand((s) =>
          s
            .setName("toggle")
            .setDescription("🔊 Activar o desactivar XP por voz")
            .addBooleanOption((o) =>
              o
                .setName("activo")
                .setDescription("Activar XP por voz")
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("xp-minuto")
            .setDescription("⚡ XP ganada por minuto en voz")
            .addIntegerOption((o) =>
              o
                .setName("cantidad")
                .setDescription("XP por minuto (1-50)")
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("min-minutos")
            .setDescription("⏳ Minutos mínimos en voz para contar")
            .addIntegerOption((o) =>
              o
                .setName("minutos")
                .setDescription("Minutos mínimos (1-10)")
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(true),
            ),
        ),
    )

    // Canales y roles
    .addSubcommandGroup((g) =>
      g
        .setName("canales")
        .setDescription("Gestionar canales")
        .addSubcommand((s) =>
          s
            .setName("anuncio")
            .setDescription("📢 Canal donde se anuncian las subidas")
            .addChannelOption((o) =>
              o
                .setName("canal")
                .setDescription("Canal de texto")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("ignorar")
            .setDescription("🚫 Ignorar/des-ignorar un canal")
            .addChannelOption((o) =>
              o
                .setName("canal")
                .setDescription("Canal a ignorar")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("ignorar-rol")
            .setDescription("🚫 Ignorar/des-ignorar un rol")
            .addRoleOption((o) =>
              o
                .setName("rol")
                .setDescription("Rol a ignorar")
                .setRequired(true),
            ),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    let config = await LevelConfig.findOne({ guildId });
    if (!config) config = await LevelConfig.create({ guildId });

    // Defer para dar tiempo a procesar
    await interaction.deferReply();

    // ==================== VIEW ====================
    if (sub === "view") {
      const announceModeText = {
        all: "Todos los niveles",
        milestone: "Solo niveles importantes",
        silent: "Silencioso",
      }[config.announceMode || "milestone"];

      const systemStatus = config.enabled
        ? "🟢 **Activado**"
        : "🔴 **Desactivado**";
      const voiceStatus = config.xpVoiceEnabled
        ? "🟢 Activado"
        : "🔴 Desactivado";
      const dmStatus = config.announceDM ? "🟢 Activado" : "🔴 Desactivado";
      const botsStatus = config.ignoreBots ? "🟢 Ignorados" : "🔴 Contados";

      const embed = new EmbedBuilder()
        .setColor(config.enabled ? 0x51cf66 : 0xff6b6b)
        .setTitle("⚙️ Configuración de Niveles")
        .setDescription(
          `Estado del sistema: **${systemStatus}**\n` +
            (config.enabled
              ? "💡 Los usuarios están ganando XP activamente"
              : "⚠️ Usa `/setup-levels sistema toggle activo:true` para activar"),
        )
        .addFields(
          {
            name: "📢 Anuncios",
            value: announceModeText,
            inline: true,
          },
          {
            name: "📨 DM",
            value: dmStatus,
            inline: true,
          },
          {
            name: "💬 XP por mensaje",
            value:
              `\`${config.xpPerMessage}\` XP\n` +
              `cd: \`${config.xpCooldown}s\`\n` +
              `min: \`${config.xpMinLength}\` chars`,
            inline: true,
          },
          {
            name: "🎁 Bonus",
            value:
              `+${config.xpMentionBonus} XP/mención\n` +
              `max: ${config.xpMentionMaxBonus} XP\n` +
              `mult: x${config.xpMultiplier}`,
            inline: true,
          },
          {
            name: "🔊 XP por voz",
            value:
              voiceStatus +
              "\n" +
              (config.xpVoiceEnabled
                ? `\`${config.xpPerMinuteVoice}\` XP/min\nmin: \`${config.xpVoiceMinMinutes}\` min`
                : ""),
            inline: true,
          },
          {
            name: "🤖 Bots",
            value: botsStatus,
            inline: true,
          },
        );

      // Canal de anuncio
      if (config.announceChannelId) {
        embed.addFields({
          name: "📢 Canal de anuncio",
          value: `<#${config.announceChannelId}>`,
          inline: false,
        });
      }

      // Canales ignorados
      if (config.ignoredChannels.length > 0) {
        embed.addFields({
          name: "🚫 Canales ignorados",
          value: config.ignoredChannels.map((c) => `<#${c}>`).join(", "),
          inline: false,
        });
      }

      // Roles ignorados
      if (config.ignoredRoles.length > 0) {
        embed.addFields({
          name: "🚫 Roles ignorados",
          value: config.ignoredRoles.map((r) => `<@&${r}>`).join(", "),
          inline: false,
        });
      }

      // Roles por nivel
      const levelRolesCount = config.levelRoles.length;
      embed.addFields({
        name: "🎖️ Roles por nivel",
        value:
          levelRolesCount > 0
            ? `${levelRolesCount} rol(es) configurado(s)\nUsa \`/level-roles list\` para verlos`
            : "Ninguno configurado",
        inline: true,
      });

      embed.setFooter({ text: "Hoshiko Levels 🌸" }).setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ==================== SISTEMA ====================
    if (subcommandGroup === "sistema") {
      if (sub === "toggle") {
        const activo = interaction.options.getBoolean("activo", true);
        await LevelConfig.updateOne(
          { guildId },
          { enabled: activo },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(activo ? 0x51cf66 : 0xff6b6b)
          .setTitle(activo ? "✅ Sistema activado" : "🔴 Sistema desactivado")
          .setDescription(
            activo
              ? "El sistema de niveles está ahora **activo**. Los usuarios empezarán a ganar XP."
              : "El sistema de niveles está ahora **desactivado**. Los usuarios no ganarán XP.",
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "modo-anuncio") {
        const modo = interaction.options.getString("modo", true) as
          | "all"
          | "milestone"
          | "silent";
        await LevelConfig.updateOne(
          { guildId },
          { announceMode: modo },
          { upsert: true },
        );

        const modosTexto: Record<string, string> = {
          all: "todos los niveles",
          milestone: "solo niveles importantes (5, 10, 15...)",
          silent: "silencioso (no se anuncia)",
        };

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("📢 Modo de anuncio actualizado")
          .setDescription(`Modo establecido: **${modosTexto[modo]}**`)
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "dm") {
        const activo = interaction.options.getBoolean("activo", true);
        await LevelConfig.updateOne(
          { guildId },
          { announceDM: activo },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(activo ? 0x51cf66 : 0xff6b6b)
          .setTitle(activo ? "📨 DM activados" : "📨 DM desactivados")
          .setDescription(
            activo
              ? "Los anuncios de nivel se enviarán por **DM** al usuario."
              : "Los anuncios de nivel se enviarán al **canal** configurado.",
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ==================== XP MENSAJES ====================
    if (subcommandGroup === "xp-mensajes") {
      if (sub === "base") {
        const cantidad = interaction.options.getInteger("cantidad", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpPerMessage: cantidad },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("💬 XP por mensaje actualizada")
          .setDescription(`Establecida a **${cantidad} XP** por mensaje`)
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "cooldown") {
        const segundos = interaction.options.getInteger("segundos", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpCooldown: segundos },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("⏱️ Cooldown actualizado")
          .setDescription(
            `Tiempo entre ganancias establecido a **${segundos} segundos**`,
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "min-longitud") {
        const caracteres = interaction.options.getInteger("caracteres", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpMinLength: caracteres },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("📏 Longitud mínima actualizada")
          .setDescription(
            `Mínimo de caracteres establecido a **${caracteres}**`,
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "multiplicador") {
        const valor = interaction.options.getNumber("valor", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpMultiplier: valor },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("🎁 Multiplicador actualizado")
          .setDescription(
            `Multiplicador establecido a **x${valor}**\n` +
              `💡 Útil para eventos especiales~`,
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "mencion-bonus") {
        const xp = interaction.options.getInteger("xp", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpMentionBonus: xp, xpMentionMaxBonus: xp * 5 },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("💭 Bonus por mención actualizado")
          .setDescription(
            `Bonus establecido a **+${xp} XP** por mención\n` +
              `Máximo: **${xp * 5} XP** por mensaje`,
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ==================== XP VOZ ====================
    if (subcommandGroup === "xp-voz") {
      if (sub === "toggle") {
        const activo = interaction.options.getBoolean("activo", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpVoiceEnabled: activo },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(activo ? 0x51cf66 : 0xff6b6b)
          .setTitle(
            activo ? "🔊 XP por voz activada" : "🔇 XP por voz desactivada",
          )
          .setDescription(
            activo
              ? "Los usuarios ahora ganan XP por tiempo en canales de voz."
              : "Los usuarios ya no ganarán XP por tiempo en voz.",
          )
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "xp-minuto") {
        const cantidad = interaction.options.getInteger("cantidad", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpPerMinuteVoice: cantidad },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("⚡ XP por minuto actualizada")
          .setDescription(`Establecida a **${cantidad} XP** por minuto en voz`)
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "min-minutos") {
        const minutos = interaction.options.getInteger("minutos", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpVoiceMinMinutes: minutos },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0xffb7c5)
          .setTitle("⏳ Minutos mínimos actualizados")
          .setDescription(`Establecido a **${minutos} minutos**`)
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ==================== CANALES ====================
    if (subcommandGroup === "canales") {
      if (sub === "anuncio") {
        const channel = interaction.options.getChannel("canal", true);
        await LevelConfig.updateOne(
          { guildId },
          { announceChannelId: channel.id },
          { upsert: true },
        );

        const embed = new EmbedBuilder()
          .setColor(0x51cf66)
          .setTitle("📢 Canal de anuncio establecido")
          .setDescription(`Anuncios de nivel se enviarán a <#${channel.id}>`)
          .setFooter({ text: "Hoshiko Levels 🌸" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "ignorar") {
        const channel = interaction.options.getChannel("canal", true);
        const already = config.ignoredChannels.includes(channel.id);
        if (already) {
          await LevelConfig.updateOne(
            { guildId },
            { $pull: { ignoredChannels: channel.id } },
          );

          const embed = new EmbedBuilder()
            .setColor(0x51cf66)
            .setTitle("✅ Canal des-ignorado")
            .setDescription(
              `<#${channel.id}> ya no está ignorado y los mensajes cuentan para XP.`,
            )
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        } else {
          await LevelConfig.updateOne(
            { guildId },
            { $addToSet: { ignoredChannels: channel.id } },
            { upsert: true },
          );

          const embed = new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🚫 Canal ignorado")
            .setDescription(
              `<#${channel.id}> ahora está ignorado y los mensajes **no** cuentan para XP.`,
            )
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }
      }

      if (sub === "ignorar-rol") {
        const role = interaction.options.getRole("rol", true);
        const already = config.ignoredRoles.includes(role.id);
        if (already) {
          await LevelConfig.updateOne(
            { guildId },
            { $pull: { ignoredRoles: role.id } },
          );

          const embed = new EmbedBuilder()
            .setColor(0x51cf66)
            .setTitle("✅ Rol des-ignorado")
            .setDescription(`Los usuarios con ${role} ya no están ignorados.`)
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        } else {
          await LevelConfig.updateOne(
            { guildId },
            { $addToSet: { ignoredRoles: role.id } },
            { upsert: true },
          );

          const embed = new EmbedBuilder()
            .setColor(0xffb7c5)
            .setTitle("🚫 Rol ignorado")
            .setDescription(
              `Los usuarios con ${role} ahora están ignorados y no ganan XP.`,
            )
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }
      }
    }
  },
};
