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
    .setDescription("Gestiona los roles que se otorgan al subir de nivel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Asignar un rol a un nivel específico")
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
        .setDescription("Quitar la configuración de rol para un nivel")
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
        .setDescription("Ver todos los roles de nivel configurados"),
    )
    .addSubcommand((s) =>
      s
        .setName("give")
        .setDescription(
          "Dar a un usuario todos los roles de nivel que le corresponden",
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

    // ==================== ADD ====================
    if (sub === "add") {
      const level = interaction.options.getInteger("nivel", true);
      const role = interaction.options.getRole("rol", true);
      const customMessage = interaction.options.getString("mensaje");

      // Verificar si el bot puede asignar el rol
      if (role.position >= guild.members.me?.roles.highest.position!) {
        return interaction.editReply({
          content:
            "⚠️ No puedo asignar ese rol. Asegúrate de que esté **por debajo** de mi rol más alto.",
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
        content: `✅ Al alcanzar el nivel **${level}** se asignará el rol ${role}${msgText}.`,
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
          content: `No hay ningún rol configurado para el nivel **${level}**.`,
        });
      }

      const removed = config.levelRoles.splice(existsIndex, 1)[0];
      await config.save();

      return interaction.editReply({
        content: `✅ Rol del nivel **${level}** eliminado.`,
      });
    }

    // ==================== LIST ====================
    if (sub === "list") {
      if (!config.levelRoles.length) {
        return interaction.editReply({
          content:
            "No hay roles de nivel configurados aún. Usa `/level-roles add` para agregar uno~",
        });
      }

      const sorted = [...config.levelRoles].sort((a, b) => a.level - b.level);

      const lines = await Promise.all(
        sorted.map(async (lr) => {
          const role = guild.roles.cache.get(lr.roleId);
          const roleName = role ? role.name : "❌ Rol eliminado";
          const hasMessage = lr.message ? " 📝" : "";
          return `Nivel **${lr.level}** → ${role ? `<@&${lr.roleId}>` : `\`${roleName}\``}${hasMessage}`;
        }),
      );

      const embed = new EmbedBuilder()
        .setColor(0xffb7c5)
        .setTitle("🎖️ Roles por Nivel")
        .setDescription(lines.join("\n"))
        .addFields({
          name: "💡 Tips",
          value:
            "• Usa `/level-roles add nivel:5 rol:@MiRol` para agregar\n• Agrega `mensaje:` para un anuncio personalizado\n• Usa `/level-roles give @usuario` para asignar roles faltantes",
        })
        .setFooter({ text: "Hoshiko Levels 🐾" });

      return interaction.editReply({ embeds: [embed] });
    }

    // ==================== GIVE ====================
    if (sub === "give") {
      const user = interaction.options.getUser("usuario", true);
      const member = await guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return interaction.editReply({
          content: "No encontré a ese usuario en el servidor.",
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
          content: `${user.tag} ya tiene todos los roles de nivel para su nivel actual (${userLevel}).`,
        });
      }

      let given = 0;
      for (const lr of rolesToGive) {
        const role = guild.roles.cache.get(lr.roleId);
        if (role && role.position < guild.members.me?.roles.highest.position!) {
          await member.roles.add(lr.roleId).catch(() => null);
          given++;
        }
      }

      return interaction.editReply({
        content: `✅ Se asignaron **${given}** rol(es) de nivel a ${user.tag} (nivel ${userLevel}).`,
      });
    }
  },
};
