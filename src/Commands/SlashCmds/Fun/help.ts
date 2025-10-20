import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { HoshikoClient } from '../../../index';

interface SlashCommand {
    data: SlashCommandBuilder | any;
    category: string;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void>;
}

// Configuración de categorías con emojis y descripciones
const CATEGORY_CONFIG: Record<string, { emoji: string; description: string; color: number }> = {
    'Fun': {
        emoji: '🎮',
        description: 'Comandos divertidos para entretenerte',
        color: 0xFF69B4
    },
    'Information': {
        emoji: '📚',
        description: 'Obtén información útil del servidor y usuarios',
        color: 0x5865F2
    },
    'Moderation': {
        emoji: '🛡️',
        description: 'Herramientas para moderadores',
        color: 0xED4245
    },
    'Music': {
        emoji: '🎵',
        description: 'Reproduce música en los canales de voz',
        color: 0x9B59B6
    },
    'Utility': {
        emoji: '🔧',
        description: 'Utilidades diversas para el servidor',
        color: 0x3498DB
    },
    'Profiles': {
        emoji: '👤',
        description: 'Perfiles y estadísticas de usuarios',
        color: 0x1ABC9C
    },
    'Economy': {
        emoji: '💰',
        description: 'Sistema de economía y monedas',
        color: 0xF1C40F
    },
    'Games': {
        emoji: '🎲',
        description: 'Mini juegos y desafíos',
        color: 0xE67E22
    },
    'Admin': {
        emoji: '⚙️',
        description: 'Comandos administrativos del bot',
        color: 0x95A5A6
    },
    'AI': {
        emoji: '🧠',
        description: 'Inteligencia artificial y conversación',
        color: 0x00D9FF
    }
};

// Crear embed principal
function createMainEmbed(client: HoshikoClient, totalCommands: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0xFFC0CB)
        .setAuthor({
            name: `${client.user?.username} - Centro de Ayuda`,
            iconURL: client.user?.displayAvatarURL()
        })
        .setTitle('✨ ¡Bienvenido al menú de ayuda, nyaa~! 🐾')
        .setDescription(
            '> Selecciona una categoría del menú desplegable para ver los comandos disponibles.\n\n' +
            '**📊 Estadísticas:**\n' +
            `╰ Total de comandos: **${totalCommands}**\n` +
            `╰ Categorías disponibles: **${Object.keys(CATEGORY_CONFIG).length}**\n\n` +
            '**🎯 Formas de usar comandos:**\n' +
            '╰ Slash Commands: `/comando`\n' +
            '╰ IA por mención: `@Hoshiko pregunta aquí`\n' +
            '╰ IA con prefijo: `hoshi ask tu pregunta`'
        )
        .setThumbnail(client.user?.displayAvatarURL() ?? null)
        .setImage('https://i.imgur.com/your-banner-image.png') // Opcional: banner personalizado
        .setFooter({
            text: `Desarrollado con 💖 por v.sxn | Hoshiko Bot v2.0`,
            iconURL: client.user?.displayAvatarURL()
        })
        .setTimestamp();
}

// Crear embed de categoría específica
function createCategoryEmbed(
    client: HoshikoClient,
    category: string,
    commands: string[]
): EmbedBuilder {
    const config = CATEGORY_CONFIG[category] || {
        emoji: '✨',
        description: 'Comandos varios',
        color: 0xFFC0CB
    };

    const embed = new EmbedBuilder()
        .setColor(config.color)
        .setAuthor({
            name: `${config.emoji} ${category}`,
            iconURL: client.user?.displayAvatarURL()
        })
        .setTitle(`━━━━━━ ${category.toUpperCase()} ━━━━━━`)
        .setDescription(`*${config.description}*\n\n`)
        .setThumbnail(client.user?.displayAvatarURL() ?? null)
        .setFooter({
            text: `Total: ${commands.length} comando${commands.length !== 1 ? 's' : ''} | Usa el menú para ver otras categorías`,
            iconURL: client.user?.displayAvatarURL()
        })
        .setTimestamp();

    // Dividir comandos en chunks de 10 para múltiples campos si es necesario
    const chunkedCommands = [];
    for (let i = 0; i < commands.length; i += 10) {
        chunkedCommands.push(commands.slice(i, i + 10));
    }

    chunkedCommands.forEach((chunk, index) => {
        const fieldName = chunkedCommands.length > 1 
            ? `📋 Comandos (Parte ${index + 1}/${chunkedCommands.length})`
            : '📋 Comandos Disponibles';

        embed.addFields({
            name: fieldName,
            value: chunk.map(cmd => `╰ ${cmd}`).join('\n') || '*No hay comandos en esta categoría*',
            inline: false
        });
    });

    return embed;
}

