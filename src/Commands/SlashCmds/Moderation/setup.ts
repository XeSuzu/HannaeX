import { 
    ChatInputCommandInteraction, 
    PermissionFlagsBits, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ComponentType 
} from 'discord.js';
import { SettingsManager } from '../../../Database/SettingsManager';
import GuildConfig from '../../../Models/GuildConfig';

export default {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Panel de configuración avanzada de Hoshiko.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Cambiamos 'execute' para que acepte Interaction en lugar de Message
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        // 1. Crear el Embed principal (La interfaz bonita)
        const settings = await SettingsManager.getSettings(interaction.guild.id);
        
        const mainEmbed = new EmbedBuilder()
            .setTitle('🌸 Panel de Control de Hoshiko')
            .setDescription('Bienvenido al centro de mando. Selecciona una categoría para ajustar mis escudos.')
            .addFields(
                { name: '📡 Anti-Raid', value: settings?.securityModules?.antiRaid ? '✅ Activo' : '❌ Inactivo', inline: true },
                { name: '📝 Logs', value: settings?.modLogChannel ? `<#${settings.modLogChannel}>` : '❌ No configurado', inline: true }
            )
            .setColor(0xffb6c1)
            .setThumbnail(interaction.client.user.displayAvatarURL());

        // 2. Crear el Menú de Selección
        const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('setup_menu')
                .setPlaceholder('Selecciona una opción para configurar...')
                .addOptions([
                    { label: 'Configurar Logs', description: 'Elige el canal donde enviaré alertas.', value: 'setup_logs', emoji: '📝' },
                    { label: 'Módulo Anti-Raid', description: 'Activa o desactiva la protección de entradas.', value: 'setup_antiraid', emoji: '🛡️' },
                    { label: 'Cambiar Prefijo', description: 'Ajusta el prefijo para comandos de texto.', value: 'setup_prefix', emoji: '⚙️' },
                ])
        );

        const response = await interaction.reply({
            embeds: [mainEmbed],
            components: [menu],
            ephemeral: true // Solo el administrador lo ve
        });

        // 3. Recolector de interacciones (Para que el menú funcione)
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000 // El menú expira en 1 minuto
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) return;

            // Aquí manejaríamos cada opción con Modales o más sub-menús
            if (i.values[0] === 'setup_antiraid') {
                const newState = !settings?.securityModules?.antiRaid;
                await GuildConfig.updateOne({ guildId: interaction.guild!.id }, { 'securityModules.antiRaid': newState });
                SettingsManager.clearCache(interaction.guild!.id);
                
                await i.update({ content: `✅ Anti-Raid ${newState ? 'activado' : 'desactivado'}.`, embeds: [], components: [] });
            }
            
            // Nota: Para Logs y Prefijo, lo ideal es usar Modales (Ventanas emergentes)
            if (i.values[0] === 'setup_logs') {
                await i.reply({ content: '🌸 Por ahora, usa el comando de texto para los logs mientras preparo el Modal.', ephemeral: true });
            }
        });
    },
};