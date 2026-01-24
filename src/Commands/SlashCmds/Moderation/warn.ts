import { 
    ChatInputCommandInteraction, 
    PermissionFlagsBits, 
    SlashCommandBuilder, 
    EmbedBuilder,
    GuildMember
} from 'discord.js';
import { InfractionManager } from '../../../Features/InfractionManager';

export default {
    category: 'Moderation',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Añade una advertencia a un usuario y suma puntos de infracción.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El usuario al que deseas advertir.')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('motivo')
                .setDescription('Razón de la advertencia.')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) return;

        const target = interaction.options.getMember('usuario') as GuildMember;
        const reason = interaction.options.getString('motivo') || "Sin motivo especificado.";

        // 1. Validaciones de seguridad 🌸
        if (!target) {
            await interaction.reply({ content: "❌ No pude encontrar a ese usuario.", ephemeral: true });
            return;
        }

        if (target.id === interaction.user.id) {
            await interaction.reply({ content: "🌸 No puedes advertirte a ti mismo, tontito.", ephemeral: true });
            return;
        }

        // Evitar advertir a otros moderadores o al mismo bot
        if (target.permissions.has(PermissionFlagsBits.ModerateMembers) || target.user.bot) {
            await interaction.reply({ content: "❌ No puedo advertir a miembros del staff o a otros bots.", ephemeral: true });
            return;
        }

        try {
            // 2. Ejecutar la lógica de infracción ⚡
            // Ya no pasamos el "10", el Manager usa el valor de la DB.
            await InfractionManager.addPoints(target, reason, interaction as any);

            // 3. Respuesta visual
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Advertencia Registrada')
                .setDescription(`Se ha aplicado una infracción a **${target.user.tag}**.`)
                .addFields(
                    { name: '👤 Usuario', value: `<@${target.id}>`, inline: true },
                    { name: '👮 Moderador', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 Motivo', value: reason }
                )
                .setColor(0xffcc00) // Amarillo/Naranja de advertencia
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error en comando warn:', error);
            await interaction.reply({ content: '😿 Hubo un error al procesar la advertencia.', ephemeral: true });
        }
    },
};