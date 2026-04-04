import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { AutomodManager } from "../../../Features/AutomodManager";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Banea y desbanea inmediatamente a un usuario (elimina mensajes).")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("El usuario a softbanear.").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("razon").setDescription("Razón del softban.").setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName("eliminar-mensajes").setDescription("Eliminar mensajes de los últimos 7 días.").setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("razon") || "Softban";
    const deleteMessages = interaction.options.getBoolean("eliminar-mensajes") ?? true;

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({ content: "❌ No pude encontrar a ese usuario.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.followUp({ content: "🌸 No puedes softbanearte a ti mismo.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.followUp({ content: "❌ No puedo softbanear a un miembro del staff.", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;

      await target.ban({ 
        reason: `${interaction.user.tag}: ${reason}`, 
        deleteMessageSeconds: deleteMessages ? 604800 : 0 
      });

      const unbanReason = `Softban completado por ${interaction.user.tag}`;
      await interaction.guild.bans.remove(targetId, unbanReason);

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "ban",
        `Softban por ${interaction.user.tag}: ${reason}`,
      );

      await HoshikoLogger.logAction(interaction.guild, "BAN", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        extra: "Softban (baneado y desbaneado)",
      });

      const embed = new EmbedBuilder()
        .setTitle("🔄 Softban Ejecutado")
        .setDescription(`**${targetTag}** ha sido softbaneado.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📝 Razón", value: reason, inline: false },
          { name: "🗑️ Mensajes", value: deleteMessages ? "Eliminados (7 días)" : "Preservados", inline: true },
          { name: "🆔 IDs", value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`, inline: false },
        )
        .setColor(0xff6600)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Usuario baneado y desbaneado automáticamente" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando softban:", error);
      await interaction.followUp({
        content: "🌸 Hubo un error al softbanear. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
