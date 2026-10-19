import { EmbedBuilder } from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { BANNER_URL, CATEGORIES, EMOJI, SEPARATOR } from "./config";
import type { CommandDetail } from "./commandDetails";
import { buildModerationEmbed } from "./moderationHelp";
import { buildAntiraidEmbed } from "./antiraidHelp";

export { buildModerationEmbed, buildAntiraidEmbed };

export function buildMainEmbed(
  client: HoshikoClient,
  categorized: Record<string, { name: string; desc: string }[]>,
  user: { username: string; displayAvatarURL: () => string },
  welcomeLine: string,
): EmbedBuilder {
  const totalCmds = Object.values(categorized).flat().length;
  const prefix = process.env.PREFIX || "x";

  const catList = Object.entries(categorized)
    .filter(([cat]) => !["Owner", "Privado"].includes(cat))
    .map(([cat, cmds]) => {
      const info = CATEGORIES[cat] || { emoji: "📁" };
      return `${info.emoji} **${cat}** ${EMOJI.arrow} \`${cmds.length}\` cmd${cmds.length !== 1 ? "s" : ""}`;
    })
    .join("\n");

  const ping = client.ws.ping < 0 ? 0 : client.ws.ping;

  return new EmbedBuilder()
    .setColor(0xff9eb5)
    .setAuthor({
      name: `Hoshiko • Centro de Ayuda Oficial`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.flower} Manual de Usuario y Documentación del Sistema`)
    .setDescription(
      `> *${welcomeLine}*\n\n` +
      `${EMOJI.sparkle} **${totalCmds} comandos** disponibles para tu servidor.\n` +
      `Usa el menú desplegable para navegar por categorías o consulta las secciones destacadas 🐾\n\n` +
      `${SEPARATOR}`
    )
    .addFields(
      {
        name: `${EMOJI.shield} Secciones Prioritarias de Seguridad`,
        value: [
          `🛡️ **Centro de Moderación:** Flujo disciplinario, jerarquía y logs en tiempo real.`,
          `🚨 **Defensa Anti-Raid [BETA]:** Detección de Join-Flood y neutralización Anti-Nuke.`,
        ].join("\n"),
        inline: false,
      },
      {
        name: `${EMOJI.paw} Categorías Disponibles`,
        value: catList || "*Sin categorías disponibles.*",
        inline: true,
      },
      {
        name: `${EMOJI.prefix} Activadores`,
        value: [
          `\`/\` — Comandos de barra (Slash)`,
          `\`${prefix}\` — Prefijo clásico de texto`,
          `\`hoshi ask\` — Consulta rápida`,
          `*IA conversacional en mantenimiento*`,
        ].join("\n"),
        inline: true,
      },
      {
        name: `${EMOJI.ping} Estado del Sistema`,
        value: [
          `Latencia: \`${ping}ms\``,
          `Servidores: \`${client.guilds.cache.size.toLocaleString()}\``,
          `Núcleo: \`Discord.js v14\``,
        ].join("\n"),
        inline: true,
      },
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Solicitado por ${user.username} • Expira en 2 min`,
      iconURL: user.displayAvatarURL(),
    })
    .setTimestamp();
}

export function buildCategoryEmbed(
  client: HoshikoClient,
  category: string,
  commands: { name: string; desc: string }[],
  page: number = 1,
  pageSize: number = 8,
): EmbedBuilder {
  const info = CATEGORIES[category] || {
    emoji: "📁",
    desc: "Comandos",
    flavor: "Aquí tienes lo que buscas.",
    color: 0xff8fab,
  };

  const totalPages = Math.max(1, Math.ceil(commands.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const currentCommands = commands.slice(start, start + pageSize);

  const cmdList =
    currentCommands.length > 0
      ? currentCommands
          .map((c) => {
            const shortDesc =
              c.desc.length > 70 ? c.desc.substring(0, 67) + "..." : c.desc;
            return `${EMOJI.divider} \`/${c.name}\`\n\u200b \u200b \u200b *${shortDesc}*`;
          })
          .join("\n\n")
      : `*${EMOJI.moon} No hay comandos registrados en esta categoría.*`;

  const embed = new EmbedBuilder()
    .setColor(info.color)
    .setAuthor({
      name: `${info.emoji} ${category}  ·  ${commands.length} comando${commands.length !== 1 ? "s" : ""}`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${info.emoji} Sección: ${category}`)
    .setDescription(
      `> *${info.flavor}*\n\n` +
      `💡 *Selecciona un comando en el menú desplegable inferior para ver sus parámetros y permisos.*\n\n` +
      `${SEPARATOR}\n\n` +
      `${cmdList}`
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Página ${currentPage}/${totalPages} • Expira en 2 min`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();

  return embed;
}

export function buildCommandDetailEmbed(
  client: HoshikoClient,
  detail: CommandDetail,
): EmbedBuilder {
  const catInfo = CATEGORIES[detail.category] || {
    emoji: "📁",
    color: 0xff8fab,
  };

  let statusBadge = "✅ Operativa";
  if (detail.status === "beta") statusBadge = "🧪 En fase Beta";
  if (detail.status === "configuracion_requerida")
    statusBadge = "⚙️ Requiere configuración previa";
  if (detail.status === "mantenimiento")
    statusBadge = "🚧 En mantenimiento / Desactivado";

  const embed = new EmbedBuilder()
    .setColor(catInfo.color)
    .setAuthor({
      name: `${catInfo.emoji} ${detail.category} › /${detail.name}`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`🌸 Comando: \`/${detail.name}\``)
    .setDescription(
      `**Propósito:**\n${detail.purpose}\n\n` +
      `**Sintaxis de uso:**\n\`${detail.syntax}\`\n\n` +
      `**Estado:** ${statusBadge}` +
      (detail.statusNote ? ` — *${detail.statusNote}*` : "") +
      `\n\n${SEPARATOR}`
    );

  if (detail.subcommands && detail.subcommands.length > 0) {
    const subs = detail.subcommands
      .map((s) => `${EMOJI.divider} \`${s.name}\`: ${s.desc}`)
      .join("\n");
    embed.addFields({
      name: "⚙️ Subcomandos Disponibles",
      value: subs.length > 1024 ? subs.substring(0, 1020) + "..." : subs,
      inline: false,
    });
  }

  if (detail.options && detail.options.length > 0) {
    const opts = detail.options
      .map(
        (o) =>
          `${EMOJI.divider} \`${o.name}\`${o.required ? " *(Obligatorio)*" : " *(Opcional)*"}: ${o.desc}` +
          (o.type ? ` \`[${o.type}]\`` : "")
      )
      .join("\n");
    embed.addFields({
      name: "📋 Parámetros y Opciones",
      value: opts.length > 1024 ? opts.substring(0, 1020) + "..." : opts,
      inline: false,
    });
  }

  const permsUser = detail.userPerms?.join(", ") || "Todos los miembros";
  const permsBot = detail.botPerms?.join(", ") || "Permisos estándar de bot";

  embed.addFields(
    {
      name: "🔑 Permisos Requeridos",
      value: `**Usuario:** ${permsUser}\n**Hoshiko:** ${permsBot}`,
      inline: false,
    },
  );

  if (detail.roleHierarchyNote || detail.prerequisites || detail.limitations) {
    const notes: string[] = [];
    if (detail.roleHierarchyNote)
      notes.push(`**Jerarquía:** ${detail.roleHierarchyNote}`);
    if (detail.prerequisites)
      notes.push(`**Requisito:** ${detail.prerequisites}`);
    if (detail.limitations)
      notes.push(`**Límites:** ${detail.limitations}`);

    embed.addFields({
      name: "⚠️ Condiciones y Restricciones",
      value: notes.join("\n"),
      inline: false,
    });
  }

  if (detail.reversibility || detail.logsGenerated) {
    const auditInfo: string[] = [];
    if (detail.reversibility)
      auditInfo.push(`**Reversibilidad:** ${detail.reversibility}`);
    if (detail.logsGenerated)
      auditInfo.push(`**Registro:** ${detail.logsGenerated}`);

    embed.addFields({
      name: "🛡️ Auditoría y Consecuencias",
      value: auditInfo.join("\n"),
      inline: false,
    });
  }

  if (detail.examples && detail.examples.length > 0) {
    embed.addFields({
      name: "💡 Ejemplos Prácticos",
      value: detail.examples.map((ex) => `\`${ex}\``).join("\n"),
      inline: false,
    });
  }

  embed
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Documentación Técnica • Expira en 2 min`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();

  return embed;
}
