import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { TrackingOptOutManager } from "../../../Database/tracking/TrackingOptOutManager";
import { AvatarHistoryManager } from "../../../Database/tracking/AvatarHistoryManager";
import { UserHistoryManager } from "../../../Database/tracking/UserHistoryManager";
import { PresenceHistoryManager } from "../../../Database/tracking/PresenceHistoryManager";
import { PersonalMemoryService } from "../../../Core/AI/Memory/PersonalMemoryService";

export default {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("privacy")
    .setDescription("Gestiona tus derechos de privacidad, seguimiento y eliminación de datos 🔒")
    .addSubcommand((sub) =>
      sub
        .setName("estado")
        .setDescription("Consulta tus preferencias actuales de privacidad y datos almacenados"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ajustes")
        .setDescription("Activa o desactiva la recopilación de historial de perfiles y presencias")
        .addStringOption((opt) =>
          opt
            .setName("seguimiento")
            .setDescription("Estado del seguimiento de historial de perfiles y avatares")
            .setRequired(true)
            .addChoices(
              { name: "Activado (Permitir historial de perfiles)", value: "permitir" },
              { name: "Desactivado (Opt-out estricto / No rastrear)", value: "optout" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("borrar")
        .setDescription("Ejecuta tu derecho de supresión (borrado definitivo de tus datos)")
        .addStringOption((opt) =>
          opt
            .setName("categoria")
            .setDescription("¿Qué datos deseas suprimir definitivamente?")
            .setRequired(true)
            .addChoices(
              { name: "Historial de perfiles, avatares y presencias", value: "tracking" },
              { name: "Recuerdos de memoria personal de IA", value: "memory" },
              { name: "Todo (Memoria personal + Historial de seguimiento)", value: "todo" },
            ),
        ),
    ),

  ephemeral: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ─── /privacy estado ─────────────────────────────────────────────────────
    if (subcommand === "estado") {
      const isOptedOut = await TrackingOptOutManager.isOptedOut(userId);
      const avatars = interaction.guild
        ? await AvatarHistoryManager.getAvatars(userId, interaction.guild.id)
        : [];
      const userHistory = await UserHistoryManager.getHistory(userId);
      const memory = await PersonalMemoryService.getMemory(userId);
      const factsCount = memory?.facts?.length || 0;

      const embed = new EmbedBuilder()
        .setTitle("🔒 Panel Soberano de Privacidad")
        .setDescription(
          `En Hoshiko tú mantienes el control sobre tus datos personales conforme a las mejores prácticas de privacidad y la normativa vigente (LOPDP / GDPR).\n\n` +
            `**Estado de seguimiento pasivo:** ${isOptedOut ? "🔴 **Desactivado (Opt-out activo)**" : "🟢 **Activado**"}\n` +
            `*Cuando está desactivado, Hoshiko no registra tus cambios de avatar, apodos ni actividades de presencia.*\n\n` +
            `**Datos almacenados actualmente:**\n` +
            `• **Avatares en este servidor:** \`${avatars.length}\` registros\n` +
            `• **Historial de nombres/perfiles:** \`${userHistory.length}\` registros\n` +
            `• **Recuerdos personales de IA:** \`${factsCount}/20\` recuerdos\n` +
            `• **Historial de presencia:** *Expiración automática cada 24 horas*\n\n` +
            `*Para dejar de registrar perfiles usa:* \`/privacy ajustes seguimiento:Desactivado\`\n` +
            `*Para borrar tus registros usa:* \`/privacy borrar\``,
        )
        .setColor(isOptedOut ? 0xffb703 : 0x70e000)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({
          text: "Hoshiko Privacy & Sovereign Data Protection",
          iconURL: interaction.client.user?.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ─── /privacy ajustes ────────────────────────────────────────────────────
    if (subcommand === "ajustes") {
      const choice = interaction.options.getString("seguimiento", true);
      const optOut = choice === "optout";

      await TrackingOptOutManager.setOptOut(userId, optOut);

      const embed = new EmbedBuilder()
        .setTitle("🔒 Preferencias de Seguimiento Actualizadas")
        .setDescription(
          optOut
            ? `Has activado el **Opt-Out de seguimiento** 🛡️\n\n` +
                `A partir de este momento:\n` +
                `• Hoshiko **no guardará** tus cambios de avatar ni banner.\n` +
                `• Hoshiko **no guardará** tus cambios de nombre o apodos.\n` +
                `• Hoshiko **no registrará** tu estado de presencia ni actividades.\n\n` +
                `*Nota: Si deseas eliminar los datos recopilados con anterioridad, ejecuta:* \`/privacy borrar categoria:Historial de perfiles...\``
            : `Has activado la recopilación de **Historial de Perfiles** 🌸\n\n` +
                `Hoshiko podrá actualizar tus snapshots de avatares y nombres para funciones informativas comunitarias como \`/avatars\` y \`/users\`.`,
        )
        .setColor(optOut ? 0xffb703 : 0x70e000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ─── /privacy borrar ─────────────────────────────────────────────────────
    if (subcommand === "borrar") {
      const categoria = interaction.options.getString("categoria", true);

      let msg = "";

      if (categoria === "tracking") {
        const purged = await TrackingOptOutManager.purgeAllTrackingData(userId);
        msg =
          `🗑️ Se han suprimido exitosamente tus datos de seguimiento:\n` +
          `• **Avatares eliminados:** ${purged.avatarsDeleted}\n` +
          `• **Registros de perfil eliminados:** ${purged.userRecordsDeleted}\n` +
          `• **Presencias eliminadas:** ${purged.presenceDeleted}`;
      } else if (categoria === "memory") {
        await PersonalMemoryService.clearAllFacts(userId);
        msg = `🗑️ Se han eliminado todos tus recuerdos de la memoria personal de IA.`;
      } else if (categoria === "todo") {
        const purged = await TrackingOptOutManager.purgeAllTrackingData(userId);
        await PersonalMemoryService.clearAllFacts(userId);
        msg =
          `🗑️ **Supresión completa ejecutada:**\n` +
          `• Todos tus recuerdos de IA han sido borrados.\n` +
          `• Se eliminaron ${purged.avatarsDeleted} registros de avatares.\n` +
          `• Se eliminaron ${purged.userRecordsDeleted} registros de perfil.\n` +
          `• Se eliminaron registros de presencia de usuario.`;
      }

      const embed = new EmbedBuilder()
        .setTitle("🗑️ Derecho de Supresión Ejecutado")
        .setDescription(msg)
        .setColor(0xff4d6d)
        .setFooter({ text: "Tus datos han sido eliminados permanentemente de nuestra base de datos." })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
};
