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
    .setDescription("Configura el sistema de niveles del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // Ver configuración
    .addSubcommand((s) =>
      s.setName("view").setDescription("Ver toda la configuración actual"),
    )

    // Sistema general
    .addSubcommandGroup((g) =>
      g
        .setName("sistema")
        .setDescription("Configuración general del sistema")
        .addSubcommand((s) =>
          s
            .setName("toggle")
            .setDescription("Activar o desactivar el sistema de niveles")
            .addBooleanOption((o) =>
              o
                .setName("activo")
                .setDescription("true = activado")
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("modo-anuncio")
            .setDescription("Cómo anunciar las subidas de nivel")
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
            .setDescription("Enviar anuncios por DM en vez de canal")
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
            .setDescription("XP base ganada por mensaje")
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
            .setDescription("Tiempo entre ganancias de XP")
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
            .setDescription("Mínimo de caracteres para ganar XP")
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
            .setDescription("Multiplicador global de XP (para eventos)")
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
            .setDescription("XP extra por mencionar a otros")
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
            .setDescription("Activar o desactivar XP por voz")
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
            .setDescription("XP ganada por minuto en voz")
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
            .setDescription("Minutos mínimos en voz para contar")
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
            .setDescription("Canal donde se anuncian las subidas")
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
            .setDescription("Ignorar/des-ignorar un canal")
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
            .setDescription("Ignorar/des-ignorar un rol")
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

    // ==================== VIEW ====================
    if (sub === "view") {
      const announceModeText = {
        all: "Todos los niveles",
        milestone: "Solo niveles importantes",
        silent: "Silencioso",
      }[config.announceMode || "all"];

      const embed = new EmbedBuilder()
        .setColor(0xffb7c5)
        .setTitle("⚙️ Configuración de Niveles")
        .addFields(
          {
            name: "🌟 Sistema",
            value: config.enabled ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          },
          {
            name: "📢 Anuncios",
            value: announceModeText,
            inline: true,
          },
          {
            name: "📨 DM",
            value: config.announceDM ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          },
          {
            name: "💬 XP por mensaje",
            value: `\`${config.xpPerMessage}\` XP • cd: \`${config.xpCooldown}s\` • min: \`${config.xpMinLength}\` chars`,
            inline: false,
          },
          {
            name: "🎁 Bonus menciones",
            value: `\`+${config.xpMentionBonus}\` XP por mención (max \`${config.xpMentionMaxBonus}\`)`,
            inline: true,
          },
          {
            name: "🔢 Multiplicador",
            value: `\`x${config.xpMultiplier}\``,
            inline: true,
          },
          {
            name: "🔊 XP por voz",
            value: config.xpVoiceEnabled
              ? `✅ \`${config.xpPerMinuteVoice}\` XP/min • min: \`${config.xpVoiceMinMinutes}\` min`
              : "❌ Desactivado",
            inline: false,
          },
          {
            name: "📋 Canal de anuncio",
            value: config.announceChannelId
              ? `<#${config.announceChannelId}>`
              : "Canal actual",
            inline: true,
          },
          {
            name: "🚫 Canales ignorados",
            value: config.ignoredChannels.length
              ? config.ignoredChannels.map((c) => `<#${c}>`).join(", ")
              : "Ninguno",
            inline: false,
          },
          {
            name: "🚫 Roles ignorados",
            value: config.ignoredRoles.length
              ? config.ignoredRoles.map((r) => `<@&${r}>`).join(", ")
              : "Ninguno",
            inline: false,
          },
          {
            name: "🤖 Ignorar bots",
            value: config.ignoreBots ? "✅ Sí" : "❌ No",
            inline: true,
          },
          {
            name: "🎖️ Roles por nivel",
            value: config.levelRoles.length
              ? `${config.levelRoles.length} rol(es) configurado(s)`
              : "Ninguno",
            inline: true,
          },
        )
        .setFooter({ text: "Usa /setup-levels sistema para más opciones 🐾" });

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
        return interaction.editReply({
          content: `✅ Sistema de niveles ${activo ? "**activado**" : "**desactivado**"}.`,
        });
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
        return interaction.editReply({
          content: `✅ Modo de anuncio cambiado a: **${modosTexto[modo]}**.`,
        });
      }

      if (sub === "dm") {
        const activo = interaction.options.getBoolean("activo", true);
        await LevelConfig.updateOne(
          { guildId },
          { announceDM: activo },
          { upsert: true },
        );
        return interaction.editReply({
          content: `✅ Anuncios por DM ${activo ? "**activados**" : "**desactivados**"}.`,
        });
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
        return interaction.editReply({
          content: `✅ XP por mensaje establecida a **${cantidad}**.`,
        });
      }

      if (sub === "cooldown") {
        const segundos = interaction.options.getInteger("segundos", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpCooldown: segundos },
          { upsert: true },
        );
        return interaction.editReply({
          content: `✅ Cooldown de XP establecido a **${segundos} segundos**.`,
        });
      }

      if (sub === "min-longitud") {
        const caracteres = interaction.options.getInteger("caracteres", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpMinLength: caracteres },
          { upsert: true },
        );
        return interaction.editReply({
          content: `✅ Mínimo de caracteres establecido a **${caracteres}**.`,
        });
      }

      if (sub === "multiplicador") {
        const valor = interaction.options.getNumber("valor", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpMultiplier: valor },
          { upsert: true },
        );
        return interaction.editReply({
          content: `✅ Multiplicador establecido a **x${valor}**. Útil para eventos especiales~`,
        });
      }

      if (sub === "mencion-bonus") {
        const xp = interaction.options.getInteger("xp", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpMentionBonus: xp, xpMentionMaxBonus: xp * 5 },
          { upsert: true },
        );
        return interaction.editReply({
          content: `✅ Bonus por mención establecido a **+${xp} XP** (máximo ${xp * 5}).`,
        });
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
        return interaction.editReply({
          content: `✅ XP por voz ${activo ? "**activada**" : "**desactivada**"}.`,
        });
      }

      if (sub === "xp-minuto") {
        const cantidad = interaction.options.getInteger("cantidad", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpPerMinuteVoice: cantidad },
          { upsert: true },
        );
        return interaction.editReply({
          content: `✅ XP por minuto en voz establecida a **${cantidad}**.`,
        });
      }

      if (sub === "min-minutos") {
        const minutos = interaction.options.getInteger("minutos", true);
        await LevelConfig.updateOne(
          { guildId },
          { xpVoiceMinMinutes: minutos },
          { upsert: true },
        );
        return interaction.editReply({
          content: `✅ Minutos mínimos en voz establecidos a **${minutos}**.`,
        });
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
        return interaction.editReply({
          content: `✅ Canal de anuncios establecido a <#${channel.id}>.`,
        });
      }

      if (sub === "ignorar") {
        const channel = interaction.options.getChannel("canal", true);
        const already = config.ignoredChannels.includes(channel.id);
        if (already) {
          await LevelConfig.updateOne(
            { guildId },
            { $pull: { ignoredChannels: channel.id } },
          );
          return interaction.editReply({
            content: `✅ <#${channel.id}> ya no está ignorado.`,
          });
        } else {
          await LevelConfig.updateOne(
            { guildId },
            { $push: { ignoredChannels: channel.id } },
          );
          return interaction.editReply({
            content: `✅ <#${channel.id}> ahora está ignorado.`,
          });
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
          return interaction.editReply({
            content: `✅ El rol ${role.name} ya no está ignorado.`,
          });
        } else {
          await LevelConfig.updateOne(
            { guildId },
            { $push: { ignoredRoles: role.id } },
          );
          return interaction.editReply({
            content: `✅ El rol ${role.name} ahora está ignorado.`,
          });
        }
      }
    }
  },
};
