import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ChatInputCommandInteraction,
    Message,
    InteractionResponse,
    ButtonInteraction
} from 'discord.js';
import { HoshikoClient } from '../../../index';

// Interfaz estándar para tus slash commands
interface SlashCommand {
    data: SlashCommandBuilder | any;
    category: string;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message | InteractionResponse>;
}

const command: SlashCommand = {
    category: 'Interactions',
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('🤗 Envía un abrazo cálido a alguien especial')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('El usuario que recibirá el abrazo')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        // Obtenemos los usuarios de forma segura
        const targetUser = interaction.options.getUser('usuario', true);
        const authorUser = interaction.user;

        const hugGifs: string[] = [
            'https://i.imgur.com/MCvMErV.gif', 'https://i.imgur.com/7X7HPs4.gif',
            'https://i.redd.it/mesqxxfffeva1.gif', 'https://c.tenor.com/IpGw3LOZi2wAAAAC/tenor.gif',
            'https://c.tenor.com/rTKIBe2qtxsAAAAC/tenor.gif',
        ];

        const mensajes: string[] = [
            `✨ ${authorUser} te envuelve en un abrazo que es pura magia y cariño, ${targetUser}. 💖`,
            `🌟 ${authorUser} te da un abrazo estelar que ilumina tu noche, ${targetUser}. 💫`,
            `💖 ${authorUser} te abraza con una energía tan fuerte que te hace brillar, ${targetUser}. ✨`,
            `🍥 ${authorUser} te ofrece un abrazo cálido, dulce y muy reconfortante, ${targetUser}. ☕️`,
            `🌷 ${authorUser} te da un abrazo hecho con todos los buenos deseos del mundo, ${targetUser}. 🥰`,
            `🐻 ${authorUser} te da un abrazo de oso, pero con toda la ternura del mundo, ${targetUser}. 🤗`,
        ];

        const autoMensajes: string[] = [
            `🌸 ${authorUser}, abrazarte a ti mism@ es el mejor acto de amor propio. ¡Sigue brillando! ✨💖`,
            `💖 ¡Un abrazo gigante para ti, ${authorUser}! Nunca olvides que mereces todo el cariño del mundo. 🌈🤗`,
            `🌟 ¡Ey, ${authorUser}! Este autoabrazo es un recordatorio de que eres fuerte y única. 🌷💫`,
        ];
        
        // ✨ MEJORA: Función auxiliar más simple y segura
        const getRandomItem = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];

        // --- Lógica de Auto-Abrazo ---
        if (targetUser.id === authorUser.id) {
            const embedAuto = new EmbedBuilder()
                .setColor('#f48fb1')
                .setTitle('💖 ¡Un Abrazo de Amor Propio!')
                .setDescription(getRandomItem(autoMensajes))
                .setImage(getRandomItem(hugGifs))
                .setTimestamp()
                .setFooter({ text: `Eres increíble, ${authorUser.username} 💕`, iconURL: authorUser.displayAvatarURL() });

            return interaction.reply({ embeds: [embedAuto] });
        }

        // --- Lógica de Abrazo a Otro Usuario ---
        const embed = new EmbedBuilder()
            .setColor('#f48fb1')
            .setDescription(getRandomItem(mensajes)) // ✨ MEJORA: El mensaje principal ahora es la descripción.
            .setImage(getRandomItem(hugGifs))
            .setTimestamp()
            .setFooter({ text: `De parte de ${authorUser.username} 💖`, iconURL: authorUser.displayAvatarURL() });

        const devolverAbrazoId = `devolver_abrazo_${interaction.id}`;

        const devolverBtn = new ButtonBuilder()
            .setCustomId(`devolver_abrazo_${interaction.id}`) // ✨ MEJORA: ID único para el botón
            .setLabel('🤗 Devolver abrazo')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(devolverBtn);

        // ✨ MEJORA: Mencionamos al usuario en el contenido para que reciba la notificación.
        await interaction.reply({ content: `**${authorUser.username}** le ha dado un abrazo a ${targetUser}!`, embeds: [embed], components: [row] });

        // Colector de componentes tipado y mejorado
        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000, // 1 minuto
        });

        collector?.on('collect', async (i: ButtonInteraction) => {
            if (i.customId === devolverAbrazoId) {
                if (i.user.id !== targetUser.id) {
                    return i.reply({
                        content: '❌ Solo la persona que recibió el abrazo puede devolverlo, nyaa~',
                        ephemeral: true,
                    });
                }
                
                // Desactivamos el botón en el mensaje original
                devolverBtn.setDisabled(true);
                await interaction.editReply({ components: [row] });

                const gifsDevolucion: string[] = [
                    'https://i.pinimg.com/originals/85/dc/ef/85dcef131af84b515106955e142df54e.gif',
                    'https://usagif.com/wp-content/uploads/gif/anime-hug-12.gif',
                    'https://c.tenor.com/FgLRE4gi5VoAAAAC/tenor.gif',
                ];
                
                const embedDevolucion = new EmbedBuilder()
                    .setColor('#f06292')
                    .setDescription(`**${targetUser.username}** le ha devuelto el abrazo a **${authorUser.username}**! 💖`)
                    .setImage(getRandomItem(gifsDevolucion))
                    .setTimestamp()
                    .setFooter({ text: `El cariño es mutuo 💕`, iconURL: targetUser.displayAvatarURL() });
                
                // Respondemos a la interacción del botón con un nuevo mensaje público
                await i.reply({ embeds: [embedDevolucion] });
                collector.stop();
            }
        });

        collector?.on('end', collected => {
            if (collected.size === 0) {
                devolverBtn.setDisabled(true).setLabel('Tiempo agotado');
                interaction.editReply({ components: [row] }).catch(() => {});
            }
        });
    },
};

export = command;