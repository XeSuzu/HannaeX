import {
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, ChatInputCommandInteraction, Message, InteractionResponse
} from 'discord.js';
import Couple from '../../../Models/couple';
import { HoshikoClient } from '../../../index';

interface SlashCommand {
    data: SlashCommandBuilder | any;
    category: string;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message | InteractionResponse>;
}

const command: SlashCommand = {
    category: 'Interactions',
    data: new SlashCommandBuilder()
        .setName("kiss")
        .setDescription("💞 Manda un besito kawaii a alguien (nya~)")
        .addUserOption((option) =>
            option
                .setName("usuario")
                .setDescription("¿A quién quieres darle un besito, nya~? 🐾")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser("usuario", true);
        const authorUser = interaction.user;

        const kissGifs = ["https://i.pinimg.com/originals/4e/6e/7e/4e6e7e9783821452fd9a3e5517058c68.gif"];
        const selfKissGifs = [
            "https://i.pinimg.com/originals/c9/28/aa/c928aa1a7c787e954b41b9d4c72d62d2.gif", 
            "https://i.pinimg.com/originals/82/72/79/8272791e847c0b05b33100657989396f.gif"
        ];
        const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

        // Auto-beso
        if (targetUser.id === authorUser.id) {
            const selfKissEmbed = new EmbedBuilder()
                .setColor(0xffc0cb)
                .setTitle("💖 ¡Un besito para ti!")
                .setDescription(`${authorUser}, ¡es muy importante amarse a uno mismo! 🐾`)
                .setImage(getRandom(selfKissGifs))
                .setFooter({ text: "¡El amor propio es el mejor! 💗" });
            return interaction.reply({ embeds: [selfKissEmbed] });
        }

        const coupleIds = [authorUser.id, targetUser.id].sort();
        const coupleData = await Couple.findOneAndUpdate(
            { users: coupleIds }, 
            { $inc: { kisses: 1 } },
            { new: true, upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor(0xff9eb5)
            .setDescription(`**${authorUser.username}** le ha dado un besito a **${targetUser.username}** 💞`)
            .setImage(getRandom(kissGifs))
            .setFooter({ text: `Se han dado ${coupleData.kisses} besitos en total, nya~ ✨` });

        // CustomIds con información embebida: kiss:action:authorId:targetId
        // Esto permite que funcionen incluso después de reinicios
        const returnId = `kiss:return:${authorUser.id}:${targetUser.id}`;
        const rejectId = `kiss:reject:${authorUser.id}:${targetUser.id}`;
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(returnId)
                .setLabel("💞 Devolver beso")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(rejectId)
                .setLabel("🚫 Rechazar beso")
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            content: `${targetUser}`, 
            embeds: [embed], 
            components: [row]
        });
    },
};

export = command;