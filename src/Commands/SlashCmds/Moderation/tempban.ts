import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import ms from "ms";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import { AutomodManager } from "../../../Features/AutomodManager";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("Banea a un usuario temporalmente.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("El usuario a banear.").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("tiempo").setDescription("Duración (ej: 10m, 1h, 1d, 7d).").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("razon").setDescription("Razón del ban.").setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario");
    const timeInput = interaction.options.getString("tiempo", true);
    const reason = interaction.options.getString("razon") || "No se especificó un motivo.";

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({ content: "❌ No pude encontrar a ese usuario.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.followUp({ content: "🌸 No puedes banearte a ti mismo.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.followUp({ content: "❌ No puedo banear a un miembro del staff.", flags: MessageFlags.Ephemeral });
      return;
    }

    const duration = ms(timeInput as any);
    if (!duration || typeof duration !== "number" || duration < 60000) {
      await interaction.followUp({
        content: "❌ Tiempo no válido. Usa formatos como: 10m, 1h, 1d, 7d (mínimo 1 minuto).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (duration > 2419200000) {
      await interaction.followUp({
        content: "❌ El tiempo máximo es de 28 días.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;
      const unbanDate = new Date(Date.now() + duration);

      await target.ban({ reason: `[TEMPBAN] ${interaction.user.tag}: ${reason}` });

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "ban",
        `Tempban por ${interaction.user.tag}: ${reason} (${timeInput})`,
      );

      await HoshikoLogger.logAction(interaction.guild, "BAN", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        extra: `Temporal: ${timeInput} (hasta ${unbanDate.toLocaleString()})`,
      });

      const embed = new EmbedBuilder()
        .setTitle("⏳ Ban Temporal Ejecutado")
        .setDescription(`**${targetTag}** ha sido baneado temporalmente.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "⏱️ Duración", value: `\`${timeInput}\``, inline: true },
          { name: "📝 Razón", value: reason, inline: false },
          { name: "🕐 Se desbanea", value: `<t:${Math.floor(unbanDate.getTime() / 1000)}:F>`, inline: false },
          { name: "🆔 IDs", value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`, inline: false },
        )
        .setColor(0xff8800)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "El usuario será desbaneado automáticamente" });

      await interaction.editReply({ embeds: [embed] });

      const guild = interaction.guild;
      const clientUser = interaction.client.user;

      setTimeout(async () => {
        try {
          const banned = await guild.bans.fetch(targetId);
          if (banned) {
            await guild.bans.remove(targetId, "Tempban expirado automáticamente");
            await HoshikoLogger.logAction(guild, "UNWARN", {
              user: target.user,
              moderator: clientUser,
              reason: "Tempban expirado",
              extra: `Duración original: ${timeInput}`,
            });
          }
        } catch (err) {
          console.error("❌ Error al desbanear automáticamente:", err);
        }
      }, duration);
    } catch (error) {
      console.error("💥 Error en comando tempban:", error);
      await interaction.followUp({
        content: "🌸 Hubo un error al banear. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
