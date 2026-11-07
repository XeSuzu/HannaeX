import { Events, Guild, REST, Routes, EmbedBuilder } from "discord.js";
import path from "path";
import fs from "fs";
import type { HoshikoClient } from "../../../client/HoshikoClient";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { applyPreset } from "../../../Features/automod/automodPresets";

export default {
  name: Events.GuildCreate,

  async execute(guild: Guild, client: HoshikoClient) {
    console.log(`🌸 Bot unido al servidor: ${guild.name} (${guild.id})`);

    // =================================================================
    // 📦 REGISTRO DE COMANDOS
    // =================================================================
    const slashPath = path.join(__dirname, "../../../Commands/SlashCmds");

    if (!fs.existsSync(slashPath)) {
      console.warn(`⚠️ No se encontró la carpeta de comandos en: ${slashPath}`);
    } else {
      const publicCommands: any[] = [];
      const ownerCommands: any[] = [];
      const folders = fs.readdirSync(slashPath);

      for (const folder of folders) {
        const folderPath = path.join(slashPath, folder);
        const commandFiles = fs
          .readdirSync(folderPath)
          .filter((f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts"));

        for (const file of commandFiles) {
          try {
            const filePath = path.join(folderPath, file);
            delete require.cache[require.resolve(filePath)];

            const commandModule = require(filePath);
            const command = commandModule.default || commandModule;

            if (command && command.data) {
              const cmdJson = command.data.toJSON();
              if (command.category === "Owner" || folder === "Owner") {
                ownerCommands.push(cmdJson);
              } else {
                publicCommands.push(cmdJson);
              }
            }
          } catch (err: any) {
            console.error(`❌ Error cargando ${file}:`, err.message);
          }
        }
      }

      const rest = new REST({ version: "10" }).setToken(client.config.token!);
      const ownerGuildId = process.env.GUILD_ID;

      let payload = publicCommands;
      let typeLog = "PÚBLICOS";

      if (ownerGuildId && guild.id === ownerGuildId) {
        payload = [...publicCommands, ...ownerCommands];
        typeLog = "TOTALES (Incluye Admin)";
      }

      try {
        console.log(`📤 Instalando ${payload.length} comandos ${typeLog}...`);
        await rest.put(
          Routes.applicationGuildCommands(client.config.BotId!, guild.id),
          { body: payload },
        );
        console.log(`✅ Registro exitoso en ${guild.name}`);
      } catch (err: any) {
        console.error(`❌ Error registrando comandos en ${guild.name}:`, err.message);
      }
    }

    // =================================================================
    // 🛡️ APLICAR PRESET DE SEGURIDAD POR DEFECTO EN SERVIDORES NUEVOS
    // =================================================================
    try {
      const existing = await SettingsManager.getLite(guild.id, "securityModules");
      if (!existing?.securityModules) {
        await applyPreset(guild.id, 2);
        console.log(`🛡️ [GuildCreate] Preset Nvl 2 (Estándar) aplicado a nuevo servidor: ${guild.name}`);
      }
    } catch (err: any) {
      console.error(`❌ [GuildCreate] Error aplicando preset de seguridad en ${guild.name}:`, err.message);
    }

    // =================================================================
    // 🌸 MENSAJE DE BIENVENIDA AL OWNER
    // =================================================================
    const owner = await guild.fetchOwner().catch(() => null);
    if (!owner) {
      console.warn(`⚠️ [GuildCreate] No se pudo obtener el owner de ${guild.name}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor("#ff9eb5")
      .setAuthor({
        name: "Hoshiko • Beta",
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTitle("🌸 ¡Hola! Gracias por invitarme a tu comunidad")
      .setDescription(
        `¡Hola, **${owner.user.username}**! ✨\n\n` +
        `Soy **Hoshiko**, y a partir de hoy formo parte de **${guild.name}**. ` +
        `Estoy aquí para acompañar, conectar y cuidar de tu comunidad como se merece.\n\n` +
        `Puedes contar conmigo para moderar, niveles, música y conversar cuando lo necesites. Cada pequeño detalle cuenta para que tu comunidad se sienta única.\n\n` +
        `> 💡 **En constante evolución:**\n` +
        `> Cada día trabajo para ser un poquito mejor. Si notas algún detalle o algo que podamos pulir, tu opinión es fundamental para seguir creciendo juntos.\n\n` +
        `Hagamos de **${guild.name}** un lugar especial ✨`,
      )
      .addFields(
        {
          name: "🐛 ¿Algo no salió como esperabas?",
          value: "Usa `/report` y cuéntame qué ocurrió para revisarlo de inmediato.",
          inline: false,
        },
        {
          name: "💡 ¿Tienes alguna idea?",
          value: "Compártela con `/sugerencia`. Nos encanta implementar lo que propone la comunidad.",
          inline: false,
        },
        {
          name: "📖 ¿Por dónde empezamos?",
          value: "Escribe `/help` para explorar todas las herramientas disponibles.",
          inline: false,
        },
        {
          name: "⭐ ¿Te gusta la experiencia?",
          value: "Recomendarme a otros servidores es la mejor forma de apoyar mi crecimiento ✨",
          inline: false,
        },
      )
      .setThumbnail(client.user?.displayAvatarURL({ size: 512 }) ?? null)
      .setImage("https://i.pinimg.com/originals/0d/f5/59/0df559e264fa08b7fa204f7c67a33926.gif")
      .setFooter({
        text: `Hoshiko Beta • ${guild.memberCount} miembros en ${guild.name} 🐾`,
        iconURL: guild.iconURL() ?? undefined,
      })
      .setTimestamp();

    // Intentar DM → fallback al canal del servidor
    try {
      await owner.send({ embeds: [embed] });
      console.log(`✅ [GuildCreate] DM enviado al owner de ${guild.name}`);
    } catch {
      console.warn(`⚠️ [GuildCreate] Owner tiene DMs cerrados. Intentando canal del servidor...`);

      const targetChannel =
        guild.systemChannel ??
        guild.channels.cache
          .filter((c) => c.isTextBased() && c.permissionsFor(guild.members.me!)?.has("SendMessages"))
          .first();

      if (targetChannel && targetChannel.isTextBased()) {
        try {
          await (targetChannel as any).send({
            content: `👋 Hola <@${owner.id}>!`,
            embeds: [embed],
          });
          console.log(`✅ [GuildCreate] Mensaje enviado en #${(targetChannel as any).name}`);
        } catch (err) {
          console.error(`❌ [GuildCreate] No se pudo enviar en ningún canal de ${guild.name}:`, err);
        }
      }
    }
  },
};
