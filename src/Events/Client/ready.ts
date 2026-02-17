import { ActivityType, Events } from "discord.js";
import { HoshikoClient } from "../../index";
import ActiveRole from "../../Database/Schemas/ActiveRole";

// Rotación de estados: lista de actividades mostradas en la presencia
// Se aceptan las variables `{users}` y `{servers}` que se reemplazan en tiempo real.
const STATUS_LIST = [
  { text: "en {servers} servidores 🏠", type: ActivityType.Watching },
  { text: "/help | 🐱 Neko Mode", type: ActivityType.Playing },
  { text: "a {users} usuarios 👥", type: ActivityType.Listening },
  { text: "que todo brille 🌟", type: ActivityType.Competing },
  { text: "música lo-fi ☕", type: ActivityType.Listening },
  { text: "protegiendo el chat 🛡️", type: ActivityType.Custom }, // Estado custom (opcional)
];

/** Rotador de actividad: actualiza presencia periódicamente. */
function startActivityRotator(client: HoshikoClient) {
  let currentIndex = 0;

  const updateStatus = () => {
    try {
      if (!client.user) return;

      // Calcular métricas en tiempo real
      const rawUsers = client.guilds.cache.reduce(
        (acc, guild) => acc + guild.memberCount,
        0,
      );
      const rawServers = client.guilds.cache.size;

      // Formatear números para visualización
      const fmtUsers = new Intl.NumberFormat("es-ES").format(rawUsers);
      const fmtServers = new Intl.NumberFormat("es-ES").format(rawServers);

      // Seleccionar estado actual
      const statusConfig = STATUS_LIST[currentIndex];

      // Reemplazar variables en el texto del estado
      const finalName = statusConfig.text
        .replace("{users}", fmtUsers)
        .replace("{servers}", fmtServers);

      // Aplicar la presencia al cliente
      client.user.setPresence({
        activities: [{ name: finalName, type: statusConfig.type as any }],
        status: "online",
      });

      // Avanzar al siguiente estado (ciclo)
      currentIndex = (currentIndex + 1) % STATUS_LIST.length;
    } catch (error) {
      console.error("⚠️ Error menor actualizando presencia:", error);
    }
  };

  // Ejecutar inmediatamente al iniciar
  updateStatus();

  // Rotar cada 15 segundos
  setInterval(updateStatus, 15000);

  console.log("🌟 [System] Rotador de estados iniciado correctamente.");
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: HoshikoClient) {
    if (!client.user) return;

    console.log("\n═══════════════════════════════════════");
    console.log(`🌸 ✨ ¡Hoshiko ha despertado!`);
    console.log(`💖 Conectada como: ${client.user.tag}`);
    console.log("═══════════════════════════════════════\n");

    // 1. Iniciar Estados (Versión Mejorada)
    startActivityRotator(client);

    // =========================================================
    // ⏰ SISTEMA DE LIMPIEZA DE ROLES TEMPORALES
    // =========================================================
    console.log("⏰ [System] Iniciando reloj de limpieza de roles...");

    setInterval(async () => {
      try {
        const now = new Date();
        const expiredRoles = await ActiveRole.find({
          expiresAt: { $lte: now },
        });

        // Solo logueamos si hay trabajo que hacer, para no llenar la consola
        if (expiredRoles.length > 0) {
          console.log(`🧹 Procesando ${expiredRoles.length} roles vencidos...`);
        }

        for (const doc of expiredRoles) {
          const guild = client.guilds.cache.get(doc.guildId);

          if (!guild) {
            await ActiveRole.deleteOne({ _id: doc._id });
            continue;
          }

          const member = await guild.members
            .fetch(doc.userId)
            .catch(() => null);

          if (member) {
            await member.roles.remove(doc.roleId).catch(() => null);
            // Opcional: Loguear en un canal de logs si quisieras
          }

          await ActiveRole.deleteOne({ _id: doc._id });
        }
      } catch (error) {
        console.error("❌ Error crítico en limpieza de roles:", error);
      }
    }, 60 * 1000); // 60 segundos
  },
};
