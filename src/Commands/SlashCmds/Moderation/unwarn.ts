import { 
    ChatInputCommandInteraction, 
    PermissionFlagsBits, 
    SlashCommandBuilder, 
    EmbedBuilder,
    GuildMember 
} from 'discord.js';
import { InfractionManager, userPoints } from '../../../Features/InfractionManager';

export default {
    category: 'Moderation',
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Limpia el historial o resta puntos de infracción a un usuario.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El usuario al que quieres perdonar.')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) return;

        const target = interaction.options.getMember('usuario') as GuildMember;

        if (!target) {
            await interaction.reply({ content: "❌ No pude encontrar a ese usuario.", ephemeral: true });
            return;
        }

        try {
            // 1. Lógica de limpieza 🌸
            const key = `${interaction.guild.id}-${target.id}`;
            
            // Si quieres restar puntos específicos en lugar de borrar todo:
            const currentPoints = userPoints.get(key) || 0;
            const newPoints = Math.max(0, currentPoints - 10); // Restamos 10 pero no bajamos de 0
            
            if (newPoints === 0) {
                userPoints.delete(key);
            } else {
                userPoints.set(key, newPoints);
            }

            // 2. Notificar al sistema de logs
            await InfractionManager.addPoints(target, "Perdón parcial: Puntos removidos por Staff", interaction as any);

            const embed = new EmbedBuilder()
                .setTitle('✨ Hoshiko Perdona')
                .setDescription(`Se han reducido las infracciones de **${target.user.tag}**.`)
                .addFields(
                    { name: '📊 Estado actual', value: `\`${newPoints} puntos\`` }
                )
                .setColor(0x00ff7f)
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Hoshiko Sentinel 📡' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("💥 Error en comando unwarn:", error);
            await interaction.reply({ content: "🌸 Hubo un error al intentar quitar los puntos.", ephemeral: true });
        }
    },
};