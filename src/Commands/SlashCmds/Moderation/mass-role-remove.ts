import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { HoshikoClient } from "../../../index";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `~${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `~${minutes}m ${seconds}s` : `~${minutes}m`;
}

function buildProgressEmbed(
  roleName: string,
  roleId: string,
  total: number,
  processed: number,
  removed: number,
  skipped: number,
  failed: number,
  done: boolean,
  executor: { username: string; displayAvatarURL: () => string },
  startedAt: number
): EmbedBuilder {
  const percent = total > 0 ? Math.floor((processed / total) * 100) : 0;
  const bar = buildBar(percent);

  // Estimación de tiempo
  const elapsed = Date.now() - startedAt;
  const remaining = processed > 0
    ? Math.round((elapsed / processed) * (total - processed))
    : Math.ceil(total / BATCH_SIZE) * BATCH_DELAY_MS;
  const elapsedFormatted = formatTime(elapsed);
  const remainingFormatted = formatTime(remaining);

  const progressValue = done
    ? `\`${bar}\` 100%\n\`${total}/${total}\` procesados\n⏱️ Tardó: ${elapsedFormatted}`
    : `\`${bar}\` ${percent}%\n\`${processed}/${total}\` procesados\n⏱️ Transcurrido: ${elapsedFormatted} · Restante: ${remainingFormatted}`;

  const embed = new EmbedBuilder()
    .setColor(done ? 0xa8d8a8 : 0xffb7c5)
    .setTitle(`🔧 MassRole Remove — ${roleName}`)
    .setDescription(
      done
        ? `✅ Proceso completado para **${total}** miembro(s) con el rol.`
        : `⏳ Procesando miembros con <@&${roleId}>...`
    )
    .addFields(
      {
        name: "📊 Progreso",
        value: progressValue,
        inline: false,
      },
      {
        name: "📈 Resultados",
        value: `\`\`\`
✅ Removidos : ${removed}
⏭️ Sin el rol : ${skipped}
❌ Fallidos  : ${failed}
\`\`\``,
        inline: false,
      },
      {
        name: "🎭 Rol",
        value: `<@&${roleId}>`,
        inline: true,
      }
    )
    .setFooter({
      text: `Ejecutado por ${executor.username}`,
      iconURL: executor.displayAvatarURL(),
    })
    .setTimestamp();

  return embed;
}

function buildBar(percent: number, length = 20): string {
  const filled = Math.round((percent / 100) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

export default {
  data: new SlashCommandBuilder()
    .setName("mass-role-remove")
    .setDescription("Remueve un rol de todos los miembros que lo tengan")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption((o) =>
      o.setName("rol").setDescription("Rol a remover").setRequired(true)
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient
  ) {
    const role = interaction.options.getRole("rol", true);

    // Verificar jerarquía
    const botMember = interaction.guild?.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        content:
          "❌ No puedo gestionar ese rol. Asegúrate de que esté **por debajo** de mi rol más alto.",
      });
    }

    // Fetch completo de miembros
    await interaction.editReply({
      content: `⏳ Cargando todos los miembros del servidor...`,
    });

    const allMembers = await interaction.guild?.members.fetch();
    if (!allMembers) {
      return interaction.editReply({
        content: "❌ No pude obtener los miembros del servidor.",
      });
    }

    // Filtrar solo los que tienen el rol
    const targets = allMembers
      .filter((m) => m.roles.cache.has(role.id))
      .map((m) => m);

    if (targets.length === 0) {
      return interaction.editReply({
        content: `❌ Ningún miembro tiene el rol **${role.name}**.`,
      });
    }

    // Estado del proceso
    let processed = 0;
    let removed = 0;
    let skipped = 0;
    let failed = 0;
    const total = targets.length;
    const startedAt = Date.now();

    // Embed inicial
    const progressEmbed = buildProgressEmbed(
      role.name,
      role.id,
      total,
      processed,
      removed,
      skipped,
      failed,
      false,
      interaction.user,
      startedAt
    );

    const msg = await interaction.editReply({ content: null, embeds: [progressEmbed] });

    // Procesar en batches
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (member) => {
          try {
            if (!member.roles.cache.has(role.id)) {
              skipped++;
            } else {
              await member.roles.remove(role.id);
              removed++;
            }
          } catch {
            failed++;
          } finally {
            processed++;
          }
        })
      );

      // Actualizar embed con progreso
      const updatedEmbed = buildProgressEmbed(
        role.name,
        role.id,
        total,
        processed,
        removed,
        skipped,
        failed,
        false,
        interaction.user,
        startedAt
      );

      await msg.edit({ embeds: [updatedEmbed] }).catch(() => null);

      // Delay entre batches (excepto el último)
      if (i + BATCH_SIZE < targets.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Embed final
    const finalEmbed = buildProgressEmbed(
      role.name,
      role.id,
      total,
      processed,
      removed,
      skipped,
      failed,
      true,
      interaction.user,
      startedAt
    );

    await msg.edit({ embeds: [finalEmbed] }).catch(() => null);
  },
};
