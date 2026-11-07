import mongoose from "mongoose";
import {
  Events,
  Interaction,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { createSecurityClient } from "./client/SecurityClient";
import { SecurityConfig } from "./config/SecurityConfig";
import { SentinelNetwork } from "./modules/sentinel/SentinelNetwork";
import { AntiRaid } from "./modules/antiraid/AntiRaid";
import { executeRaidAction } from "./modules/antiraid/raidAlertManager";
import { AntiNukeManager } from "./modules/antinuke/AntiNukeManager";
import { HoneypotManager } from "./modules/honeypot/honeypotHandler";
import { LockdownManager } from "./modules/lockdown/lockdownManager";

export async function startSecurityBot(): Promise<boolean> {
  const env = SecurityConfig.load();

  if (!SecurityConfig.isConfigured()) {
    console.log(
      "[Hoshiko Security] ℹ️ La aplicación no dispone de credenciales configuradas (HOSHIKO_SECURITY_TOKEN no definido).",
    );
    console.log(
      "[Hoshiko Security] Para activar Hoshiko Security de forma independiente, configure HOSHIKO_SECURITY_TOKEN en .env.security.",
    );
    return false;
  }

  console.log("[Hoshiko Security] Iniciando bot especializado de seguridad...");

  // Conexión opcional a MongoDB si está especificada
  if (env.MONGO_URI) {
    try {
      await mongoose.connect(env.MONGO_URI);
      console.log("[Hoshiko Security] Conectado a MongoDB correctamente.");
    } catch (err) {
      console.error("[Hoshiko Security] Error conectando a MongoDB:", err);
    }
  }

  const client = createSecurityClient();

  // Registro de Eventos Especializados de Seguridad
  client.on(Events.ClientReady, () => {
    console.log(
      `[Hoshiko Security] 🛡️ Conectado como ${client.user?.tag} (${client.user?.id})`,
    );
  });

  // 1. Sentinel Network & Anti-Raid al unirse nuevos miembros
  client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // Verificar si el servidor está en Lockdown
    if (LockdownManager.isLockedDown(member.guild.id)) {
      if (member.kickable) {
        await member
          .send(
            `🔒 **${member.guild.name}** se encuentra en modo de emergencia (Lockdown). Entrada denegada por seguridad.`,
          )
          .catch(() => null);
        await member.kick("Hoshiko Security: Lockdown activo").catch(() => null);
      }
      return;
    }

    // Comprobación de lista negra global Sentinel
    const bannedBySentinel = await SentinelNetwork.checkMember(member);
    if (bannedBySentinel) return;

    // Detección de ráfagas Anti-Raid
    await AntiRaid.handleJoin(member);
  });

  // 2. Anti-Nuke: Roles, Canales y Baneos
  client.on(Events.GuildRoleDelete, async (role) => {
    await AntiNukeManager.handleRoleDelete(role);
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if ("guild" in channel) {
      await AntiNukeManager.handleChannelDelete(channel as any);
    }
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    await AntiNukeManager.handleBanAdd(ban);
  });

  // 3. Honeypot en mensajes
  client.on(Events.MessageCreate, async (message) => {
    await HoneypotManager.handleMessage(message);
  });

  // 4. Interacciones de contención de incidentes de seguridad
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.guild || !interaction.memberPermissions) return;

    if (
      interaction.customId.startsWith("security_raid:") ||
      interaction.customId.startsWith("raid_act:")
    ) {
      const [, rawAction, episodeId] = interaction.customId.split(":");
      const action = (
        ["apply", "timeout", "ban", "undo"].includes(rawAction)
          ? rawAction
          : "timeout"
      ) as "apply" | "timeout" | "ban" | "undo";

      const needsBanPerm = action === "ban" || action === "apply";
      const hasPerm = needsBanPerm
        ? interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)
        : interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers);

      if (!hasPerm) {
        await interaction.reply({
          content: `⛔ Requiere permiso de **${needsBanPerm ? "Banear Miembros" : "Moderar Miembros"}** para ejecutar esta contención.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const res = await executeRaidAction({
        guild: interaction.guild,
        episodeId,
        action,
        moderator: interaction.user,
      });

      await interaction.editReply({
        content: res.message,
      });
    }
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`[Hoshiko Security] Señal ${signal} recibida. Apagando ordenadamente...`);
    try {
      await client.destroy();
    } catch {}
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {}
    process.exit(0);
  };

  process.once("SIGINT", () => void gracefulShutdown("SIGINT"));
  process.once("SIGTERM", () => void gracefulShutdown("SIGTERM"));

  try {
    await client.login(env.HOSHIKO_SECURITY_TOKEN);
    return true;
  } catch (loginErr) {
    console.error("[Hoshiko Security] Error durante el login:", loginErr);
    return false;
  }
}

// Punto de entrada si se ejecuta directamente con node o ts-node
if (require.main === module) {
  void (async () => {
    const started = await startSecurityBot();
    if (!started) {
      process.exitCode = 0;
    }
  })();
}
