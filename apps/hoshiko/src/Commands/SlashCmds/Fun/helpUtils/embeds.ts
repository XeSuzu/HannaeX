import { EmbedBuilder } from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { BANNER_URL, CATEGORIES, EMOJI, SEPARATOR } from "./config";
import type { CommandDetail } from "./commandDetails";
import { buildModerationEmbed } from "./moderationHelp";
import { truncate } from "../../../../Utils/discordSafety";

export { buildModerationEmbed };

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
      name: `Hoshiko v2.0.0 • Centro de Documentación y Descubrimiento`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.flower} Explora las Capacidades de Hoshiko`)
    .setDescription(
      `> *${welcomeLine}*\n\n` +
      `${EMOJI.sparkle} **${totalCmds} comandos** disponibles para tu servidor.\n` +
      `Usa el menú desplegable inferior para navegar por categorías o ver detalles de cada comando ✨\n\n` +
      `${SEPARATOR}`
    )
    .addFields(
      {
        name: `${EMOJI.shield} Moderación y Convivencia`,
        value: `🛡️ **Centro de Moderación y AutoMod:** Filtros avanzados contra spam, palabras prohibidas, numeración atómica de casos y registros en tiempo real.`,
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
          `\`@Hoshiko\` — Mención para charlar con IA`,
          `\`/ai panel\` — Cuotas y memoria soberana`,
        ].join("\n"),
        inline: true,
      },
      {
        name: `${EMOJI.ping} Estado del Sistema`,
        value: [
          `Versión: \`v2.0.0\``,
          `Latencia: \`${ping}ms\``,
          `Servidores: \`${client.guilds.cache.size.toLocaleString()}\``,
        ].join("\n"),
        inline: true,
      },
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `Hoshiko v2.0.0 • Solicitado por ${user.username} • Sesión activa por 3 min`,
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
      text: `Hoshiko v2.0.0 • Página ${currentPage}/${totalPages} • Sesión activa por 3 min`,
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
      value: truncate(subs, 1024),
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
      value: truncate(opts, 1024),
      inline: false,
    });
  }

  const permsUser = detail.userPerms?.join(", ") || "Todos los miembros";
  const permsBot = detail.botPerms?.join(", ") || "Permisos estándar de bot";

  embed.addFields(
    {
      name: "🔑 Permisos Requeridos",
      value: truncate(`**Usuario:** ${permsUser}\n**Hoshiko:** ${permsBot}`, 1024),
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
      value: truncate(notes.join("\n"), 1024),
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
      value: truncate(auditInfo.join("\n"), 1024),
      inline: false,
    });
  }

  if (detail.examples && detail.examples.length > 0) {
    embed.addFields({
      name: "💡 Ejemplos Prácticos",
      value: truncate(detail.examples.map((ex) => `\`${ex}\``).join("\n"), 1024),
      inline: false,
    });
  }

  embed
    .setImage(BANNER_URL)
    .setFooter({
      text: `Hoshiko v2.0.0 • Documentación Técnica • Sesión activa por 3 min`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();

  return embed;
}
