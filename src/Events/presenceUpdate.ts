import { Events, Presence, GuildMember } from "discord.js";
import StatusConfig from "../Models/StatutsConfig";

export default {
  name: Events.PresenceUpdate,
  async execute(oldPresence: Presence | null, newPresence: Presence) {
    // 🌸 FIX: Ahora verificamos que 'member' exista antes de seguir
    if (!newPresence.guild || !newPresence.member || newPresence.user?.bot)
      return;

    const guild = newPresence.guild;
    const member = newPresence.member; // Ya no necesitamos el "as GuildMember" porque el check de arriba lo asegura

    // 1. BUSCAR CONFIGURACIÓN DE ESTE SERVIDOR
    const config = await StatusConfig.findOne({ guildId: guild.id });
    if (!config || !config.enabled) return;

    // 2. VERIFICAR SI EL USUARIO ESTÁ "CONECTADO"
    const isOnline =
      newPresence.status !== "offline" && newPresence.status !== "invisible";

    // 3. VERIFICAR SI TIENE EL TEXTO EN SU ESTADO
    const customStatus = newPresence.activities.find((act) => act.type === 4);
    const stateText = customStatus?.state || "";

    const hasText = stateText
      .toLowerCase()
      .includes(config.requiredText.toLowerCase());

    // 4. LÓGICA DE ASIGNACIÓN
    // Gracias al check del principio, member.roles ya es seguro de leer ✨
    const hasRole = member.roles.cache.has(config.targetRoleId);

    try {
      if (isOnline && hasText) {
        if (!hasRole) {
          await member.roles.add(config.targetRoleId);
          console.log(
            `[Status] Rol dado a ${member.user.tag} en ${guild.name}`,
          );
        }
      } else {
        if (hasRole) {
          await member.roles.remove(config.targetRoleId);
          console.log(
            `[Status] Rol quitado a ${member.user.tag} en ${guild.name}`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[Error] No pude gestionar el rol de estado para ${member.user.tag}:`,
        error,
      );
    }
  },
};
