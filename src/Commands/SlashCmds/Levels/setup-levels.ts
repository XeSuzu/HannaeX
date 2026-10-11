import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import LevelConfig from "../../../Models/LevelConfig";
import { handleView } from "./setup-levels/viewFlow";
import { handleSystem } from "./setup-levels/systemFlow";
import { handleMessageXp } from "./setup-levels/messageXpFlow";
import { handleVoiceXp } from "./setup-levels/voiceXpFlow";
import { handleChannels } from "./setup-levels/channelsFlow";

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
            .setName("anuncio-limpiar")
            .setDescription("❌ Eliminar canal de anuncios de nivel"),
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

    if (sub === "view") return handleView(interaction, sub, config);
    if (subcommandGroup === "sistema") {
      return handleSystem(interaction, guildId, sub);
    }
    if (subcommandGroup === "xp-mensajes") {
      return handleMessageXp(interaction, guildId, sub);
    }
    if (subcommandGroup === "xp-voz") {
      return handleVoiceXp(interaction, guildId, sub);
    }
    if (subcommandGroup === "canales") {
      return handleChannels(interaction, guildId, sub, config);
    }
  },
};
