import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import ServerConfig from '../../../Models/serverConfig'; // Ajusta los ../ según tu estructura
import { SystemLogger } from '../../../Utils/SystemLogger';

export default {
    category: 'Owner', // 👈 La etiqueta mágica para que sea privado
    data: new SlashCommandBuilder()
        .setName('give-premium')
        .setDescription('👑 [Sistema] Asignar Premium manualmente')
        .addStringOption(opt => opt.setName('server_id').setDescription('ID del Servidor').setRequired(true))
        .addIntegerOption(opt => opt.setName('dias').setDescription('Días de duración (0 para quitar)').setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        // 🔒 1. VERIFICACIÓN DE IDENTIDAD (Desde .env)
        const ownerId = process.env.BOT_OWNER_ID;
        
        if (interaction.user.id !== ownerId) {
            // 🚨 ALERTA DE INTRUSO
            await SystemLogger.logSecurityBreach(interaction.client, interaction.user, 'give-premium');
            return interaction.reply({ 
                content: '⛔ **ACCESO DENEGADO**\nIncidente reportado al administrador del sistema.', 
                ephemeral: true 
            });
        }

        const targetGuildId = interaction.options.getString('server_id', true);
        const days = interaction.options.getInteger('dias', true);

        await interaction.deferReply({ ephemeral: true });

        try {
            // Buscamos/Creamos config
            let config = await ServerConfig.findOne({ guildId: targetGuildId });
            if (!config) config = await ServerConfig.create({ guildId: targetGuildId, memeChannelId: '0' });

            if (days > 0) {
                // SUMAR DÍAS
                const now = new Date();
                const currentExp = config.premiumUntil ? new Date(config.premiumUntil) : new Date();
                // Si ya venció, empezamos desde hoy. Si no, sumamos.
                const baseDate = currentExp > now ? currentExp : now;
                
                baseDate.setDate(baseDate.getDate() + days);
                config.premiumUntil = baseDate;
                await config.save();

                // Log de éxito
                await SystemLogger.logTransaction(interaction.client, interaction.user, 
                    `✅ **Añadido:** ${days} días\n🏢 **Server ID:** \`${targetGuildId}\`\n📅 **Vence:** <t:${Math.floor(baseDate.getTime()/1000)}:d>`);

                return interaction.editReply({ content: `✅ **Listo.** Servidor \`${targetGuildId}\` ahora es Premium por **${days} días**.` });

            } else {
                // QUITAR PREMIUM
                config.premiumUntil = null as any;
                await config.save();

                await SystemLogger.logTransaction(interaction.client, interaction.user, 
                    `🗑️ **Removido:** Premium quitado\n🏢 **Server ID:** \`${targetGuildId}\``);

                return interaction.editReply({ content: `🗑️ **Premium eliminado** del servidor \`${targetGuildId}\`.` });
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ Error al acceder a la base de datos.' });
        }
    }
};