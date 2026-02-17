import {
  Events,
  GuildMember,
  EmbedBuilder,
  TextChannel,
  Colors,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import ServerConfig from "../../../Models/serverConfig";

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember, client: HoshikoClient) {
    // Ignoramos a los bots
    if (member.user.bot) return;

    // Variables para el reporte (Log)
    let rolesGivenNames: string[] = [];
    let errorOccurred: string | null = null;
    let settings = null;

    try {
      // 1. Cargar configuración
      settings = await ServerConfig.findOne({ guildId: member.guild.id });

      // 2. Verificar si Auto-Join está activo
      if (
        !settings ||
        !settings.autoJoin ||
        !settings.autoJoin.enabled ||
        settings.autoJoin.roles.length === 0
      ) {
        return;
      }

      const rolesToGive: string[] = [];
      const botMember = member.guild.members.me;

      if (!botMember)
        throw new Error("No puedo encontrarme a mí misma en el servidor.");

      const botHighestRole = botMember.roles.highest.position;

      // 3. Filtrar roles válidos
      for (const roleId of settings.autoJoin.roles) {
        const role = member.guild.roles.cache.get(roleId);

        // Solo agregamos si existe y está POR DEBAJO del rol del bot
        if (role) {
          if (role.position < botHighestRole) {
            rolesToGive.push(roleId);
            rolesGivenNames.push(role.name); // Guardamos el nombre para el reporte
          } else {
            // Opcional: Avisar en consola si un rol es muy alto
            console.warn(
              `[AutoJoin] Rol "${role.name}" omitido por jerarquía.`,
            );
          }
        }
      }

      // 4. Otorgar los roles
      if (rolesToGive.length > 0) {
        await member.roles.add(
          rolesToGive,
          "🤖 Hoshiko Auto-Join: Bienvenida automática",
        );
      } else {
        // Si estaba activado pero no pudimos dar ninguno
        if (settings.autoJoin.roles.length > 0) {
          errorOccurred =
            "No pude dar ningún rol. Verifique que mi rol esté por encima de los roles a dar.";
        }
      }
    } catch (error: any) {
      console.error(`❌ Error en Auto-Join (${member.guild.name}):`, error);
      errorOccurred = error.message || "Error desconocido.";
    }

    // Enviar reporte al canal de logs si existe y hay actividad relevante
    // Condiciones: configuración presente, canal definido, y cambios o errores
    if (
      settings &&
      settings.modLogChannel &&
      (rolesGivenNames.length > 0 || errorOccurred)
    ) {
      try {
        const logChannel = member.guild.channels.cache.get(
          settings.modLogChannel,
        ) as TextChannel;

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({
              text: "Auto-Join System",
              iconURL: member.user.displayAvatarURL(),
            });

          if (errorOccurred) {
            embed
              .setTitle("Alerta de Auto-Join")
              .setColor(Colors.Red)
              .setDescription(
                `Error al otorgar roles a **${member.user.tag}**.`,
              )
              .addFields({ name: "Error", value: `\`${errorOccurred}\`` });
          } else {
            embed
              .setTitle("Roles Asignados")
              .setColor(Colors.Green)
              .setDescription(
                `El usuario **${member.user.tag}** ha recibido roles asignados automáticamente.`,
              )
              .addFields({
                name: "Roles Añadidos",
                value: rolesGivenNames.map((r) => `\`@${r}\``).join(", "),
              });
          }

          await logChannel.send({ embeds: [embed] });
        }
      } catch (e) {
        // Si falla el envío al canal de logs, no hacemos nada para no spamear la consola
        // console.error("No pude enviar el log al canal.");
      }
    }
  },
};
