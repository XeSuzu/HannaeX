import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ColorResolvable,
} from "discord.js";
import StatusConfig from "../../../Models/StatutsConfig"; // Asegúrate de que la ruta sea correcta
import { HoshikoClient } from "../../../index";

export default {
  category: "Admin",
  data: new SlashCommandBuilder()
    .setName("status-reward")
    .setDescription(
      "💎 Gestiona el sistema de recompensas por Estado Personalizado (Vanity).",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // SUBCOMANDO 1: CONFIGURAR (Sirve para crear y para actualizar)
    .addSubcommand((sub) =>
      sub
        .setName("configurar")
        .setDescription(
          "🛠️ Establece el rol y el texto que deben tener los usuarios.",
        )
        .addRoleOption((opt) =>
          opt
            .setName("rol")
            .setDescription("El rol que ganarán (Recompensa)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("texto")
            .setDescription("El texto exacto que deben tener (ej: .gg/mya)")
            .setRequired(true),
        ),
    )
    // SUBCOMANDO 2: PANEL (Ver estado actual)
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("👀 Mira la configuración actual del sistema."),
    )
    // SUBCOMANDO 3: INTERRUPTOR (Apagar/Encender rápido)
    .addSubcommand((sub) =>
      sub
        .setName("interruptor")
        .setDescription(
          "⚡ Enciende o apaga el sistema sin borrar la configuración.",
        )
        .addBooleanOption((opt) =>
          opt
            .setName("estado")
            .setDescription("¿Activado (True) o Desactivado (False)?")
            .setRequired(true),
        ),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    await interaction.deferReply();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // --- LÓGICA: CONFIGURAR ---
    if (sub === "configurar") {
      const role = interaction.options.getRole("rol", true);
      const text = interaction.options.getString("texto", true);

      // Validar que el bot tenga permisos sobre ese rol
      const botMember = interaction.guild?.members.me;
      if (botMember && role.position >= botMember.roles.highest.position) {
        return interaction.editReply(
          "😿 **Mya!** No puedo dar ese rol porque es superior o igual a mi rol más alto. Baja el rol en la lista o sube el mío.",
        );
      }

      // Guardar o Actualizar (Upsert)
      await StatusConfig.findOneAndUpdate(
        { guildId },
        {
          guildId,
          targetRoleId: role.id,
          requiredText: text,
          enabled: true, // Al configurar, lo activamos por defecto
        },
        { upsert: true, new: true },
      );

      const embed = new EmbedBuilder()
        .setTitle("✅ Configuración de Estado Actualizada")
        .setDescription(
          `¡Listo, mya! Ahora vigilaré los estados de tus miembros.`,
        )
        .addFields(
          { name: "💎 Rol Recompensa", value: `${role}`, inline: true },
          { name: "📝 Texto Requerido", value: `\`${text}\``, inline: true },
          { name: "⚡ Estado", value: "`🟢 Activo`", inline: true },
        )
        .setColor("#00ff7f") // Verde primavera
        .setFooter({
          text: "Los cambios pueden tardar unos segundos en aplicarse.",
        });

      return interaction.editReply({ embeds: [embed] });
    }

    // --- LÓGICA: PANEL (INFO) ---
    if (sub === "panel") {
      const data = await StatusConfig.findOne({ guildId });

      if (!data) {
        return interaction.editReply(
          "❌ **No hay configuración.** Usa `/status-reward configurar` primero, mya.",
        );
      }

      const role = interaction.guild?.roles.cache.get(data.targetRoleId);
      const statusIcon = data.enabled ? "🟢" : "🔴";
      const statusText = data.enabled ? "Funcionando" : "Apagado";

      const embed = new EmbedBuilder()
        .setTitle("💎 Panel de Control: Status Reward")
        .setDescription("Aquí tienes los detalles de tu sistema de lealtad.")
        .addFields(
          {
            name: "Rol a entregar",
            value: role ? `${role}` : "⚠️ Rol eliminado",
            inline: true,
          },
          {
            name: "Texto buscado",
            value: `\`${data.requiredText}\``,
            inline: true,
          },
          {
            name: "Estado del Sistema",
            value: `${statusIcon} **${statusText}**`,
            inline: false,
          },
        )
        .setColor(data.enabled ? "#ff69b4" : "#555555")
        .setThumbnail(interaction.guild?.iconURL() || null);

      return interaction.editReply({ embeds: [embed] });
    }

    // --- LÓGICA: INTERRUPTOR ---
    if (sub === "interruptor") {
      const state = interaction.options.getBoolean("estado", true);
      const data = await StatusConfig.findOneAndUpdate(
        { guildId },
        { enabled: state },
        { new: true },
      );

      if (!data) {
        return interaction.editReply(
          "❌ No existe configuración para apagar. Configúralo primero.",
        );
      }

      const emoji = state ? "🟢" : "🔴";
      const msg = state
        ? "¡Sistema reactivado! Volveré a dar roles."
        : "Zzz... Sistema en pausa. No daré roles hasta que me despiertes.";

      return interaction.editReply(`${emoji} **${msg}**`);
    }
  },
};
