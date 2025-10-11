import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionsBitField, 
    ChatInputCommandInteraction, 
    GuildMember, 
    Message 
} from "discord.js";
import AFK from "../../../Models/afk";
import { HoshikoClient } from "../../../index";

// Interfaz para la estructura de nuestros slash commands
interface SlashCommand {
    // ✅ CORRECCIÓN: Permitimos cualquier builder de slash commands
    data: SlashCommandBuilder | any;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message>;
}

const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription("😽 Marca que estás AFK y avisa a quienes te mencionen.")
        .addStringOption(option =>
            option
                .setName("razon")
                .setDescription("Opcional: ¿Por qué te ausentas? 🐾")
        ),

    async execute(interaction, client) {
        // Respondemos de forma efímera para no llenar el chat y evitar timeouts
        await interaction.deferReply({ ephemeral: true });

        // Si el comando no se usa en un servidor, no podemos continuar
        if (!interaction.guild || !interaction.member) {
            return interaction.editReply({ content: "Este comando solo se puede usar en un servidor." });
        }

        // Obtenemos la versión COMPLETA del miembro para tener todos los métodos
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const reason = interaction.options.getString("razon") ?? "Estoy ausente 🐾";

        // --- Lógica de Cambio de Apodo ---
        let nicknameChanged = false;
        const originalNickname = member.displayName;
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

        // --- Lógica de la Base de Datos ---
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

        // --- Respuesta Final al Usuario ---
        const unixTimestamp = Math.floor(Date.now() / 1000);
        const embed = new EmbedBuilder()
            .setColor(0xffc0cb)
            .setTitle("🌙 Te has marcado como ausente")
            .addFields(
                { name: "Razón", value: `> ${reason}` },
                { name: "Ausente desde", value: `> <t:${unixTimestamp}:R>` }
            )
            .setFooter({ text: "Un pequeño descanso... 🐱💗" });

        if (nicknameChanged) {
            embed.addFields({ name: "Apodo", value: "> Se ha actualizado tu apodo a `[AFK]`." });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

export = command;