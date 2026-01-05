import { Guild, User, EmbedBuilder, TextChannel } from 'discord.js';
import GuildConfig from '../Models/GuildConfig';
import { HoshikoClient } from '../index';

/**
 * Revisa si un usuario ha alcanzado un umbral de puntos para una acción automática.
 */
export async function checkAutoActions(client: HoshikoClient, guild: Guild, user: User, totalPoints: number) {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  if (!config || !config.autoActions || config.autoActions.length === 0) {
    return;
  }

  // Buscamos la acción con el puntaje más alto alcanzado
  // Usamos (as any[]) para que TS no se queje de la estructura del Schema
  const applicableAction = (config.autoActions as any[])
    .sort((a, b) => b.points - a.points)
    .find(action => totalPoints >= action.points);

  if (!applicableAction) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member || member.id === client.user?.id || member.id === guild.ownerId) return;

  const reason = `Acción automática: alcanzó ${totalPoints} puntos de strike.`;

  try {
    switch (applicableAction.action) {
      case 'timeout':
        if (member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()) {
          return;
        }
        // CORRECCIÓN: Aseguramos que sea number o null, nunca undefined
        const duration = typeof applicableAction.duration === 'number' ? applicableAction.duration : null;
        await member.timeout(duration, reason);
        break;
      case 'kick':
        await member.kick(reason);
        break;
      case 'ban':
        await member.ban({ reason });
        break;
    }

    // Notificar en el canal de logs
    if (config.modLogChannel) {
      const logChannel = await guild.channels.fetch(config.modLogChannel).catch(() => null) as TextChannel | null;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🚨 Moderación Automática 🚨')
          .setDescription(`Se aplicó **${applicableAction.action.toUpperCase()}** a ${user.tag} por acumular **${totalPoints}** puntos.`)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    console.error(`Error al ejecutar acción automática:`, error);
  }
}