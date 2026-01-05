import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  EmbedBuilder 
} from 'discord.js';
import { HoshikoClient } from '../../../index';
import { getStrikesForUser, getTotalPoints, clearStrikesForUser } from '../../../Database/strike';

interface SlashCommand {
  category: string;
  // Usamos un tipo flexible para el Builder
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | any;
  execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<any>;
}

const command: SlashCommand = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('strikes')
    .setDescription('Muestra los strikes de un usuario o limpia sus strikes.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
    .addBooleanOption(opt => opt.setName('clear').setDescription('Borrar todos los strikes (requiere permisos de moderación)').setRequired(false)),
  
  async execute(interaction, client) {
    // Verificación inicial por si acaso 
    if (!interaction.guild) {
      return interaction.reply({ content: 'Lo siento, este comando solo funciona dentro de un servidor. (◕︿◕✿)', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const target = interaction.options.getUser('usuario', true);
      const shouldClear = interaction.options.getBoolean('clear') ?? false;

      // Si se quiere limpiar strikes, verificamos permisos
      if (shouldClear) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        
        if (!member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return interaction.editReply({ 
            content: '¡Oh no! No tienes permiso para borrar strikes. Necesitas el permiso de "Moderar miembros".' 
          });
        }

        const deletedCount = await clearStrikesForUser(interaction.guild.id, target.id);
        return interaction.editReply({ 
          content: `🧹 ¡Limpio! Se eliminaron **${deletedCount}** strike(s) de **${target.tag}** correctamente.` 
        });
      }

      // Si solo queremos consultar
      const strikes = await getStrikesForUser(interaction.guild.id, target.id);
      const total = await getTotalPoints(interaction.guild.id, target.id);

      const embed = new EmbedBuilder()
        .setColor(0xEBA6D1)
        .setTitle(`📝 Historial de ${target.tag}`)
        .setDescription(`Puntos totales: **${total}**\nEntradas encontradas: **${strikes.length}**`)
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

      if (strikes.length === 0) {
        embed.addFields({ name: 'Estado', value: '¡Qué alegría! Este usuario no tiene strikes registrados. ✨' });
      } else {
        // Limitamos a 10 para que el embed no sea demasiado grande
        const list = strikes.slice(0, 10).map(s => {
          // Asegúrate de que createdAt sea un objeto Date válido
          const date = new Date(s.createdAt).toLocaleDateString();
          return `• [**${s.points} pts**] ${s.reason} — <@${s.moderatorId}> (${date})`;
        }).join('\n');

        embed.addFields({
          name: 'Últimos reportes',
          value: list,
          inline: false
        });

        if (strikes.length > 10) {
          embed.setFooter({ text: `Mostrando 10 de ${strikes.length} entradas totales.` });
        }
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('Error en /strikes:', err);
      await interaction.editReply({ content: 'Hubo un problemita al consultar la base de datos. ¡Inténtalo de nuevo más tarde! ฅ^•ﻌ•^ฅ' });
    }
  }
};

export default command;