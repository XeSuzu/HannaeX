import { 
    ChatInputCommandInteraction, 
    PermissionFlagsBits, 
    SlashCommandBuilder, 
    EmbedBuilder,
    GuildMember 
} from 'discord.js';
import { userPoints } from '../../../Features/InfractionManager';
import { SettingsManager } from '../../../Database/SettingsManager';

export default {
    category: 'Moderation',
    data: new SlashCommandBuilder()
        .setName('infractions')
        .setDescription('Muestra los puntos de infracción actuales de un usuario.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El usuario del que quieres ver el expediente.')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) return;

        // Si no mencionan a nadie, vemos los puntos de quien puso el comando 🐾
        const targetMember = (interaction.options.getMember('usuario') as GuildMember) || interaction.member as GuildMember;
        const targetUser = targetMember.user;
        
        const guildId = interaction.guild.id;
        const points = userPoints.get(`${guildId}-${targetUser.id}`) || 0;

        // Obtenemos los ajustes para saber el límite de puntos
        const settings = await SettingsManager.getSettings(guildId);
        const pointsPerStrike = settings?.pointsPerStrike || 10;

        // Determinamos la peligrosidad visualmente 🎨
        let status = "🟢 Bajo Control";
        let color = 0x00ff7f; // Verde pastel

        if (points >= pointsPerStrike * 3) {
            status = "🔴 Riesgo Crítico";
            color = 0xff4d4d; // Rojo
        } else if (points >= pointsPerStrike) {
            status = "🟡 Advertido";
            color = 0xffcc00; // Amarillo
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Expediente: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setColor(color)
            .addFields(
                { name: '📊 Puntos Acumulados', value: `\`${points}\` puntos`, inline: true },
                { name: '🛡️ Estado de Seguridad', value: status, inline: true },
                { name: '👤 Usuario', value: `<@${targetUser.id}>`, inline: false }
            )
            .setFooter({ 
                text: `Sistema Sentinel • Valor de Strike: ${pointsPerStrike} pts`, 
                iconURL: interaction.client.user?.displayAvatarURL() 
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};