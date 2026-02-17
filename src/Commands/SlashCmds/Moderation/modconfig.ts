import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  TextChannel,
} from "discord.js";
import {
  upsertServerSettings,
  getServerSettings,
} from "../../../Database/serverSettings";
import { HoshikoClient } from "../../../index"; // Asegúrate de que esta ruta sea correcta

export default {
  category: "Moderation",

  // 🟢 CORRECCIÓN CLAVE: Sin .toJSON() al final.
  // Dejamos el Builder "vivo" para que el deploy script lo procese.
  data: new SlashCommandBuilder()
    .setName("modconfig")
    .setDescription(
      "Configura umbrales y canal de moderación para strikes (por servidor)",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("Muestra la configuración actual del servidor"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Establece valores de configuración")
        .addIntegerOption((opt) =>
          opt
            .setName("mute_threshold")
            .setDescription("Puntos para silenciar (0 para desactivar)")
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("ban_threshold")
            .setDescription("Puntos para banear (0 para desactivar)")
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("mute_duration_hours")
            .setDescription("Duración del silencio en horas")
            .setRequired(false),
        )
        .addChannelOption((opt) =>
          opt
            .setName("modlog_channel")
            .setDescription("Canal para logs de moderación")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription(
          "Restablece la configuración de strikes a los valores por defecto",
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    await interaction.deferReply({ ephemeral: true });

    try {
      if (!interaction.guild)
        return interaction.editReply({
          content: "Este comando debe ejecutarse en un servidor.",
        });

      const sub = interaction.options.getSubcommand();

      if (sub === "view") {
        const settings = await getServerSettings(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setTitle("🛠️ Configuración de Moderación (Strikes)")
          .setColor(0xffc0cb)
          .addFields(
            {
              name: "Mute Threshold",
              value:
                settings?.strikeMuteThreshold != null
                  ? String(settings!.strikeMuteThreshold)
                  : `Default (${process.env.STRIKE_MUTE_THRESHOLD || "5"})`,
              inline: true,
            },
            {
              name: "Ban Threshold",
              value:
                settings?.strikeBanThreshold != null
                  ? String(settings!.strikeBanThreshold)
                  : `Default (${process.env.STRIKE_BAN_THRESHOLD || "10"})`,
              inline: true,
            },
            // Convertir ms a horas para mostrar
            {
              name: "Mute Duration (horas)",
              value:
                settings?.strikeMuteDurationMs != null
                  ? String(settings!.strikeMuteDurationMs / (60 * 60 * 1000))
                  : `Default (${process.env.STRIKE_MUTE_DURATION_MS ? String(Number(process.env.STRIKE_MUTE_DURATION_MS) / (60 * 60 * 1000)) : "24"})`,
              inline: true,
            },
            {
              name: "ModLog Channel",
              value: settings?.modLogChannelId
                ? `<#${settings.modLogChannelId}>`
                : process.env.STRIKE_MODLOG_CHANNEL_ID
                  ? `<#${process.env.STRIKE_MODLOG_CHANNEL_ID}>`
                  : "No configurado",
              inline: false,
            },
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "set") {
        const muteThreshold = interaction.options.getInteger("mute_threshold");
        const banThreshold = interaction.options.getInteger("ban_threshold");
        const muteDurationHours = interaction.options.getInteger(
          "mute_duration_hours",
        );
        const modlogChannel = interaction.options.getChannel(
          "modlog_channel",
        ) as TextChannel | null;

        const patch: any = {};
        // Si el valor es 0, lo guardamos como null para usar el valor por defecto de ENV
        if (typeof muteThreshold === "number")
          patch.strikeMuteThreshold = muteThreshold > 0 ? muteThreshold : null;
        if (typeof banThreshold === "number")
          patch.strikeBanThreshold = banThreshold > 0 ? banThreshold : null;
        // Almacenar en milisegundos
        if (typeof muteDurationHours === "number")
          patch.strikeMuteDurationMs =
            muteDurationHours > 0 ? muteDurationHours * 60 * 60 * 1000 : null;
        if (modlogChannel) patch.modLogChannelId = modlogChannel.id;

        if (Object.keys(patch).length === 0) {
          return interaction.editReply({
            content: "No se proporcionaron opciones para actualizar.",
          });
        }

        const updated = await upsertServerSettings(interaction.guild.id, patch);

        // Calcular duración en horas para mostrar en el embed
        const displayMuteDuration =
          updated?.strikeMuteDurationMs != null
            ? String(updated!.strikeMuteDurationMs / (60 * 60 * 1000)) +
              " horas"
            : "Default";

        return interaction.editReply({
          content: "✅ Configuración actualizada.",
          embeds: [
            new EmbedBuilder()
              .setTitle("Configuración actualizada")
              .setColor(0x57f287)
              .setDescription("Los nuevos ajustes han sido guardados.")
              .addFields(
                {
                  name: "Mute Threshold",
                  value:
                    updated?.strikeMuteThreshold != null
                      ? String(updated!.strikeMuteThreshold)
                      : "Default",
                  inline: true,
                },
                {
                  name: "Ban Threshold",
                  value:
                    updated?.strikeBanThreshold != null
                      ? String(updated!.strikeBanThreshold)
                      : "Default",
                  inline: true,
                },
                {
                  name: "Mute Duration",
                  value: displayMuteDuration,
                  inline: true,
                },
                {
                  name: "ModLog Channel",
                  value: updated?.modLogChannelId
                    ? `<#${updated.modLogChannelId}>`
                    : "No configurado",
                  inline: false,
                },
              )
              .setTimestamp(),
          ],
        });
      }

      if (sub === "reset") {
        // Establecer todos los campos a null para que se use la configuración por defecto (ENV)
        await upsertServerSettings(interaction.guild.id, {
          strikeMuteThreshold: null,
          strikeBanThreshold: null,
          strikeMuteDurationMs: null,
          modLogChannelId: null,
        });
        return interaction.editReply({
          content:
            "🔁 Configuración de strikes restablecida a valores por defecto.",
        });
      }

      return interaction.editReply({ content: "Subcomando no reconocido." });
    } catch (err: any) {
      console.error("Error en /modconfig:", err);
      return interaction.editReply({
        content: "Ocurrió un error procesando la configuración.",
      });
    }
  },
};
