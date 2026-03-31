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
    .setName("mass-role-remove")
    .setDescription("Remueve un rol de múltiples usuarios")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption((o) =>
      o.setName("rol").setDescription("Rol a remover").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("usuarios")
        .setDescription(
          "Menciones o IDs separados por espacio o coma (opcional)",
        )
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const role = interaction.options.getRole("rol", true);
    const usersArg = interaction.options.getString("usuarios");

    // Verificar que el bot pueda gestionar el rol
    const botMember = interaction.guild?.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        content:
          "❌ No puedo gestionar ese rol. Asegúrate de que esté **por debajo** de mi rol más alto.",
      });
    }

    let members: string[] = [];

    if (usersArg) {
      // Usuarios específicos
      members = usersArg
        .split(/[\s,]+/)
        .map((s) => s.replace(/[<@!>]/g, "").trim())
        .filter((s) => /^\d+$/.test(s));
    } else {
      // Remover de todos los miembros con ese rol
      const roleMembers = await interaction.guild?.roles.fetch(role.id);
      members = roleMembers?.members.map((m) => m.id) || [];
    }

    if (!members.length) {
      return interaction.editReply({
        content: "❌ No encontré usuarios válidos para procesar.",
      });
    }

    if (members.length > 100) {
      return interaction.editReply({
        content: "❌ Máximo 100 usuarios a la vez.",
      });
    }

    const loadingMsg = await interaction.editReply({
      content: `⏳ Removiendo el rol **${role.name}** de **${members.length}** usuario(s)...`,
    });

    // Procesamiento paralelo
    const rolePromises = members.map(async (memberId): Promise<RoleResult> => {
      try {
        const member = await interaction.guild?.members
          .fetch(memberId)
          .catch(() => null);

        if (!member || !member.roles.cache.has(role.id)) {
          return { id: memberId, success: false, error: "Sin el rol" };
        }

        await member.roles.remove(role.id);
        return { id: memberId, success: true };
      } catch (err: any) {
        return { id: memberId, success: false, error: err.message || "Error" };
      }
    });

    const results = await Promise.all(rolePromises);

    const success = results.filter((r) => r.success);
    const skipped = results.filter(
      (r) => !r.success && r.error === "Sin el rol",
    );
    const failed = results.filter(
      (r) => !r.success && r.error !== "Sin el rol",
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle(`🔧 MassRole Remove - ${role.name}`)
      .setDescription(`Proceso completado para **${members.length}** usuarios`)
      .addFields(
        {
          name: "📊 Estadísticas",
          value: `\`\`\`
✅ Removidos: ${success.length}
⏭️ Sin el rol: ${skipped.length}
❌ Fallidos: ${failed.length}
\`\`\``,
          inline: false,
        },
        {
          name: "🎭 Rol removido",
          value: `<@&${role.id}>`,
          inline: true,
        },
      );

    // Lista de removidos (máx 25)
    if (success.length > 0 && success.length <= 25) {
      embed.addFields({
        name: `✅ Removidos (${success.length})`,
        value: success.map((r) => `<@${r.id}>`).join(" "),
        inline: false,
      });
    } else if (success.length > 25) {
      embed.addFields({
        name: `✅ Removidos (${success.length})`,
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
