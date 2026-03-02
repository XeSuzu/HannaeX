import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChatInputCommandInteraction,
} from "discord.js";
import AFK from "../../../Models/afk";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Information",
  // ✅ cooldown movido a options
  options: {
    cooldown: 5,
  },
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("😽 Marca que estás AFK y avisa a quienes te mencionen.")
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Opcional: ¿Por qué te ausentas? 🐾"),
    ),

  // ✅ Retorna Promise<void>, no Message
  async execute(
    interaction: ChatInputCommandInteraction, 
    client: HoshikoClient
  ): Promise<void> {
    // ❌ ELIMINADO: await interaction.deferReply();

    if (!interaction.guild || !interaction.member) {
      await interaction.editReply({
        content: "Este comando solo se puede usar en un servidor.",
      });
      return; // ✅ void, no return value
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const reason = interaction.options.getString("razon") ?? "Estoy ausente 🐾";

    let currentNickname = member.displayName;
    if (currentNickname.startsWith("[AFK] ")) {
      currentNickname = currentNickname.replace("[AFK] ", "");
    }

    const originalNickname = currentNickname;
    let nicknameChanged = false;

    if (member.id !== interaction.guild.ownerId) {
      const botMember = await interaction.guild.members.fetchMe();
      const hasPerms = botMember.permissions.has(
        PermissionsBitField.Flags.ManageNicknames,
      );

      const canChange =
        hasPerms &&
        botMember.roles.highest.position > member.roles.highest.position;

      if (canChange && !member.displayName.startsWith("[AFK] ")) {
        try {
          const newNickname = `[AFK] ${originalNickname}`.substring(0, 32);
          await member.setNickname(newNickname);
          nicknameChanged = true;
        } catch (error) {
          console.warn(`[AFK] No pude cambiar apodo a ${member.user.tag}`);
        }
      }
    }

    try {
      await AFK.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guildId },
        {
          reason,
          timestamp: new Date(),
          originalNickname,
        },
        { upsert: true, new: true },
      );
    } catch (dbError) {
      console.error("[AFK] Error DB:", dbError);
      await interaction.editReply({
        content: "❌ Error al guardar tu estado AFK.",
      });
      return;
    }

    const unixTimestamp = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xffc0cb)
      .setTitle("🌙 Te has marcado como ausente")
      .setAuthor({
        name: `${interaction.user.username} ahora está AFK`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .addFields(
        { name: "Razón", value: `> ${reason}` },
        { name: "Ausente desde", value: `> <t:${unixTimestamp}:R>` },
      )
      .setFooter({ text: "Un pequeño descanso... 🐱💗" });

    if (nicknameChanged) {
      embed.addFields({
        name: "Apodo",
        value: "> He actualizado tu apodo a `[AFK]`.",
      });
    }

    // ✅ Solo editReply, void, no return
    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;