import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ChatInputCommandInteraction,
    Message,
    ButtonInteraction,
    GuildMember,
    User
} from 'discord.js';
import { HoshikoClient } from '../../../index';
import Couple from '../../../Models/couple'; // Asegúrate que la ruta sea correcta

// ⚙️ API para GIFs (Variedad infinita)
async function getAnimeGif(category: string): Promise<string> {
    try {
        const response = await fetch(`https://nekos.best/api/v2/${category}`);
        const json = await response.json();
        return json.results[0].url;
    } catch (e) {
        return 'https://i.pinimg.com/originals/4e/6e/7e/4e6e7e9783821452fd9a3e5517058c68.gif';
    }
}

// ⚙️ LÓGICA CENTRAL
async function startKiss(
    targetUser: User,
    authorUser: User,
    color: string,
    replyCallback: (payload: any) => Promise<Message>
) {
    // 1. Auto-Beso
    if (targetUser.id === authorUser.id) {
        const embedAuto = new EmbedBuilder()
            .setColor(color as any)
            .setTitle("💖 Amor Propio")
            .setDescription(`${authorUser}, ¡es muy importante amarse a uno mismo! 🐾`)
            .setImage(await getAnimeGif('kiss'))
            .setFooter({ text: "¡El amor propio es el mejor! 💗" });
        return replyCallback({ embeds: [embedAuto] });
    }

    // 2. Lógica de Base de Datos (Con Protección)
    let kissCount = 0;
    try {
        // Ordenamos IDs para que A+B sea igual que B+A
        const coupleIds = [authorUser.id, targetUser.id].sort();
        
        const coupleData = await Couple.findOneAndUpdate(
            { users: coupleIds }, 
            { $inc: { kisses: 1 } },
            { new: true, upsert: true }
        );
        
        kissCount = coupleData.kisses;
    } catch (error) {
        console.error("⚠️ Error DB en Kiss (Probablemente esquema único):", error);
        // Si falla, no rompemos el comando, solo no mostramos el contador exacto
        kissCount = -1; 
    }

    // 3. Crear el mensaje
    const gifUrl = await getAnimeGif('kiss');
    const footerText = kissCount > -1 
        ? `Se han dado ${kissCount} besitos en total, nya~ ✨` 
        : `¡Un beso más a la colección! ✨`;

    const embed = new EmbedBuilder()
        .setColor(color as any)
        .setDescription(`**${authorUser.username}** le ha dado un besito a **${targetUser.username}** 💞`)
        .setImage(gifUrl)
        .setFooter({ text: footerText });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('kiss_return').setLabel("💞 Devolver").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('kiss_reject').setLabel("🚫 Rechazar").setStyle(ButtonStyle.Danger)
    );

    const responseMessage = await replyCallback({
        content: `✨ ${targetUser}`, 
        embeds: [embed], 
        components: [row]
    });

    // 4. Colector de Botones
    const collector = responseMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        // Solo el besado puede interactuar
        if (i.user.id !== targetUser.id) {
            return i.reply({ content: '❌ Nyaa~ Este beso no es para ti.', ephemeral: true });
        }

        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('done').setLabel(i.customId === 'kiss_return' ? 'Devuelto' : 'Rechazado').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        await i.update({ components: [disabledRow] });

        if (i.customId === 'kiss_return') {
            // Intentamos sumar otro beso a la DB
            try {
                const coupleIds = [authorUser.id, targetUser.id].sort();
                await Couple.findOneAndUpdate({ users: coupleIds }, { $inc: { kisses: 1 } });
            } catch (e) {} // Ignoramos error en devolución

            const returnGif = await getAnimeGif('kiss');
            const embedOk = new EmbedBuilder()
                .setColor('#e91e63')
                .setDescription(`💖 **${targetUser.username}** le devolvió el beso a **${authorUser.username}**. ¡El amor está en el aire! 💕`)
                .setImage(returnGif);
            await i.followUp({ embeds: [embedOk] });
        } else {
            const sadGif = await getAnimeGif('slap');
            const embedNo = new EmbedBuilder()
                .setColor('#f44336')
                .setDescription(`💔 **${targetUser.username}** rechazó el beso... Auch.`)
                .setImage(sadGif);
            await i.followUp({ content: `||💔 <@${authorUser.id}> ||`, embeds: [embedNo] });
        }
        collector.stop();
    });
}

// 📦 EXPORTACIÓN HÍBRIDA
export default {
    name: 'kiss',
    aliases: ['besar', 'beso', 'chu'],
    category: 'Interactions',

    // DATA SLASH
    data: new SlashCommandBuilder()
        .setName("kiss")
        .setDescription("💞 Manda un besito kawaii y cuenta cuántos llevan")
        .addUserOption((option) =>
            option.setName("usuario").setDescription("¿A quién besar?").setRequired(true)
        ),

    // EJECUCIÓN SLASH (/kiss)
    async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
        const target = interaction.options.getUser("usuario", true);
        const member = interaction.member as GuildMember;
        
        await startKiss(
            target, 
            interaction.user, 
            member?.displayHexColor || '#ff9eb5',
            async (payload) => {
                const res = await interaction.reply({ ...payload, fetchReply: true });
                return res as unknown as Message;
            }
        );
    },

    // EJECUCIÓN TEXTO (hoshi kiss)
    async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('🌸 Nyaa~ Menciona a alguien para darle un besito.');

        await startKiss(
            target,
            message.author,
            message.member?.displayHexColor || '#ff9eb5',
            async (payload) => message.reply(payload)
        );
    }
};