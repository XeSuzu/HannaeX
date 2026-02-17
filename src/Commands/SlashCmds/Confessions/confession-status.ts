import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import ServerConfig from "../../../Models/serverConfig";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confessions-status")
    .setDescription("📊 Ver estado de canales activos y suscripción")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await ServerConfig.findOne({
      guildId: interaction.guildId,
    });

    const feeds = settings?.confessions?.feeds || [];
    const isPremium =
      settings?.premiumUntil && settings.premiumUntil > new Date();
    const maxFeeds = isPremium ? "♾️ Ilimitado" : 3;
    const usedSlots = feeds.length;

    const percentage = isPremium ? 0 : Math.min((usedSlots / 3) * 100, 100);
    const progressBar = createProgressBar(percentage);

    const embed = new EmbedBuilder()
      .setTitle("📊 Estado de Publicaciones")
      .setColor(isPremium ? "#E0B0FF" : "#5865F2")
      .setThumbnail(interaction.guild?.iconURL() || null)
      .addFields(
        {
          name: "💎 Suscripción",
          value: isPremium
            ? `**PREMIUM ACTIVO** ✨\nExpira: <t:${Math.floor(settings!.premiumUntil!.getTime() / 1000)}:R>`
            : "**GRATUITO**\nLímite: 3 Canales",
          inline: true,
        },
        {
          name: "📡 Slots",
          value: `\`${usedSlots} / ${maxFeeds}\` Usados\n${progressBar}`,
          inline: true,
        },
      );

    if (feeds.length > 0) {
      const feedList = feeds
        .map(
          (f) =>
            `> **${f.emoji} ${f.title}** (Msg #${f.counter || 0})\n> 📍 Canal: <#${f.channelId}>\n> 🎨 Color: \`${f.color}\``,
        )
        .join("\n\n");

      embed.addFields({ name: "📂 Canales Configurados", value: feedList });
    } else {
      embed.addFields({
        name: "📂 Canales Configurados",
        value: "❌ No hay canales configurados aún.",
      });
    }

    // 👇 NOTA DE SEGURIDAD PARA MODERADORES
    embed.addFields({
      name: "👮‍♂️ Nota para Moderadores",
      value:
        "Para borrar o banear, usa siempre el **ID de Referencia (Ref)** que aparece en letra pequeña al pie de cada mensaje, NO el número del título.",
    });

    embed.setFooter({
      text: isPremium
        ? "Gracias por apoyar a Hoshiko 💖"
        : "Adquiere Premium para canales ilimitados.",
    });

    return interaction.editReply({ embeds: [embed] });
  },
};

function createProgressBar(percent: number) {
  const totalBars = 10;
  const filledBars = Math.round((percent / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return "`[" + "█".repeat(filledBars) + "░".repeat(emptyBars) + "]`";
}
