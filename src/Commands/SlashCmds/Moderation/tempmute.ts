import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  TextChannel,
  MessageFlags,
} from "discord.js";
import ms from "ms";
import { AutomodManager } from "../../../Features/AutomodManager";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("tempmute")
    .setDescription("Silencia a un usuario por un tiempo determinado.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("El usuario a silenciar.").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("tiempo").setDescription("Duración (ej: 10m, 1h, 1d).").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("motivo").setDescription("Razón del silencio.").setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario");
    const timeInput = interaction.options.getString("tiempo", true);
    const reason = interaction.options.getString("motivo") || "No se especificó un motivo.";

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({ content: "❌ No pude encontrar a ese usuario.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.followUp({ content: "🌸 No puedes silenciarte a ti mismo.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.followUp({ content: "❌ No puedo silenciar a un miembro del staff.", flags: MessageFlags.Ephemeral });
      return;
    }

    const duration = ms(timeInput as any);
    if (!duration || typeof duration !== "number" || duration < 5000 || duration > 2419200000) {
      await interaction.followUp({
        content: "❌ Tiempo no válido (ej: 10m, 1h) o fuera de rango (máximo 28 días).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const targetTag = target.user.tag;
      const targetId = target.id;
      const unmuteDate = new Date(Date.now() + duration);

      await target.timeout(duration, reason);

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "mute",
        `Tempmute por ${interaction.user.tag}: ${reason} (${timeInput})`,
      );

      await HoshikoLogger.logAction(interaction.guild, "MUTE", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        extra: `Temporal: ${timeInput} (hasta ${unmuteDate.toLocaleString()})`,
      });

      const embed = new EmbedBuilder()
        .setTitle("⏳ Silencio Temporal")
        .setDescription(`**${targetTag}** ha sido silenciado temporalmente.`)
        .addFields(
          { name: "👤 Usuario", value: `<@${targetId}>`, inline: true },
          { name: "👮 Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "⏱️ Duración", value: `\`${timeInput}\``, inline: true },
          { name: "📝 Motivo", value: reason, inline: false },
          { name: "🕐 Seudesilencia", value: `<t:${Math.floor(unmuteDate.getTime() / 1000)}:F>`, inline: false },
          { name: "🆔 IDs", value: `\`User:\` ${targetId}\n\`Mod:\` ${interaction.user.id}`, inline: false },
        )
        .setColor(0xffb6c1)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "El usuario será desilenciado automáticamente" });

      await interaction.editReply({ embeds: [embed] });

      const guild = interaction.guild;
      const clientUser = interaction.client.user;

      setTimeout(async () => {
        try {
          if (target.communicationDisabledUntilTimestamp && target.communicationDisabledUntilTimestamp > Date.now()) {
            await target.timeout(null, "Tempmute expirado automáticamente");
            await HoshikoLogger.logAction(guild, "UNWARN", {
              user: target.user,
              moderator: clientUser,
              reason: "Tempmute expirado",
              extra: `Duración original: ${timeInput}`,
            });
          }
        } catch (err) {
          console.error("❌ Error al desmutear automáticamente:", err);
        }
      }, duration);
    } catch (error) {
      console.error("💥 Error en comando tempmute:", error);
      await interaction.followUp({
        content: "🌸 Hubo un error al silenciar al usuario. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
