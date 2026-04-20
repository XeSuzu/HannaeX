import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { totalXpForVoiceLevel } from "../../../Features/levelHandler";
import { HoshikoClient } from "../../../index";
import LevelConfig from "../../../Models/LevelConfig";
import LocalLevel from "../../../Models/LocalLevels";

export default {
  data: new SlashCommandBuilder()
    .setName("xp-reset")
    .setDescription("🛠️ Herramientas de administración de XP")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("usuario")
        .setDescription("Resetea todo el XP local de un usuario")
        .addUserOption((o) =>
          o
            .setName("usuario")
            .setDescription("Usuario a resetear")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("vc")
        .setDescription(
          "Penaliza a un usuario removiendo XP de voz por horas AFK",
        )
        .addUserOption((o) =>
          o
            .setName("usuario")
            .setDescription("Usuario a penalizar")
            .setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("horas")
            .setDescription("Horas AFK fraudulentas a descontar (1-24)")
            .setMinValue(1)
            .setMaxValue(24)
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("razon")
            .setDescription("Razón de la penalización (aparece en el log)")
            .setRequired(false),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const sub = interaction.options.getSubcommand();

    // ─── /xp-reset usuario ────────────────────────────────────────────────────
    if (sub === "usuario") {
      const target = interaction.options.getUser("usuario", true);

      const profile = await LocalLevel.findOne({
        userId: target.id,
        guildId: interaction.guildId!,
      });

      if (!profile) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b6b)
              .setDescription(
                `❌ **${target.displayName}** no tiene perfil de XP en este servidor.`,
              ),
          ],
        });
      }

      await LocalLevel.updateOne(
        { userId: target.id, guildId: interaction.guildId! },
        {
          $set: {
            xp: 0,
            level: 0,
            messagesSent: 0,
            voiceXp: 0,
            voiceLevel: 0,
            voiceMinutes: 0,
            weeklyXp: 0,
            weeklyMessages: 0,
            weeklyVoiceMinutes: 0,
          },
        },
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb7c5)
            .setAuthor({
              name: `🛠️ XP reseteado — ${target.displayName}`,
              iconURL: target.displayAvatarURL(),
            })
            .setDescription(
              `Todo el XP local de **${target.displayName}** ha sido reseteado a 0.\n` +
                `> Nivel, XP de mensajes, XP de voz y estadísticas eliminados.`,
            )
            .setFooter({
              text: `Por ${interaction.user.displayName} · Hoshiko Levels 🌸`,
            })
            .setTimestamp(),
        ],
      });
    }

    // ─── /xp-reset vc ─────────────────────────────────────────────────────────
    if (sub === "vc") {
      const target = interaction.options.getUser("usuario", true);
      const horas = interaction.options.getInteger("horas", true);
      const razon =
        interaction.options.getString("razon") ?? "Sin razón especificada";

      const config = await LevelConfig.findOne({
        guildId: interaction.guildId!,
      });
      const xpPerMinute = config?.xpPerMinuteVoice ?? 10;
      const multiplier = config?.xpMultiplier ?? 1.0;

      const profile = await LocalLevel.findOne({
        userId: target.id,
        guildId: interaction.guildId!,
      });

      if (!profile) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b6b)
              .setDescription(
                `❌ **${target.displayName}** no tiene perfil de XP en este servidor.`,
              ),
          ],
        });
      }

      // Calcular XP a descontar
      const minutosAFK = horas * 60;
      const xpADescontar = Math.floor(xpPerMinute * minutosAFK * multiplier);

      const oldVoiceXp = profile.voiceXp ?? 0;
      const oldVoiceLevel = profile.voiceLevel ?? 0;
      const newVoiceXp = Math.max(0, oldVoiceXp - xpADescontar);

      // Recalcular nivel hacia abajo
      let newVoiceLevel = 0;
      while (
        newVoiceLevel + 1 <= oldVoiceLevel &&
        newVoiceXp >= totalXpForVoiceLevel(newVoiceLevel + 1)
      ) {
        newVoiceLevel++;
      }

      const xpEfectivamenteDescontado = oldVoiceXp - newVoiceXp;
      const nivelesReducidos = oldVoiceLevel - newVoiceLevel;

      await LocalLevel.updateOne(
        { userId: target.id, guildId: interaction.guildId! },
        {
          $set: {
            voiceXp: newVoiceXp,
            voiceLevel: newVoiceLevel,
          },
          $inc: {
            voiceMinutes: -minutosAFK,
          },
        },
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setAuthor({
              name: `⚠️ Penalización de VC — ${target.displayName}`,
              iconURL: target.displayAvatarURL(),
            })
            .addFields(
              {
                name: "⏱️ Horas descontadas",
                value: `**${horas}h** (${minutosAFK.toLocaleString()} min)",`,
                inline: true,
              },
              {
                name: "⚡ XP removido",
                value: `\`${xpEfectivamenteDescontado.toLocaleString()}\` XP`,
                inline: true,
              },
              {
                name: "🎯 Nivel de voz",
                value:
                  nivelesReducidos > 0
                    ? `Nv. **${oldVoiceLevel}** → Nv. **${newVoiceLevel}** (-${nivelesReducidos})`
                    : `Nv. **${oldVoiceLevel}** (sin cambio de nivel)`,
                inline: true,
              },
              {
                name: "📝 Razón",
                value: razon,
                inline: false,
              },
            )
            .setFooter({
              text: `Por ${interaction.user.displayName} · Hoshiko Levels 🌸`,
            })
            .setTimestamp(),
        ],
      });
    }
  },
};
