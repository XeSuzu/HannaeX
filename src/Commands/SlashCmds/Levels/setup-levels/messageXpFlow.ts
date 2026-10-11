import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import LevelConfig from "../../../../Models/LevelConfig";

export async function handleMessageXp(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  sub: string,
): Promise<unknown> {
  if (sub === "base") {
    const cantidad = interaction.options.getInteger("cantidad", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpPerMessage: cantidad },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("💬 XP por mensaje actualizada")
      .setDescription(`Establecida a **${cantidad} XP** por mensaje`)
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "cooldown") {
    const segundos = interaction.options.getInteger("segundos", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpCooldown: segundos },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("⏱️ Cooldown actualizado")
      .setDescription(
        `Tiempo entre ganancias establecido a **${segundos} segundos**`,
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "min-longitud") {
    const caracteres = interaction.options.getInteger("caracteres", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpMinLength: caracteres },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("📏 Longitud mínima actualizada")
      .setDescription(
        `Mínimo de caracteres establecido a **${caracteres}**`,
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "multiplicador") {
    const valor = interaction.options.getNumber("valor", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpMultiplier: valor },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("🎁 Multiplicador actualizado")
      .setDescription(
        `Multiplicador establecido a **x${valor}**\n` +
          `💡 Útil para eventos especiales~`,
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "mencion-bonus") {
    const xp = interaction.options.getInteger("xp", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpMentionBonus: xp, xpMentionMaxBonus: xp * 5 },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("💭 Bonus por mención actualizado")
      .setDescription(
        `Bonus establecido a **+${xp} XP** por mención\n` +
          `Máximo: **${xp * 5} XP** por mensaje`,
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
