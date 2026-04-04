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
    .setName("kick")
    .setDescription("Expulsa a un usuario del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("El usuario a expulsar.").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("razon").setDescription("Razón de la expulsión.").setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("razon") || "No se especificó un motivo.";

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({ content: "❌ No pude encontrar a ese usuario.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.followUp({ content: "🌸 No puedes expulsarte a ti mismo.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.followUp({ content: "❌ No puedo expulsar a un miembro del staff.", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;

      await target.kick(`${interaction.user.tag}: ${reason}`);

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "kick",
        `Kick manual por ${interaction.user.tag}: ${reason}`,
      );

      await HoshikoLogger.logAction(interaction.guild, "KICK", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
      });

      const embed = new EmbedBuilder()
        .setTitle("👢 Usuario Expulsado")
        .setDescription(`Se ha expulsado a **${targetTag}**.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📝 Razón", value: reason, inline: false },
          { name: "🆔 IDs", value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`, inline: false },
        )
        .setColor(0xff5500)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Usuario expulsado del servidor" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("💥 Error en comando kick:", error);
      await interaction.followUp({
        content: "🌸 Hubo un error al expulsar al usuario. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
