import { LevelConfigCache } from "../../../../Database/leveling/LevelConfigCache";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import LevelConfig from "../../../../Database/leveling/levelConfig.model";

export async function handleVoiceXp(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  sub: string,
): Promise<unknown> {
  if (sub === "toggle") {
    const activo = interaction.options.getBoolean("activo", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpVoiceEnabled: activo },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(activo ? 0x51cf66 : 0xff6b6b)
      .setTitle(
        activo ? "🔊 XP por voz activada" : "🔇 XP por voz desactivada",
      )
      .setDescription(
        activo
          ? "Los usuarios ahora ganan XP por tiempo en canales de voz."
          : "Los usuarios ya no ganarán XP por tiempo en voz.",
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "xp-minuto") {
    const cantidad = interaction.options.getInteger("cantidad", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpPerMinuteVoice: cantidad },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("⚡ XP por minuto actualizada")
      .setDescription(`Establecida a **${cantidad} XP** por minuto en voz`)
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "min-minutos") {
    const minutos = interaction.options.getInteger("minutos", true);
    await LevelConfig.updateOne(
      { guildId },
      { xpVoiceMinMinutes: minutos },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("⏳ Minutos mínimos actualizados")
      .setDescription(`Establecido a **${minutos} minutos**`)
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
