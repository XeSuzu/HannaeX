import { ActivityType, Client, Events } from "discord.js";
import { initVoiceSessionClient } from "../../Events/Client/voiceStateUpdate";
import { HoshikoClient } from "../../index";
import ActiveRole from "../../Models/ActiveRole";
import { HoshikoLogger, LogLevel } from "../../Security";
import { Logger } from "../../Utils/SystemLogger";

const STATUS_LIST: { text: string; type: ActivityType }[] = [
  { text: "en {servers} servidores 🏠", type: ActivityType.Watching },
  { text: "/help | 🐱 Neko Mode", type: ActivityType.Playing },
  { text: "a {users} usuarios 👥", type: ActivityType.Listening },
  { text: "que todo brille 🌟", type: ActivityType.Competing },
  { text: "música lo-fi ☕", type: ActivityType.Listening },
];

function startActivityRotator(client: HoshikoClient) {
  let currentIndex = 0;

  const updateStatus = async () => {
    try {
      if (!client.user) return;

      const totalUsers = client.guilds.cache.reduce(
        (acc, guild) => acc + guild.memberCount,
        0,
      );

      const totalServers = client.guilds.cache.size;

      const fmtUsers = new Intl.NumberFormat("es-ES").format(totalUsers);
      const fmtServers = new Intl.NumberFormat("es-ES").format(totalServers);

      const config = STATUS_LIST[currentIndex];

      client.user.setPresence({
        activities: [
          {
            name: config.text
              .replace("{users}", fmtUsers)
              .replace("{servers}", fmtServers),
            type: config.type,
          },
        ],
        status: "online",
      });

      currentIndex = (currentIndex + 1) % STATUS_LIST.length;
    } catch (error) {
      await HoshikoLogger.log({
        level: LogLevel.ERROR,
        context: "PresenceRotator",
        message: "Error actualizando presencia",
        metadata: error,
      });
    }
  };

  updateStatus();
  setInterval(updateStatus, 15000);
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(_readyClient: Client<true>, client: HoshikoClient) {
    if (!client.user) return;

    const bootStart = Date.now();

    console.log("\n╭──────────────────────────────────────╮");
    console.log("│        🌸 Hoshiko Online 🌸         │");
    console.log("╰──────────────────────────────────────╯");
    console.log(`   👤 Usuario: ${client.user.tag}`);
    console.log(`   🏠 Servidores: ${client.guilds.cache.size}`);
    console.log(`   🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
    console.log("");

    await Logger.logBotRestart("Bot iniciado correctamente");

    // 🎤 Registrar client para sesiones de voz
    initVoiceSessionClient(client);
    console.log("   🎤 Gestor de sesiones de voz activo");

    // ─────────────────────────────────────
    // 🎀 Rotador de estados
    // ─────────────────────────────────────
    startActivityRotator(client);
    console.log("   ✨ Presencia dinámica activada");

    // ─────────────────────────────────────
    // ⏰ Limpieza de roles temporales
    // ─────────────────────────────────────
    setInterval(async () => {
      try {
        const now = new Date();

        const expiredRoles = await ActiveRole.find({
          expiresAt: { $lte: now },
        }).limit(200);

        if (!expiredRoles.length) return;

        const tasks = expiredRoles.map(async (doc) => {
          try {
            const guild = client.guilds.cache.get(doc.guildId);
            if (!guild) return;

            const member =
              guild.members.cache.get(doc.userId) ??
              (await guild.members.fetch(doc.userId).catch(() => null));

            if (member) {
              await member.roles.remove(doc.roleId).catch(() => null);
            }
          } finally {
            await ActiveRole.deleteOne({ _id: doc._id });
          }
        });

        await Promise.allSettled(tasks);

        console.log(`   🧹 Roles temporales limpiados: ${expiredRoles.length}`);
      } catch (error) {
        await HoshikoLogger.log({
          level: LogLevel.ERROR,
          context: "RoleCleanup",
          message: "Error en limpieza de roles temporales",
          metadata: error,
        });
      }
    }, 60 * 1000);

    console.log("   ⏰ Limpieza automática activa (1m)");

    const bootTime = Date.now() - bootStart;

    console.log("");
    console.log(`✨ Sistema estable | Startup: ${bootTime}ms`);
    console.log("────────────────────────────────────────\n");
  },
};
