import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";

interface RoleResult {
  id: string;
  success: boolean;
  error?: string;
}

export default {
  data: new SlashCommandBuilder()
    .setName("mass-role-add")
    .setDescription("Añade un rol a múltiples usuarios")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption((o) =>
      o.setName("rol").setDescription("Rol a añadir").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("usuarios")
        .setDescription("Menciones o IDs separados por espacio o coma")
        .setRequired(true),
    )
    .addRoleOption((o) =>
      o
        .setName("rol-remover")
        .setDescription("Rol a remover al añadir (opcional)")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const role = interaction.options.getRole("rol", true);
    const usersArg = interaction.options.getString("usuarios", true);
    const roleToRemove = interaction.options.getRole("rol-remover");

    // Verificar que el bot pueda gestionar el rol
    const botMember = interaction.guild?.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        content:
          "❌ No puedo gestionar ese rol. Asegúrate de que esté **por debajo** de mi rol más alto.",
      });
    }

    const members = usersArg
      .split(/[\s,]+/)
      .map((s) => s.replace(/[<@!>]/g, "").trim())
      .filter((s) => /^\d+$/.test(s));

    if (!members.length) {
      return interaction.editReply({
        content:
          "❌ No encontré usuarios válidos. Usa menciones o IDs separados por espacio o coma.",
      });
    }

    if (members.length > 100) {
      return interaction.editReply({
        content: "❌ Máximo 100 usuarios a la vez.",
      });
    }

    const loadingMsg = await interaction.editReply({
      content: `⏳ Añadiendo el rol **${role.name}** a **${members.length}** usuario(s)...`,
    });

    // Procesamiento paralelo
    const rolePromises = members.map(async (memberId): Promise<RoleResult> => {
      try {
        const member = await interaction.guild?.members
          .fetch(memberId)
          .catch(() => null);

        if (!member) {
          return { id: memberId, success: false, error: "No encontrado" };
        }

        if (member.roles.cache.has(role.id)) {
          return { id: memberId, success: false, error: "Ya tiene el rol" };
        }

        // Remover rol antiguo si se especifica
        if (roleToRemove && member.roles.cache.has(roleToRemove.id)) {
          await member.roles.remove(roleToRemove.id).catch(() => null);
        }

        await member.roles.add(role.id);
        return { id: memberId, success: true };
      } catch (err: any) {
        return { id: memberId, success: false, error: err.message || "Error" };
      }
    });

    const results = await Promise.all(rolePromises);

    const success = results.filter((r) => r.success);
    const skipped = results.filter(
      (r) => !r.success && r.error === "Ya tiene el rol",
    );
    const failed = results.filter(
      (r) => !r.success && r.error !== "Ya tiene el rol",
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(`🔧 MassRole Add - ${role.name}`)
      .setDescription(`Proceso completado para **${members.length}** usuarios`)
      .addFields(
        {
          name: "📊 Estadísticas",
          value: `\`\`\`
✅ Añadidos: ${success.length}
⏭️ Ya tenían rol: ${skipped.length}
❌ Fallidos: ${failed.length}
\`\`\``,
          inline: false,
        },
        {
          name: "🎭 Rol añadido",
          value: `<@&${role.id}>`,
          inline: true,
        },
      );

    if (roleToRemove) {
      embed.addFields({
        name: "🔄 Rol removido",
        value: `<@&${roleToRemove.id}>`,
        inline: true,
      });
    }

    // Lista de añadidos (máx 25)
    if (success.length > 0 && success.length <= 25) {
      embed.addFields({
        name: `✅ Añadidos (${success.length})`,
        value: success.map((r) => `<@${r.id}>`).join(" "),
        inline: false,
      });
    } else if (success.length > 25) {
      embed.addFields({
        name: `✅ Añadidos (${success.length})`,
        value: `Demasiados para mostrar~`,
        inline: false,
      });
    }

    // Lista de fallidos (máx 10)
    if (failed.length > 0 && failed.length <= 10) {
      const errorList = failed.map((r) => `<@${r.id}> → ${r.error}`).join("\n");
      embed.addFields({
        name: `❌ Errores (${failed.length})`,
        value: errorList,
        inline: false,
      });
    }

    embed
      .setFooter({
        text: `Ejecutado por ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await loadingMsg.edit({ content: null, embeds: [embed] });
  },
};
