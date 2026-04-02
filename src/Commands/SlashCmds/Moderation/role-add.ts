import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";

export default {
  data: new SlashCommandBuilder()
    .setName("role-add")
    .setDescription("Añade un rol a un usuario")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Usuario al que añadir el rol")
        .setRequired(true),
    )
    .addRoleOption((o) =>
      o.setName("rol").setDescription("Rol a añadir").setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const targetUser = interaction.options.getUser("usuario", true);
    const role = interaction.options.getRole("rol", true);

    const target = await interaction.guild?.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!target) {
      return interaction.editReply({
        content: "❌ No encontré ese usuario en el servidor.",
      });
    }

    // Verificar jerarquía del bot
    const botMember = interaction.guild?.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        content:
          "❌ No puedo gestionar ese rol. Asegúrate de que esté **por debajo** de mi rol más alto.",
      });
    }

    // Verificar jerarquía del ejecutor
    const executorMember = interaction.guild?.members.cache.get(
      interaction.user.id,
    );
    if (
      executorMember &&
      role.position >= executorMember.roles.highest.position
    ) {
      return interaction.editReply({
        content: "❌ No puedes asignar un rol igual o superior al tuyo.",
      });
    }

    // Verificar si ya tiene el rol
    if (target.roles.cache.has(role.id)) {
      return interaction.editReply({
        content: `⚠️ **${target.user.username}** ya tiene el rol <@&${role.id}>.`,
      });
    }

    try {
      await target.roles.add(role.id);

      const embed = new EmbedBuilder()
        .setColor(0xa8d8a8)
        .setTitle("✅ Rol añadido")
        .addFields(
          {
            name: "👤 Usuario",
            value: `<@${target.id}>`,
            inline: true,
          },
          {
            name: "🎭 Rol",
            value: `<@&${role.id}>`,
            inline: true,
          },
        )
        .setFooter({
          text: `Ejecutado por ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      return interaction.editReply({
        content: `❌ No pude añadir el rol: ${err.message ?? "Error desconocido"}`,
      });
    }
  },
};
