import { LevelConfigCache } from "../../../../Database/leveling/LevelConfigCache";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import LevelConfig from "../../../../Database/leveling/levelConfig.model";

export async function handleSystem(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  sub: string,
): Promise<unknown> {
  if (sub === "toggle") {
    const activo = interaction.options.getBoolean("activo", true);
    await LevelConfig.updateOne(
      { guildId },
      { enabled: activo },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(activo ? 0x51cf66 : 0xff6b6b)
      .setTitle(activo ? "✅ Sistema activado" : "🔴 Sistema desactivado")
      .setDescription(
        activo
          ? "El sistema de niveles está ahora **activo**. Los usuarios empezarán a ganar XP."
          : "El sistema de niveles está ahora **desactivado**. Los usuarios no ganarán XP.",
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "modo-anuncio") {
    const modo = interaction.options.getString("modo", true) as
      | "all"
      | "milestone"
      | "silent";
    await LevelConfig.updateOne(
      { guildId },
      { announceMode: modo },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const modosTexto: Record<string, string> = {
      all: "todos los niveles",
      milestone: "solo niveles importantes (5, 10, 15...)",
      silent: "silencioso (no se anuncia)",
    };

    const embed = new EmbedBuilder()
      .setColor(0xffb7c5)
      .setTitle("📢 Modo de anuncio actualizado")
      .setDescription(`Modo establecido: **${modosTexto[modo]}**`)
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "dm") {
    const activo = interaction.options.getBoolean("activo", true);
    await LevelConfig.updateOne(
      { guildId },
      { announceDM: activo },
      { upsert: true },
    );
    LevelConfigCache.invalidate(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(activo ? 0x51cf66 : 0xff6b6b)
      .setTitle(activo ? "📨 DM activados" : "📨 DM desactivados")
      .setDescription(
        activo
          ? "Los anuncios de nivel se enviarán por **DM** al usuario."
          : "Los anuncios de nivel se enviarán al **canal** configurado.",
      )
      .setFooter({ text: "Hoshiko Levels 🌸" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
