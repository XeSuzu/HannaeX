import { EmbedBuilder } from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { BANNER_URL, EMOJI, SEPARATOR } from "./config";

export function buildModerationEmbed(client: HoshikoClient): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff6b6b)
    .setAuthor({
      name: "Hoshiko • Sistema de Moderación y Seguridad",
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.shield} Centro de Comando y Moderación Integral`)
    .setDescription(
      `> *Herramientas de protección activa para el equipo de staff y administradores.*\n\n` +
      `Hoshiko ofrece un ecosistema completo para salvaguardar la convivencia comunitaria, combinando disciplina manual, auditoría en tiempo real y automatismos reactivos.\n\n` +
      `${SEPARATOR}`
    )
    .addFields(
      {
        name: "⚖️ Flujo Disciplinario Progresivo",
        value: [
          `**1. Advertencia (` + "`" + `/warn` + "`" + `):** Registro formal en base de datos. Acumulable y consultable con ` + "`" + `/warnings` + "`" + `.`,
          `**2. Aislamiento (` + "`" + `/tempmute` + "`" + ` | ` + "`" + `/mute` + "`" + `):** Timeouts nativos de Discord (máximo 28 días). Impide chat, reacciones y voz. Reversible con ` + "`" + `/unmute` + "`" + `.`,
          `**3. Expulsión (` + "`" + `/kick` + "`" + `):** Retira al miembro pero le permite reingresar con una invitación válida.`,
          `**4. Softban (` + "`" + `/softban` + "`" + `):** Banea y desbanea de inmediato purgando de 1 a 7 días de historial de mensajes.`,
          `**5. Baneo (` + "`" + `/ban` + "`" + ` | ` + "`" + `/tempban` + "`" + `):** Bloqueo total permanente o con vencimiento automático. Reversible con ` + "`" + `/unban` + "`" + `.`,
          `**6. Baneo Masivo (` + "`" + `/massban` + "`" + `):** Mitigación secuencial por lotes para expulsar decenas de cuentas atacantes.`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "🛡️ Jerarquía de Roles y Reglas de Discord",
        value: [
          `${EMOJI.divider} **Jerarquía Estricta:** Hoshiko **no puede** sancionar, silenciar ni expulsar a ningún usuario cuyo rol sea igual o superior al rol más alto del bot.`,
          `${EMOJI.divider} **Permisos del Moderador:** Los comandos verifican que el moderador que ejecuta la acción tenga facultades reales en el servidor.`,
          `${EMOJI.divider} **Inmunidad del Propietario:** El dueño del servidor y administradores están exentos de sanciones automáticas.`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "📋 Auditoría y Registros (Mod-Log)",
        value: [
          `Cada sanción disciplinaria y revocación genera un evento estructurado en el canal configurado (` + "`" + `/setup-logs` + "`" + `):`,
          `${EMOJI.divider} Usuario afectado e ID permanente.`,
          `${EMOJI.divider} Moderador ejecutor (o Hoshiko Auto-Mod).`,
          `${EMOJI.divider} Motivo documentado y duración exacta.`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "⚙️ Configuración y Ajustes Rápidos",
        value: [
          `\`</setup:0>\` — Panel interactivo de seguridad y personalización.`,
          `\`</setup-logs:0>\` — Configuración de canales de moderación y auditoría.`,
          `\`</setup-automod:0>\` — Control de módulos automáticos y lista de excepciones.`,
          `\`</whitelist:0>\` — Gestión de dominios web permitidos en el chat.`,
        ].join("\n"),
        inline: false,
      },
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Protección y Moderación • Expira en 2 min`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}
