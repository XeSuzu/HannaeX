import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import ms, { StringValue } from "ms";
import { AutomodManager } from "../../../Features/AutomodManager";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5,
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Silencia a un usuario por un tiempo determinado.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("El usuario a silenciar.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("tiempo")
        .setDescription("Duración (ej: 10m, 1h, 1d).")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("motivo")
        .setDescription("Razón del silencio.")
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ): Promise<void> {
    if (!interaction.guild) return;

    const target = interaction.options.getMember("usuario");
    const timeInput = interaction.options.getString("tiempo", true);
    const reason =
      interaction.options.getString("motivo") || "No se especificó un motivo.";

    if (!target || !(target instanceof GuildMember)) {
      await interaction.followUp({
        content: "❌ No pude encontrar a ese usuario.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.followUp({
        content: "🌸 No puedes silenciarte a ti mismo.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (target.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.followUp({
        content: "❌ No puedo silenciar a un miembro del staff.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const duration = ms(timeInput as StringValue) as number;
    if (
      !duration ||
      typeof duration !== "number" ||
      duration < 5000 ||
      duration > 2419200000
    ) {
      await interaction.followUp({
        content:
          "❌ Tiempo no válido (ej: 10m, 1h) o fuera de rango (máximo 28 días).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await target.timeout(duration, reason);

      await AutomodManager.recordManualAction(
        interaction.guild,
        target,
        interaction.user,
        "mute",
        `Mute manual por ${interaction.user.tag}: ${reason}`,
      );

      await HoshikoLogger.logAction(interaction.guild, "MUTE", {
        user: target.user,
        moderator: interaction.user,
        reason: reason,
        extra: `Duración: ${timeInput}`,
      });

      const embed = new EmbedBuilder()
        .setTitle("🔇 Usuario Silenciado")
        .setDescription(`Se ha aplicado un silencio a **${target.user.tag}**.`)
        .addFields(
          { name: "⏳ Duración", value: `\`${timeInput}\``, inline: true },
          { name: "📝 Motivo", value: reason, inline: true },
          {
            name: "👮 Moderador",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: "🆔 IDs",
            value: `\`User:\` ${target.id}\n\`Mod:\` ${interaction.user.id}`,
            inline: false,
          },
        )
        .setColor(0xffb6c1)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Acción registrada en el historial" });

      await interaction.editReply({
        content: "✅ Silencio aplicado con éxito.",
        embeds: [embed],
      });

      if (
        interaction.channel &&
        interaction.channel.isTextBased() &&
        "send" in interaction.channel
      ) {
        await (interaction.channel as TextChannel).send({ embeds: [embed] });
      }
    } catch (error) {
      console.error("💥 Error en comando mute:", error);
      await interaction.followUp({
        content:
          "🌸 Hubo un error al silenciar al usuario. Revisa mis permisos.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply("❌ No tienes permisos para silenciar usuarios.");

    const target = message.mentions.members?.first();
    const timeInput = args[1];
    const reason = args.slice(2).join(" ") || "No se especificó un motivo.";

    if (!target)
      return message.reply("❌ Uso correcto: `x mute @usuario 10m razón`");
    if (!timeInput)
      return message.reply("❌ Especifica una duración. Ej: `10m`, `1h`");
    if (target.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply("❌ No puedo silenciar a un miembro del staff.");

    const duration = ms(timeInput as StringValue) as number;
    if (!duration || duration < 5000 || duration > 2419200000)
      return message.reply(
        "❌ Tiempo no válido o fuera de rango (máx 28 días).",
      );

    await target.timeout(duration, reason);
    await AutomodManager.recordManualAction(
      message.guild,
      target,
      message.author,
      "mute",
      `Mute por ${message.author.tag}: ${reason}`,
    );
    await HoshikoLogger.logAction(message.guild, "MUTE", {
      user: target.user,
      moderator: message.author,
      reason,
      extra: `Duración: ${timeInput}`,
    });

    const embed = new EmbedBuilder()
      .setTitle("🔇 Usuario Silenciado")
      .addFields(
        { name: "👤 Usuario", value: `<@${target.id}>`, inline: true },
        { name: "⏳ Duración", value: `\`${timeInput}\``, inline: true },
        { name: "📝 Motivo", value: reason },
      )
      .setColor(0xffb6c1)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};

export default command;
