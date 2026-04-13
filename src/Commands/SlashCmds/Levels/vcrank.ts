import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { xpForVoiceLevel, totalXpForVoiceLevel } from "../../../Features/levelHandler";
import { HoshikoClient } from "../../../index";
import LocalLevel from "../../../Models/LocalLevels";
import { generateVCRankBanner } from "../../../Utils/LevelBanners";

export default {
  data: new SlashCommandBuilder()
    .setName("vcrank")
    .setDescription("🎙️ Muestra tu nivel de voz en este servidor")
    .addUserOption(o =>
      o.setName("usuario").setDescription("Usuario a consultar").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;

    const profile = await LocalLevel.findOne({
      userId:  target.id,
      guildId: interaction.guildId!,
    });

    if (!profile || (profile.voiceMinutes ?? 0) === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x67E8F9)
            .setTitle(`🎙️ Rango de voz de ${target.displayName}`)
            .setDescription(
              `**${target.displayName}** aún no tiene minutos de voz registrados.\n\n` +
              `🎤 Únete a un canal de voz con más personas para empezar a ganar XP~`,
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: "Hoshiko Voice Levels 🎙️" })
            .setTimestamp(),
        ],
      });
    }

    const voiceLevel  = profile.voiceLevel   ?? 0;
    const voiceMins   = profile.voiceMinutes  ?? 0;
    const voiceXp     = profile.voiceXp       ?? 0;

    const currentLevelXp = totalXpForVoiceLevel(voiceLevel);
    const xpIntoLevel    = voiceXp - currentLevelXp;
    const xpNeeded       = xpForVoiceLevel(voiceLevel);
    const progressPercent = Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100));

    const vcRank =
      (await LocalLevel.countDocuments({
        guildId:  interaction.guildId!,
        voiceXp:  { $gt: voiceXp },
      })) + 1;

    try {
      const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });
      const avatarRes = await fetch(avatarUrl);
      const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer());

      const banner = await generateVCRankBanner({
        username:        target.displayName,
        avatarBuffer,
        voiceLevel,
        vcRank,
        voiceMinutes:    voiceMins,
        xpCurrent:       xpIntoLevel,
        xpNeeded,
        progressPercent,
      });

      if (banner) return interaction.editReply({ files: [banner] });
    } catch (err) {
      console.error("[vcrank] Error generando banner:", err);
    }

    const hrs  = Math.floor(voiceMins / 60);
    const mins = voiceMins % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x67E8F9)
          .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
          .setTitle(`🎙️ Nivel de Voz ${voiceLevel}`)
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            { name: "📊 Posición", value: `**#${vcRank}** en voz`,         inline: true },
            { name: "⏱️ Tiempo",   value: `\`${timeStr}\` en voz`,         inline: true },
            { name: "⚡ XP Voz",   value: `\`${voiceXp.toLocaleString()}\``, inline: true },
            {
              name: "📈 Progreso",
              value: `\`${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()}\` XP  (**${progressPercent}%**)`,
            },
          )
          .setFooter({ text: "Hoshiko Voice Levels 🎙️" })
          .setTimestamp(),
      ],
    });
  },
};