// Crear embed de IA
function createAIEmbed(client: HoshikoClient): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x00D9FF)
        .setAuthor({
            name: '🧠 Inteligencia Artificial',
            iconURL: client.user?.displayAvatarURL()
        })
        .setTitle('━━━━━━ ASISTENTE IA ━━━━━━')
        .setDescription(
            '¡Puedo ayudarte con cualquier pregunta! Aquí te explico cómo usarme, nya~'
        )
        .addFields(
            {
                name: '💬 Formas de conversar conmigo',
                value: 
                    '**1️⃣ Mención directa:**\n' +
                    `╰ \`@${client.user?.username} ¿Cuál es la capital de Francia?\`\n\n` +
                    '**2️⃣ Prefijo "hoshi ask":**\n' +
                    '╰ `hoshi ask explícame la fotosíntesis`\n\n' +
                    '**3️⃣ En cualquier canal donde esté:**\n' +
                    '╰ Solo menciónme y pregúntame lo que quieras',
                inline: false
            },
            {
                name: '✨ Capacidades',
                value:
                    '╰ 📚 Responder preguntas generales\n' +
                    '╰ 💡 Explicar conceptos complejos\n' +
                    '╰ 🎵 Buscar letras de canciones\n' +
                    '╰ 🗣️ Mantener conversaciones naturales\n' +
                    '╰ 🧮 Ayudar con cálculos y traducciones\n' +
                    '╰ 📝 Crear contenido creativo',
                inline: false
            },
            {
                name: '🎯 Comandos especiales',
                value:
                    '╰ `hoshi ask olvida` - Reinicia nuestra conversación\n' +
                    '╰ `hoshi ask letra de [canción]` - Busca letras de música',
                inline: false
            },
            {
                name: '⚠️ Limitaciones',
                value:
                    '╰ No puedo acceder a internet en tiempo real\n' +
                    '╰ Mi conocimiento tiene fecha de corte\n' +
                    '╰ No puedo ejecutar código o acceder a archivos\n' +
                    '╰ Mantengo historial de los últimos 20 mensajes',
                inline: false
            }
        )
        .setThumbnail(client.user?.displayAvatarURL() ?? null)
        .setFooter({
            text: '¡Pregúntame lo que quieras, nya~! 🐾',
            iconURL: client.user?.displayAvatarURL()
        })
        .setTimestamp();
}

const command: SlashCommand = {
    category: 'Information',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('¡Muestra todos los comandos disponibles, nyaa!')
        .addStringOption(option =>
            option
                .setName('categoria')
                .setDescription('Selecciona una categoría específica')
                .setRequired(false)
                .addChoices(
                    ...Object.keys(CATEGORY_CONFIG).map(cat => ({
                        name: `${CATEGORY_CONFIG[cat].emoji} ${cat}`,
                        value: cat
                    }))
                )
        ),

    async execute(interaction) {
        const client = interaction.client as HoshikoClient;
        const commands = client.slashCommands;
        const selectedCategory = interaction.options.getString('categoria');

        // Agrupar comandos por categoría
        const categorizedCommands: Record<string, string[]> = {};
        
        commands.forEach((cmd: SlashCommand) => {
            const category = cmd.category || 'Otros';
            if (!categorizedCommands[category]) {
                categorizedCommands[category] = [];
            }
            categorizedCommands[category].push(
                `\`/${cmd.data.name}\` - ${cmd.data.description}`
            );
        });

        const totalCommands = commands.size;

        // Si se especificó una categoría, mostrar directamente
        if (selectedCategory) {
            const categoryEmbed = selectedCategory === 'AI'
                ? createAIEmbed(client)
                : createCategoryEmbed(
                    client,
                    selectedCategory,
                    categorizedCommands[selectedCategory] || []
                );

            const backButton = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_main')
                        .setLabel('← Volver al menú principal')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏠')
                );

            const response = await interaction.reply({
                embeds: [categoryEmbed],
                components: [backButton],
                ephemeral: true
            });

            // Collector para el botón de volver
            const backCollector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000
            });

            backCollector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: '❌ Solo quien ejecutó el comando puede usar este botón.',
                        ephemeral: true
                    });
                }

                const mainEmbed = createMainEmbed(client, totalCommands);
                const selectMenu = createSelectMenu(categorizedCommands);

                await i.update({
                    embeds: [mainEmbed],
                    components: [selectMenu]
                });
            });

            return;
        }

        // Crear menú de selección
        const selectMenu = createSelectMenu(categorizedCommands);
        const mainEmbed = createMainEmbed(client, totalCommands);

        const response = await interaction.reply({
            embeds: [mainEmbed],
            components: [selectMenu],
            ephemeral: true
        });

        // Collector para el menú de selección
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000 // 5 minutos
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: '❌ Solo quien ejecutó el comando puede usar este menú.',
                    ephemeral: true
                });
            }

            const selectedValue = i.values[0];

            if (selectedValue === 'main') {
                await i.update({
                    embeds: [mainEmbed],
                    components: [selectMenu]
                });
                return;
            }

            const categoryEmbed = selectedValue === 'AI'
                ? createAIEmbed(client)
                : createCategoryEmbed(
                    client,
                    selectedValue,
                    categorizedCommands[selectedValue] || []
                );

            await i.update({
                embeds: [categoryEmbed],
                components: [selectMenu]
            });
        });

        collector.on('end', () => {
            const disabledMenu = ActionRowBuilder.from(selectMenu.components[0].data.custom_id ? selectMenu : selectMenu);
            interaction.editReply({
                components: []
            }).catch(() => {});
        });
    },
};

// Función auxiliar para crear el menú de selección
function createSelectMenu(categorizedCommands: Record<string, string[]>): ActionRowBuilder<StringSelectMenuBuilder> {
    const options: StringSelectMenuOptionBuilder[] = [
        new StringSelectMenuOptionBuilder()
            .setLabel('🏠 Menú Principal')
            .setDescription('Volver al inicio')
            .setValue('main')
            .setEmoji('🏠')
    ];

    // Agregar categorías disponibles
    for (const category in categorizedCommands) {
        const config = CATEGORY_CONFIG[category] || { emoji: '✨', description: 'Comandos varios' };
        const commandCount = categorizedCommands[category].length;

        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`${category} (${commandCount})`)
                .setDescription(config.description.substring(0, 100))
                .setValue(category)
                .setEmoji(config.emoji)
        );
    }

    // Agregar opción de IA
    options.push(
        new StringSelectMenuOptionBuilder()
            .setLabel('Inteligencia Artificial')
            .setDescription('Aprende cómo usar el asistente IA')
            .setValue('AI')
            .setEmoji('🧠')
    );

    return new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('🔍 Selecciona una categoría para explorar...')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options)
        );
}

export = command;