import { LevelConfigCache } from "../../../../Database/LevelConfigCache";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { ILevelConfig } from "../../../../Models/LevelConfig";
import LevelConfig from "../../../../Models/LevelConfig";

export async function handleChannels(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  sub: string,
  config: ILevelConfig,
): Promise<unknown> {
  if (sub === "anuncio") {
    const channel = interaction.options.getChannel("canal", true);
    await LevelConfig.updateOne(
      { guildId },
      { announceChannelId: channel.id },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(0x51cf66)
      .setTitle("📢 Canal de anuncio establecido")
      .setDescription(`Anuncios de nivel se enviarán a <#${channel.id}>`)
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "anuncio-limpiar") {
    await LevelConfig.updateOne(
      { guildId },
      { announceChannelId: null },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(0xff6b6b)
      .setTitle("❌ Canal de anuncio eliminado")
      .setDescription(
        "El sistema ya no usará un canal fijo para anuncios de nivel.",
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "ignorar") {
    const channel = interaction.options.getChannel("canal", true);
    const already = config.ignoredChannels.includes(channel.id);
    if (already) {
      await LevelConfig.updateOne(
        { guildId },
        { $pull: { ignoredChannels: channel.id } },
      );
    LevelConfigCache.invalidate(interaction.guildId!);

      const embed = new EmbedBuilder()
        .setColor(0x51cf66)
        .setTitle("✅ Canal des-ignorado")
        .setDescription(
          `<#${channel.id}> ya no está ignorado y los mensajes cuentan para XP.`,
        )
        .setFooter({ text: "Hoshiko Levels 🌸" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } else {
      await LevelConfig.updateOne(
        { guildId },
        { $addToSet: { ignoredChannels: channel.id } },
        { upsert: true },
      );
    LevelConfigCache.invalidate(interaction.guildId!);

      const embed = new EmbedBuilder()
        .setColor(0xffb7c5)
        .setTitle("🚫 Canal ignorado")
        .setDescription(
          `<#${channel.id}> ahora está ignorado y los mensajes **no** cuentan para XP.`,
        )
        .setFooter({ text: "Hoshiko Levels 🌸" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }

  if (sub === "ignorar-rol") {
    const role = interaction.options.getRole("rol", true);
    const already = config.ignoredRoles.includes(role.id);
    if (already) {
      await LevelConfig.updateOne(
        { guildId },
        { $pull: { ignoredRoles: role.id } },
      );
    LevelConfigCache.invalidate(interaction.guildId!);

      const embed = new EmbedBuilder()
        .setColor(0x51cf66)
        .setTitle("✅ Rol des-ignorado")
        .setDescription(`Los usuarios con ${role} ya no están ignorados.`)
        .setFooter({ text: "Hoshiko Levels 🌸" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } else {
      await LevelConfig.updateOne(
        { guildId },
        { $addToSet: { ignoredRoles: role.id } },
        { upsert: true },
      );
    LevelConfigCache.invalidate(interaction.guildId!);

      const embed = new EmbedBuilder()
        .setColor(0xffb7c5)
        .setTitle("🚫 Rol ignorado")
        .setDescription(
          `Los usuarios con ${role} ahora están ignorados y no ganan XP.`,
        )
        .setFooter({ text: "Hoshiko Levels 🌸" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
}
