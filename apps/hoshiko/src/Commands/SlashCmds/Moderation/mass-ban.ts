import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import {
  canModerateTarget,
  checkBotPermissions,
  checkModeratorPermissions,
} from "../../../Utils/moderationGuards";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";
import type { HoshikoClient } from "../../../client/HoshikoClient";

interface BanResult {
  id: string;
  success: boolean;
  error?: string;
}

const BAN_CONCURRENCY = 5;

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
    if (!interaction.guild || !interaction.member) return;

    const modPermCheck = checkModeratorPermissions(
      interaction,
      PermissionFlagsBits.BanMembers,
    );
    if (!modPermCheck.ok) {
      return interaction.editReply({ content: modPermCheck.reason! });
    }

    const botPermCheck = checkBotPermissions(
      interaction,
      PermissionFlagsBits.BanMembers,
    );
    if (!botPermCheck.ok) {
      return interaction.editReply({ content: botPermCheck.reason! });
    }

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

    // Worker pool: limita solicitudes simultáneas y conserva el orden de entrada.
    const results: BanResult[] = new Array(userIds.length);
    let nextIndex = 0;
    const workerCount = Math.min(BAN_CONCURRENCY, userIds.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= userIds.length) return;

        const userId = userIds[index];
        try {
          if (userId === interaction.user.id) {
            results[index] = {
              id: userId,
              success: false,
              error: "No puedes banearte a ti mismo",
            };
            continue;
          }

          if (userId === interaction.guild!.ownerId) {
            results[index] = {
              id: userId,
              success: false,
              error: "No se puede banear al dueño del servidor",
            };
            continue;
          }

          if (userId === interaction.client.user?.id) {
            results[index] = {
              id: userId,
              success: false,
              error: "No puedes banear al bot",
            };
            continue;
          }

          let member: GuildMember | null = null;
          try {
            member = await interaction.guild!.members.fetch(userId);
          } catch (fetchErr: any) {
            // SOLO si fetchErr.code === 10007 (Unknown Member) se asume que el usuario no está en el servidor
            if (fetchErr?.code === 10007) {
              member = null;
            } else {
              results[index] = {
                id: userId,
                success: false,
                error: `Fallo de verificación de jerarquía: ${fetchErr?.message || "error de red transitorio"}`,
              };
              continue;
            }
          }

          if (member) {
            const check = canModerateTarget(
              interaction.member as GuildMember,
              member,
            );
            if (!check.canModerate) {
              results[index] = {
                id: userId,
                success: false,
                error: check.reason || "Jerarquía insuficiente",
              };
              continue;
            }
          }

          HoshikoLogger.markBotModerationAction(
            interaction.guild!.id,
            "BAN",
            userId,
          );
          await interaction.guild!.bans.create(userId, { reason });
          results[index] = { id: userId, success: true };
        } catch (err: any) {
          results[index] = {
            id: userId,
            success: false,
            error: err.message || "Error",
          };
        }
      }
    });

    await Promise.all(workers);

    const success = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (success.length > 0) {
      await HoshikoLogger.logAction(interaction.guild, "BAN", {
        moderator: interaction.user,
        reason,
        source: "Comando",
        actionLabel: `MassBan (${success.length} usuario(s))`,
        extra: `Exitosos: ${success.length} • Fallidos: ${failed.length}`,
      });
    }

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
