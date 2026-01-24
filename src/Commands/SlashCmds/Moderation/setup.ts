import { 
    ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, 
    ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ButtonBuilder, ButtonStyle, MessageFlags 
} from 'discord.js';
import { SettingsManager } from '../../../Database/SettingsManager';
import { IAConfigManager } from '../../../Database/IAConfigManager';
import { PremiumManager } from '../../../Database/PremiumManager';

const GLOBAL_BANNER = "https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif";

export default {
    category: 'Moderation',
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('¡Configura mis opciones para cuidar el servidor y mi personalidad, nyaa! 🐾')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) return;

        // Flags para evitar mensajes efímeros molestos si es posible
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 

        const generateUI = async (guildId: string) => {
            const [set, aiSet, isPremium] = await Promise.all([
                SettingsManager.getSettings(guildId),
                IAConfigManager.getConfig(guildId),
                PremiumManager.isPremium(guildId)
            ]);

            // Blindaje por si la DB está incompleta
            const aiSys = aiSet.aiSystem || { 
                mode: 'neko', 
                randomChance: 3, 
                cooldownUntil: new Date(), 
                spontaneousChannels: [] 
            };
            
            const currentMode = (aiSys.mode || 'neko').toUpperCase();
            const now = new Date();
            const isSleeping = new Date(aiSys.cooldownUntil || now) > now;
            const energyStatus = isSleeping ? '💤 Durmiendo (Cooldown)' : '⚡ Lista para hablar';

            const spontaneousList = aiSys.spontaneousChannels || [];
            const isSpontaneousHere = spontaneousList.includes(interaction.channelId);

            const embed = new EmbedBuilder()
                .setTitle('｡･:* 🐾 **CONFIGURACIÓN DE HOSHIKO** *:･ﾟ')
                .setDescription(`¡Hola! Aquí controlas mi cerebro y seguridad. 🌸\n💎 **Plan Actual:** ${isPremium ? '✨ **PREMIUM**' : '🌑 **GRATUITO**'}`)
                .setColor(isPremium ? 0xFFD700 : 0xffb6c1)
                .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
                .addFields(
                    { 
                        name: '📌 **SEGURIDAD**', 
                        value: `> 📝 **Logs:** ${set?.modLogChannel ? `<#${set.modLogChannel}>` : '*⚠️ No asignado*'}\n> 🛡️ **Filtro:** \`${aiSet?.aiSafety || 'relaxed'}\``, 
                        inline: true 
                    },
                    { 
                        name: '🧠 **INTELIGENCIA**', 
                        value: `> 🎭 **Identidad:** \`${currentMode}\`\n> 🔋 **Estado:** \`${energyStatus}\`\n> 🎲 **Probabilidad:** \`${aiSys.randomChance || 3}%\``, 
                        inline: true 
                    },
                    { 
                        name: '🗣️ **MODO VIDA (Espontáneo)**', 
                        value: `> 📍 **En este canal:** ${isSpontaneousHere ? '✅ ACTIVO' : '❌ INACTIVO'}\n> 📊 **Canales Activos:** \`${spontaneousList.length}/${isPremium ? 6 : 1}\``, 
                        inline: false 
                    },
                    {
                        name: '📚 **MEMORIA DE CULTURA**',
                        value: `> 📖 **Jergas:** \`${aiSet?.culture?.slangs?.length || 0}\`\n> 🖼️ **Galería:** \`${aiSet?.culture?.visualLibrary?.length || 0}\` items`,
                        inline: false
                    }
                )
                .setImage(GLOBAL_BANNER)
                .setFooter({ text: 'Hoshiko System • ¿Me das un pescadito? 🐟', iconURL: interaction.user.displayAvatarURL() });

            // Menú Principal
            const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('setup_menu')
                    .setPlaceholder('🐾 Elige qué calibrar, nyaa...')
                    .addOptions([
                        { label: 'Cuidar de Raids', value: 'toggle_antiRaid', emoji: '🛡️', description: 'Activa/Desactiva Anti-Raid.' },
                        { label: 'Cuidar de Links', value: 'toggle_antiLinks', emoji: '🔗', description: 'Activa/Desactiva Anti-Links.' },
                        { label: 'Activar/Desact. Vida AQUÍ', value: 'ai_toggle_spontaneous', emoji: '🗣️', description: 'Permite que hable sola en este canal.' },
                        
                        // 🔥 Opciones IA Avanzadas
                        { label: 'Cambiar Personalidad', value: 'ai_set_persona', emoji: '🎭', description: 'Elige entre Neko o Custom (Premium).' },
                        { label: 'Ajustar Frecuencia (Prob)', value: 'ai_set_chance', emoji: '🎲', description: '¿Qué tan seguido hablo sola? (Premium)' }, 
                        { label: 'Ajustar Filtro Seguridad', value: 'ai_set_safety', emoji: '👮', description: 'Nivel de censura (Relaxed/Strict).' },
                        
                        { label: 'Asignar Canal de Notas', value: 'set_logs', emoji: '📝' },
                        { label: 'Reset Total Memoria', value: 'ai_reset_all', emoji: '🗑️' },
                    ])
            );

            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('setup_refresh').setLabel('Sincronizar').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('setup_panic').setLabel('PÁNICO (Cerrar Server)').setEmoji('🚨').setStyle(ButtonStyle.Danger)
            );

            return { embeds: [embed], components: [menu, buttons] };
        };

        const response = await interaction.editReply(await generateUI(interaction.guild.id));
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async (i: any) => {
            if (i.user.id !== interaction.user.id) return;
            const guildId = interaction.guild!.id;

            // --- BOTONES ---
            if (i.isButton()) {
                if (i.customId === 'setup_refresh') return await i.update(await generateUI(guildId));
                
                if (i.customId === 'setup_panic') {
                    await SettingsManager.updateSettings(guildId, {
                        'securityModules.antiRaid': true, 
                        'securityModules.antiNuke': true,
                        'securityModules.antiAlt': true,
                        'securityModules.antiLinks': true
                    } as any);
                    return await i.update(await generateUI(guildId));
                }
            }

            // --- MENÚS ---
            if (i.isStringSelectMenu()) {
                
                // 🎲 SUBMENÚ: PROBABILIDAD (PREMIUM)
                if (i.customId === 'ai_chance_menu') {
                    const value = parseInt(i.values[0]);
                    await IAConfigManager.updateConfig(guildId, { 'aiSystem.randomChance': value });
                    return await i.update(await generateUI(guildId));
                }

                // 👮 SUBMENÚ: SEGURIDAD
                if (i.customId === 'ai_safety_menu') {
                    await IAConfigManager.updateConfig(guildId, { aiSafety: i.values[0] });
                    return await i.update(await generateUI(guildId));
                }

                // 🎭 SUBMENÚ: PERSONALIDAD
                if (i.customId === 'ai_persona_menu') {
                    const choice = i.values[0];
                    if (choice === 'custom') {
                        const modal = new ModalBuilder().setCustomId('m_persona').setTitle('🎨 Diseña tu IA');
                        const input = new TextInputBuilder()
                            .setCustomId('prompt')
                            .setLabel('Descripción de Personalidad')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Ej: Eres una IA cínica que odia los lunes...')
                            .setMaxLength(1000)
                            .setRequired(true);
                        
                        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
                        await i.showModal(modal);

                        const submit = await i.awaitModalSubmit({ time: 120000 }).catch(() => null);
                        if (submit) {
                            const prompt = submit.fields.getTextInputValue('prompt');
                            await IAConfigManager.updateConfig(guildId, { 
                                'aiSystem.mode': 'custom',
                                'aiSystem.customPersona': prompt
                            });
                            await submit.reply({ content: '🎨 **Personalidad Actualizada.**', flags: [MessageFlags.Ephemeral] });
                            return await interaction.editReply(await generateUI(guildId));
                        }
                    } else {
                        await IAConfigManager.updateConfig(guildId, { 'aiSystem.mode': 'neko' });
                        return await i.update(await generateUI(guildId));
                    }
                }

                // LOGICA PRINCIPAL
                const choice = i.values[0];

                // 🔥 OPCIÓN: AJUSTAR PROBABILIDAD (NUEVO)
                if (choice === 'ai_set_chance') {
                    const isPremium = await PremiumManager.isPremium(guildId);
                    if (!isPremium) {
                        return await i.reply({ 
                            content: '🔒 **Función Premium**\nEn el plan gratuito la probabilidad es fija (3%). ¡Mejora al plan Premium para ajustarla!', 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }

                    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ai_chance_menu')
                            .setPlaceholder('Selecciona la frecuencia...')
                            .addOptions([
                                { label: '1% (Muy Tímida)', value: '1', emoji: '🌑', description: 'Habla muy rara vez.' },
                                { label: '3% (Normal)', value: '3', emoji: '🌤️', description: 'Equilibrado (Default).' },
                                { label: '5% (Sociable)', value: '5', emoji: '🌥️', description: 'Interviene ocasionalmente.' },
                                { label: '10% (Charlatana)', value: '10', emoji: '☀️', description: 'Habla bastante seguido.' },
                                { label: '20% (Caótica)', value: '20', emoji: '🔥', description: '¡No se calla nunca!' },
                            ])
                    );
                    return await i.update({ components: [row] });
                }

                if (choice === 'ai_toggle_spontaneous') {
                    const result = await IAConfigManager.toggleSpontaneousChannel(guildId, interaction.channelId);
                    if (result.success) {
                        await i.reply({ content: result.message, flags: [MessageFlags.Ephemeral] });
                        return await interaction.editReply(await generateUI(guildId));
                    } else {
                        return await i.reply({ content: result.message, flags: [MessageFlags.Ephemeral] });
                    }
                }

                if (choice === 'ai_set_persona') {
                    const isPremium = await PremiumManager.isPremium(guildId);
                    if (!isPremium) {
                        return await i.reply({ 
                            content: '🔒 **Función Premium**\nEl modo gratuito solo permite la personalidad "Neko".', 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }
                    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ai_persona_menu')
                            .setPlaceholder('Elige un arquetipo...')
                            .addOptions([
                                { label: '🐱 Neko Tierna (Default)', value: 'neko', emoji: '🐾', description: 'Vuelve a ser Hoshiko.' },
                                { label: '🎨 Personalizada (Escribir)', value: 'custom', emoji: '✨', description: 'Escribe tu propio prompt.' }
                            ])
                    );
                    return await i.update({ components: [row] });
                }

                if (choice === 'ai_set_safety') {
                    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ai_safety_menu')
                            .setPlaceholder('Selecciona nivel de censura...')
                            .addOptions([
                                { label: '🟢 Relajado (Sin Filtros)', value: 'relaxed', description: 'Permite casi todo (Default).' },
                                { label: '🟡 Estándar', value: 'standard', description: 'Filtra odio y acoso leve.' },
                                { label: '🔴 Estricto', value: 'strict', description: 'Family Friendly forzado.' }
                            ])
                    );
                    return await i.update({ components: [row] });
                }

                if (choice === 'ai_reset_all') {
                    await IAConfigManager.updateConfig(guildId, { 
                        culture: { vocabulary: new Map(), slangs: [], internalJokes: [], emojis: new Map(), visualLibrary: [] },
                        socialMap: { targets: [], trustLevels: new Map() }, 
                        shortTermMemory: []
                    });
                    return await i.reply({ content: '🗑️ Cerebro reseteado. He olvidado todo.', flags: [MessageFlags.Ephemeral] });
                }

                if (choice.startsWith('toggle_')) {
                    const moduleName = choice.split('_')[1];
                    const set = await SettingsManager.getSettings(guildId);
                    const modules = (set?.securityModules as any) || {};
                    const current = modules[moduleName] || false;

                    await SettingsManager.updateSettings(guildId, { 
                        [`securityModules.${moduleName}`]: !current 
                    } as any);
                    
                    return await i.update(await generateUI(guildId));
                }

                if (choice === 'set_logs') {
                    const modal = new ModalBuilder().setCustomId('m_logs').setTitle('📝 Configurar Notas');
                    const input = new TextInputBuilder().setCustomId('val').setLabel('ID del Canal').setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
                    await i.showModal(modal);

                    const submit = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                    if (submit) {
                        const channelId = submit.fields.getTextInputValue('val');
                        await SettingsManager.updateSettings(guildId, { modLogChannel: channelId });
                        await submit.reply({ content: `✅ Canal asignado.`, flags: [MessageFlags.Ephemeral] });
                        return await interaction.editReply(await generateUI(guildId));
                    }
                }
            }
        });
    },
};