import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";

interface BanResult {
  id: string;
  success: boolean;
  error?: string;
}

export default {
  data: new SlashCommandBuilder()
    .setName("massban")
    .setDescription("Banea a múltiples usuarios por ID o mención")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) =>
      o
        .setName("usuarios")
        .setDescription("IDs o menciones separadas por espacio o coma")
        .setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("razon")
        .setDescription("Razón del ban (opcional)")
        .setRequired(false),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const usersArg = interaction.options.getString("usuarios", true);
    const reason = interaction.options.getString("razon") || "No especificada";

    // Parsear usuarios (IDs o menciones)
    const userIds = usersArg
      .split(/[\s,]+/)
      .map((s) => s.replace(/[<@!>]/g, "").trim())
      .filter((s) => /^\d+$/.test(s));

    if (!userIds.length) {
      return interaction.editReply({
        content:
          "❌ No encontré IDs de usuario válidos. Usa menciones o IDs numéricos separados por espacio o coma.",
      });
    }

    if (userIds.length > 100) {
      return interaction.editReply({
        content: "❌ Máximo 100 usuarios a la vez.",
      });
    }

    const loadingMsg = await interaction.editReply({
      content: `⏳ Procesando ban para **${userIds.length}** usuario(s)...`,
    });

    // Procesamiento paralelo usando Promise.allSettled
    const banPromises = userIds.map(async (userId): Promise<BanResult> => {
      try {
        await interaction.guild?.bans.create(userId, { reason });
        return { id: userId, success: true };
      } catch (err: any) {
        return { id: userId, success: false, error: err.message || "Error" };
      }
    });

    const results = await Promise.all(banPromises);

    const success = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const embed = new EmbedBuilder()
      .setColor(
        failed.length === 0
          ? 0x2ecc71
          : failed.length === success.length
            ? 0xe74c3c
            : 0xf39c12,
      )
      .setTitle("🔨 MassBan - Resultado")
      .setDescription(
        failed.length === 0
          ? `✅ Todos los baneos completados exitosamente`
          : `⚠️ ${failed.length} de ${userIds.length} fallaron`,
      )
      .addFields({
        name: "📊 Estadísticas",
        value: `\`\`\`
✅ Exitosos: ${success.length}
❌ Fallidos: ${failed.length}
📝 Razón: ${reason}
\`\`\``,
        inline: false,
      });

    // Lista de exitosos (máx 25)
    if (success.length > 0 && success.length <= 25) {
      embed.addFields({
        name: `✅ Baneados (${success.length})`,
        value: success.map((r) => `<@${r.id}>`).join(" "),
        inline: false,
      });
    } else if (success.length > 25) {
      embed.addFields({
        name: `✅ Baneados (${success.length})`,
        value: `Demasiados para mostrar~`,
        inline: false,
      });
    }

    // Lista de fallidos (máx 15)
    if (failed.length > 0 && failed.length <= 15) {
      const errorList = failed
        .slice(0, 10)
        .map((r) => `<@${r.id}> → ${r.error}`)
        .join("\n");
      embed.addFields({
        name: `❌ Errores (${failed.length})`,
        value:
          errorList +
          (failed.length > 10 ? `\n...y ${failed.length - 10} más` : ""),
        inline: false,
      });
    }

    embed
      .setFooter({
        text: `Ejecutado por ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await loadingMsg.edit({ content: null, embeds: [embed] });
  },
};
