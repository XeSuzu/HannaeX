import { Events, Guild, REST, Routes, EmbedBuilder } from "discord.js";
import path from "path";
import fs from "fs";
import { HoshikoClient } from "../../../index";
import "dotenv/config";

export = {
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
      .setTitle("🌸 ¡Bienvenido a bordo, nya~!")
      .setDescription(
        `¡Hola, **${owner.user.username}**! 🐾\n\n` +
        `Soy **Hoshiko**, y a partir de hoy formo parte de **${guild.name}**. ` +
        `Estoy aquí para ayudar, animar y cuidar de tu comunidad como se merece. ✨\n\n` +
        `Me tomo muy en serio cada servidor que me invita, así que puedes contar conmigo ` +
        `para moderar, responder, entretener y hasta charlar un rato cuando lo necesites. 🐱\n\n` +
        `Eso sí, una cosita antes de empezar:\n\n` +
        `> 🚧 **Todavía estoy en Beta, mya.**\n` +
        `> Aún estoy afinando cosas y puede que de vez en cuando algo no salga perfecto. ` +
        `Pero eso no me detiene, nyaa~ Cada día que pasa soy un poco mejor que ayer. 💪\n\n` +
        `Y aquí es donde entras tú. Tu opinión no es opcional para mí, ` +
        `es lo que marca la diferencia entre un bot mediocre y uno que de verdad vale la pena. ` +
        `Cada reporte, cada sugerencia, cada "oye esto podría mejorar"... ` +
        `lo recibo, lo proceso y lo convierto en algo mejor. 🌟\n\n` +
        `Así que bienvenido al equipo, **${owner.user.username}**. ` +
        `Hagamos algo bonito juntos. 🌸🐾`,
      )
      .addFields(
        {
          name: "🐛 ¿Algo salió mal?",
          value: "Usa `/report` y cuéntame qué pasó. Orejas atentas~ 🐾",
          inline: false,
        },
        {
          name: "💡 ¿Se te ocurrió algo?",
          value: "Mándame tu idea con `/sugerencia`. Si es buena, la implementamos. 👀✨",
          inline: false,
        },
        {
          name: "📖 ¿Por dónde empezamos?",
          value: "Escribe `/help` y te cuento todo lo que tengo guardado bajo la patita. 🌟",
          inline: false,
        },
        {
          name: "⭐ ¿Te caigo bien?",
          value: "Compartirme con otros servidores es el mejor mimo que me puedes dar. Nyaa~ 💕",
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
