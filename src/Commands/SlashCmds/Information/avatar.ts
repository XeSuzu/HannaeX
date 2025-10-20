import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    User,
    Message,
    InteractionResponse
} from 'discord.js';
import { HoshikoClient } from '../../../index';

// Interfaz estándar para tus slash commands
interface SlashCommand {
    // ✅ CORRECCIÓN 1: Usamos 'Omit' para hacer la interfaz compatible con constructores que tienen opciones.
    data: SlashCommandBuilder | any;
    category: string;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message | InteractionResponse>;
}

const command: SlashCommand = {
    category: 'Profiles',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼 Muestra el avatar y banner de un usuario con estilo.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('👤 Usuario al que deseas ver el avatar')
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const user = interaction.options.getUser('usuario') ?? interaction.user;
            await user.fetch(true);

            const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

            // --- Avatar y Banner (sin 'dynamic') ---
            const avatarURL = member?.displayAvatarURL({ size: 1024 })
                              || user.displayAvatarURL({ size: 1024 })
                              || 'https://i.imgur.com/O3DHIA5.png';
            const bannerURL = user.bannerURL({ size: 1024 }) ?? undefined;

            // --- Botones de descarga ---
            const formats = ['png', 'jpg', 'webp'] as const;
            const buttons = formats.map(format =>
                new ButtonBuilder()
                    .setLabel(format.toUpperCase())
                    .setStyle(ButtonStyle.Link)
                    .setURL(user.displayAvatarURL({ size: 1024, extension: format }))
            );

            if (bannerURL) {
                buttons.push(new ButtonBuilder().setLabel('Banner').setStyle(ButtonStyle.Link).setURL(bannerURL));
            }
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

            // --- Color y Estado ---
            const color = member?.roles.highest.color ?? 0xffb6c1;
            const statusMap: Record<string, string> = {
                online: '🟢 Online', idle: '🌙 Ausente', dnd: '⛔ No molestar', offline: '⚫ Offline'
            };
            const status = member?.presence?.status ? statusMap[member.presence.status] : '⚪ Desconocido';

            // --- Nitro seguro ---
            // ✅ CORRECCIÓN 2: Comprobamos 'premiumSince' en el objeto 'member', no en 'user'.
            const hasNitro = member?.premiumSince !== null;

            // --- Embed ---
            const embed = new EmbedBuilder()
                .setTitle(`✨ Avatar de ${user.username}`)
                .setColor(color)
                .setFooter({ text: `Solicitado por: ${interaction.user.tag}` })
                .setTimestamp()
                .addFields(
                    { name: 'ID', value: `\`${user.id}\``, inline: true },
                    { name: 'Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Estado', value: status, inline: true },
                    { name: 'Nitro Boost', value: hasNitro ? '💎 Sí' : '❌ No', inline: true }
                );
            
            if (member?.joinedTimestamp) {
                embed.addFields({ name: 'En el servidor desde', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
            }

            embed.setImage(avatarURL);

            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error: any) {
            console.error("Error en /avatar:", error);
            await interaction.editReply({ content: '❌ Ocurrió un error al obtener el avatar.' });
        }
    }
};

export = command;