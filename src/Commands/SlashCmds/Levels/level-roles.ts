import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import LevelConfig from "../../../Models/LevelConfig";
import LocalLevel from "../../../Models/LocalLevels";

export default {
  data: new SlashCommandBuilder()
    .setName("level-roles")
    .setDescription("🎖️ Gestiona los roles que se otorgan al subir de nivel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("➕ Asignar un rol a un nivel específico")
        .addIntegerOption((o) =>
          o
            .setName("nivel")
            .setDescription("Nivel requerido para obtener el rol")
            .setRequired(true)
            .setMinValue(1),
        )
        .addRoleOption((o) =>
          o
            .setName("rol")
            .setDescription("Rol que se dará al alcanzar el nivel")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("mensaje")
            .setDescription(
              "Mensaje personalizado al obtener el rol (opcional)",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("➖ Quitar la configuración de rol para un nivel")
        .addIntegerOption((o) =>
          o
            .setName("nivel")
            .setDescription("Nivel a remover")
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("list")
        .setDescription("📋 Ver todos los roles de nivel configurados"),
    )
    .addSubcommand((s) =>
      s
        .setName("give")
        .setDescription(
          "🎁 Dar a un usuario todos los roles de nivel que le corresponden",
        )
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Usuario").setRequired(true),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const guild = interaction.guild!;

    let config = await LevelConfig.findOne({ guildId });
    if (!config) config = await LevelConfig.create({ guildId });

    // Defer para dar tiempo a procesar
    await interaction.deferReply();

    // ==================== ADD ====================
    if (sub === "add") {
      const level = interaction.options.getInteger("nivel", true);
      const role = interaction.options.getRole("rol", true);
      const customMessage = interaction.options.getString("mensaje");

      // Verificar si el bot puede asignar el rol
      if (role.position >= guild.members.me?.roles.highest.position!) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b6b)
              .setTitle("⚠️ Permisos insuficientes")
              .setDescription(
                "No puedo asignar ese rol. Asegúrate de que esté **por debajo** de mi rol más alto.",
              )
              .setFooter({ text: "Hoshiko Levels 🌸" }),
          ],
        });
      }

      // Verificar si ya existe
      const existsIndex = config.levelRoles.findIndex(
        (lr) => lr.level === level,
      );

      const roleData = {
        level,
        roleId: role.id,
        message: customMessage || null,
      };

      if (existsIndex >= 0) {
        config.levelRoles[existsIndex] = roleData;
      } else {
        config.levelRoles.push(roleData);
      }

      await config.save();

      const msgText = customMessage
        ? `\n📝 Mensaje personalizado: \`${customMessage}\``
        : "";

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x51cf66)
            .setTitle("✅ Rol configurado")
            .setDescription(
              `Al alcanzar el nivel **${level}** se asignará el rol ${role}${msgText}`,
            )
            .addFields({
              name: "💡 Tip",
              value:
                "Usa `/level-roles give @usuario` para asignar roles faltantes a un usuario.",
              inline: false,
            })
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp(),
        ],
      });
    }

    // ==================== REMOVE ====================
    if (sub === "remove") {
      const level = interaction.options.getInteger("nivel", true);
      const existsIndex = config.levelRoles.findIndex(
        (lr) => lr.level === level,
      );

      if (existsIndex < 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffb7c5)
              .setTitle("ℹ️ Sin configuración")
              .setDescription(
                `No hay ningún rol configurado para el nivel **${level}**.`,
              )
              .setFooter({ text: "Hoshiko Levels 🌸" }),
          ],
        });
      }

      const removed = config.levelRoles.splice(existsIndex, 1)[0];
      await config.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x51cf66)
            .setTitle("✅ Rol eliminado")
            .setDescription(
              `La configuración del rol para el nivel **${level}** ha sido eliminada.`,
            )
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp(),
        ],
      });
    }

    // ==================== LIST ====================
    if (sub === "list") {
      if (!config.levelRoles.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffb7c5)
              .setTitle("🎖️ Roles por Nivel")
              .setDescription(
                "No hay roles de nivel configurados aún.\n\n" +
                  "💡 Usa `/level-roles add nivel:5 rol:@MiRol` para agregar uno~",
              )
              .setFooter({ text: "Hoshiko Levels 🌸" })
              .setTimestamp(),
          ],
        });
      }

      const sorted = [...config.levelRoles].sort((a, b) => a.level - b.level);

      const lines = await Promise.all(
        sorted.map(async (lr) => {
          const role = guild.roles.cache.get(lr.roleId);
          const roleName = role ? role.name : "❌ Rol eliminado";
          const hasMessage = lr.message ? " 📝" : "";
          return `**Nivel ${lr.level}** → ${role ? `<@&${lr.roleId}>` : `\`${roleName}\``}${hasMessage}`;
        }),
      );

      const embed = new EmbedBuilder()
        .setColor(0xffb7c5)
        .setTitle("🎖️ Roles por Nivel")
        .setDescription(lines.join("\n"))
        .addFields({
          name: "📋 Resumen",
          value: `Total: **${config.levelRoles.length}** rol(es) configurado(s)`,
          inline: false,
        })
        .addFields({
          name: "💡 Tips",
          value:
            "• Usa `/level-roles add nivel:5 rol:@MiRol` para agregar\n" +
            "• Agrega `mensaje:` para un anuncio personalizado\n" +
            "• Usa `/level-roles give @usuario` para asignar roles faltantes",
          inline: false,
        })
        .setFooter({ text: "Hoshiko Levels 🌸" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ==================== GIVE ====================
    if (sub === "give") {
      const user = interaction.options.getUser("usuario", true);
      const member = await guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b6b)
              .setTitle("❌ Usuario no encontrado")
              .setDescription("No encontré a ese usuario en el servidor.")
              .setFooter({ text: "Hoshiko Levels 🌸" }),
          ],
        });
      }

      // Obtener nivel del usuario
      const profile = await LocalLevel.findOne({
        userId: user.id,
        guildId,
      });

      const userLevel = profile?.level ?? 0;

      // Roles que debería tener según su nivel
      const rolesToGive = config.levelRoles.filter(
        (lr) => lr.level <= userLevel && !member.roles.cache.has(lr.roleId),
      );

      if (!rolesToGive.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffb7c5)
              .setTitle("ℹ️ Sin roles pendientes")
              .setDescription(
                `${user.tag} ya tiene todos los roles de nivel para su nivel actual (${userLevel}).`,
              )
              .setFooter({ text: "Hoshiko Levels 🌸" })
              .setTimestamp(),
          ],
        });
      }

      let given = 0;
      const failedRoles: string[] = [];

      for (const lr of rolesToGive) {
        const role = guild.roles.cache.get(lr.roleId);
        if (role && role.position < guild.members.me?.roles.highest.position!) {
          await member.roles.add(lr.roleId).catch(() => null);
          given++;
        } else {
          failedRoles.push(role?.name || lr.roleId);
        }
      }

      const failedText =
        failedRoles.length > 0
          ? `\n⚠️ No pude asignar: ${failedRoles.join(", ")}`
          : "";

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x51cf66)
            .setTitle("✅ Roles asignados")
            .setDescription(
              `Se asignaron **${given}** rol(es) de nivel a ${user.tag} (nivel ${userLevel}).${failedText}`,
            )
            .setFooter({ text: "Hoshiko Levels 🌸" })
            .setTimestamp(),
        ],
      });
    }
  },
};
