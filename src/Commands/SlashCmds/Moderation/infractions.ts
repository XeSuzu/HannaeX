import { Message, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { userPoints } from '../../../Features/InfractionManager';

export default {
    data: new SlashCommandBuilder()
        .setName('infractions')
        .setDescription('Muestra los puntos de infracción actuales de un usuario.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    name: 'infractions',
    description: 'Muestra los puntos de infracción actuales de un usuario.',

    async execute(message: Message, args: string[]) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply("🌸 Nyaa... solo el staff puede ver los expedientes.");
        }

        const target = message.mentions.users.first() || message.guild?.members.cache.get(args[0])?.user || message.author;
        
        const guildId = message.guild!.id;
        const points = userPoints.get(`${guildId}-${target.id}`) || 0;

        const embed = new EmbedBuilder()
            .setTitle(`📋 Expediente de ${target.username}`)
            .setDescription(`Actualmente tiene **${points}** puntos de infracción acumulados.`)
            .setColor(points > 20 ? 0xffcc00 : 0x00ff00)
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: "Hoshiko Security System 🌸" });

        message.reply({ embeds: [embed] });
    },
};