import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import Confession from "../../../Database/community/confession.model";
import ServerConfig from "../../../Database/guild/serverConfig.model";
import { SlashCommand } from "../../../Interfaces/Command";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

const command: SlashCommand = {
  category: "Confessions",
  data: new SlashCommandBuilder()
    .setName("confession-delete")
    .setDescription("🗑️ Eliminación forzosa de publicaciones (Admin)")
    .addIntegerOption((option) =>
      option
        .setName("id")
        .setDescription("ID de la publicación a borrar")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Motivo de la eliminación")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const targetId = interaction.options.getInteger("id", true);
    const reason = interaction.options.getString("razon", true);

    // 1. BUSCAR EN DB
    const confession = await Confession.findOne({
      guildId: interaction.guildId,
      confessionId: targetId,
    });

    if (!confession) {
      return interaction.editReply(
        `❌ **Error:** El caso **#${targetId}** no existe en el sistema.`,
      );
    }

    if (confession.isDeleted) {
      return interaction.editReply(
        `⚠️ El caso **#${targetId}** ya estaba cerrado/borrado.`,
      );
    }

    // 2. OBTENER CONFIGURACIÓN
    const settings = await ServerConfig.findOne({
      guildId: interaction.guildId,
    });

    // 3. BORRADO FÍSICO (Intentar borrar el mensaje de Discord)
    let discordDeleted = false;
    const targetChannelId =
      confession.channelId || settings?.confessions?.channelId;

    try {
      if (targetChannelId && confession.publicMessageId) {
        const publicChannel = interaction.guild.channels.cache.get(
          targetChannelId,
        ) as TextChannel;

        if (publicChannel) {
          const msg = await publicChannel.messages
            .fetch(confession.publicMessageId)
            .catch(() => null);
          if (msg) {
            await msg.delete();
            discordDeleted = true;
          }
        }
      }
    } catch (e) {
      console.log(
        "No se pudo borrar el mensaje (posiblemente borrado manual):",
        e,
      );
    }

    // 4. BORRADO LÓGICO (Actualizar DB)
    confession.isDeleted = true;
    await confession.save();

    // 5. 🎨 LOG DE AUDITORÍA (Diseño Hoshiko UI)
    const logEmbed = new EmbedBuilder()
      .setTitle("🗑️ PUBLICACIÓN ELIMINADA")
      .setColor("#FEE75C")
      .setDescription(
        `Una publicación ha sido removida forzosamente del canal público.`,
      )
      .addFields(
        { name: "📄 ID Caso", value: `#${targetId}`, inline: true },
        {
          name: "👮‍♂️ Moderador",
          value: `${interaction.user.tag}`,
          inline: true,
        },
        { name: "📝 Razón", value: reason, inline: false },
        {
          name: "👤 Autor Original",
          value: `\`${confession.authorTag}\` (ID: ${confession.authorId})`,
          inline: false,
        },
        {
          name: "✂️ Contenido Cortado",
          value: `\`\`\`${confession.content.substring(0, 200) + (confession.content.length > 200 ? "..." : "")}\`\`\``,
        },
      )
      .setTimestamp();

    await HoshikoLogger.sendToChannel(interaction.guild, "confesslog", logEmbed);

    // 6. CONFIRMACIÓN VISUAL (Para el admin que usó el comando)
    const confirmEmbed = new EmbedBuilder()
      .setColor("#57F287") // Verde Éxito
      .setDescription(
        `✅ **Operación Exitosa:** La publicación **#${targetId}** ha sido eliminada del canal y marcada como borrada en la base de datos.`,
      )
      .setFooter({
        text: discordDeleted
          ? "Mensaje eliminado de Discord."
          : "Mensaje no encontrado en Discord (solo DB actualizada).",
      });

    return interaction.editReply({ embeds: [confirmEmbed] });
  },
};
export default command;