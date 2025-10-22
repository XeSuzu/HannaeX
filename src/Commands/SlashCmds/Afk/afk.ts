import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    ChatInputCommandInteraction,
    GuildMember,
    Message,
    MessageFlags,
    InteractionResponse
} from "discord.js";
import AFK from "../../../Models/afk";
import { HoshikoClient } from "../../../index";

interface SlashCommand {
    data: SlashCommandBuilder | any;
    category: string;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message | InteractionResponse>;
}

const command: SlashCommand = {
    category: 'Information',
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription("😽 Marca que estás AFK y avisa a quienes te mencionen.")
        .addStringOption(option =>
            option
                .setName("razon")
                .setDescription("Opcional: ¿Por qué te ausentas? 🐾")
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        if (!interaction.guild || !interaction.member) {
            return interaction.editReply({ content: "Este comando solo se puede usar en un servidor." });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const reason = interaction.options.getString("razon") ?? "Estoy ausente 🐾";

        let nicknameChanged = false;
        const originalNickname = member.displayName;

        if (member.id !== interaction.guild.ownerId) {
            const botMember = await interaction.guild.members.fetchMe();
            const hasPerms = botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames);
            const canChange = hasPerms && (botMember.roles.highest.position > member.roles.highest.position);

            if (canChange) {
                try {
                    const newNickname = `[AFK] ${originalNickname}`.slice(0, 32);
                    await member.setNickname(newNickname);
                    nicknameChanged = true;
                } catch (error) {
                    console.error(`[AFK] No se pudo cambiar el apodo para ${member.user.tag}:`, error);
                }
            }
        } else {
            console.log(`[AFK] Se omitió el cambio de apodo para el dueño del servidor: ${member.user.tag}`);
        }

        try {
            await AFK.findOneAndUpdate(
                { userId: interaction.user.id, guildId: interaction.guildId },
                {
                    reason,
                    timestamp: new Date(),
                    originalNickname
                },
                { upsert: true, new: true }
            );
        } catch (dbError) {
            console.error("[AFK] Error al guardar en la base de datos:", dbError);
            return interaction.editReply({ content: "Hubo un error con la base de datos al establecer tu AFK." });
        }

        const unixTimestamp = Math.floor(Date.now() / 1000);
        const embed = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setTitle("🌙 Te has marcado como ausente")
            .setAuthor({ name: `${interaction.user.username} ahora está AFK`, iconURL: interaction.user.displayAvatarURL() })
            .addFields(
                { name: "Razón", value: `> ${reason}` },
                { name: "Ausente desde", value: `> <t:${unixTimestamp}:R>` }
            )
            .setFooter({ text: "Un pequeño descanso... 🐱💗" });

        if (nicknameChanged) {
            embed.addFields({ name: "Apodo", value: "> Se ha actualizado el apodo a `[AFK]`."});
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

export = command;