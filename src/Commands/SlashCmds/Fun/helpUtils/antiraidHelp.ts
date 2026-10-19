import { EmbedBuilder } from "discord.js";
import type { HoshikoClient } from "../../../../client/HoshikoClient";
import { BANNER_URL, EMOJI, SEPARATOR } from "./config";

export function buildAntiraidEmbed(client: HoshikoClient): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff3366)
    .setAuthor({
      name: "Hoshiko • Sistema de Defensa Anti-Raid y Anti-Nuke",
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(`${EMOJI.beta} Sistema Anti-Raid y Protección de Servidor [BETA]`)
    .setDescription(
      `> ⚠️ **Aviso de Beta en Desarrollo:**\n` +
      `> *Este sistema se encuentra en fase beta evolutiva. Su cobertura, sensibilidad y algoritmos de mitigación están en optimización continua. No sustituye la debida diligencia de los administradores ni garantiza la prevención absoluta de todo vector de ataque.*\n\n` +
      `${SEPARATOR}`
    )
    .addFields(
      {
        name: "✅ 1. Capacidades Disponibles Actualmente",
        value: [
          `**Detección de Join-Flood (Entradas Masivas):**`,
          `${EMOJI.divider} Monitor en memoria RAM (` + "`" + `joinCache` + "`" + `) que rastrea ingresos en ventanas de 10 segundos.`,
          `${EMOJI.divider} Si se detecta un pico anormal de entradas, activa el **Modo Pánico** y despacha una alerta roja prioritaria a ` + "`" + `modLogChannel` + "`" + `.`,
          ``,
          `**Protección Anti-Nuke (Staff Comprometido / Rogues):**`,
          `${EMOJI.divider} **Baneos Masivos:** Si un moderador o bot no-owner ejecuta 4 o más baneos en 10s, Hoshiko le revoca de inmediato todos los roles administrativos.`,
          `${EMOJI.divider} **Eliminación de Canales/Roles:** Si se detecta borrado rápido de canales o roles, se neutraliza al ejecutor retirando sus permisos.`,
          ``,
          `**Defensa Contra Cross-Channel Spam:**`,
          `${EMOJI.divider} Detección de copias idénticas o variaciones de spam en múltiples canales en segundos -> Aislamiento automático.`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "⚠️ 2. Limitaciones Actuales y Requisitos",
        value: [
          `${EMOJI.divider} **Alerta vs Acción Autónoma:** En Join-Flood, Hoshiko actualmente emite una alerta prioritaria en el canal de logs para que el staff active ` + "`" + `/massban` + "`" + ` o pause invitaciones; no congela invitaciones automáticamente todavía.`,
          `${EMOJI.divider} **Jerarquía de Roles:** Hoshiko **no puede** neutralizar a miembros o bots que tengan un rol igual o superior al suyo en Discord.`,
          `${EMOJI.divider} **Configuración Necesaria:** Requiere activar el módulo con ` + "`" + `/setup-automod modulo nombre:Anti-Raid activo:True` + "`" + ` y definir ` + "`" + `/setup-logs` + "`" + `.`,
          `${EMOJI.divider} **Riesgo de Falsos Positivos:** Raids de invitación legítimos (ej: eventos masivos o raids de streamers) pueden disparar la alerta de Join-Flood.`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "🧪 3. En Evaluación y Futuras Mejoras",
        value: [
          `${EMOJI.divider} Pausa automática de enlaces de invitación de Discord durante picos extremos de Join-Flood.`,
          `${EMOJI.divider} Aislamiento / cuarentena automática preventiva de cuentas creadas hace menos de 24 horas durante alertas.`,
          `${EMOJI.divider} Umbrales dinámicos adaptados al tamaño histórico del servidor.`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "📌 4. Protocolo para el Administrador tras un Incidente",
        value: [
          `**Paso 1:** Revisa de inmediato el canal ` + "`" + `modlog` + "`" + ` para identificar el tipo de alerta (Join-Flood o Anti-Nuke).`,
          `**Paso 2:** Ejecuta ` + "`" + `/automod-history usuario:@sospechoso` + "`" + ` para analizar las infracciones registradas.`,
          `**Paso 3:** Si hubo cuentas de ataque masivo, utiliza ` + "`" + `/massban usuarios:<ID1 ID2...>` + "`" + ` para una purga rápida.`,
          `**Paso 4:** Verifica en los ajustes del servidor que el rol de Hoshiko se encuentre por encima de los roles que debe proteger.`,
        ].join("\n"),
        inline: false,
      },
    )
    .setImage(BANNER_URL)
    .setFooter({
      text: `${EMOJI.paw} Hoshiko • Sentinel Security Network [BETA] • Expira en 2 min`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
}
