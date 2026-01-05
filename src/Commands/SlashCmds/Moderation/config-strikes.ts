import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  TextChannel
} from 'discord.js';
import GuildConfig from '../../../Models/GuildConfig';
import { HoshikoClient } from '../../../index';

// Helper para convertir "10m" → ms
function parseDuration(durationStr: string): number | null {
    const match = durationStr.match(/^(\d+)([smhd])$/);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return amount * 1000;
        case 'm': return amount * 60 * 1000;
        case 'h': return amount * 60 * 60 * 1000;
        case 'd': return amount * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

// Helper para formatear ms a un string legible
function formatDuration(ms: number): string {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}m`;
    if (ms < 86400000) return `${ms / 3600000}h`;
    return `${ms / 86400000}d`;
}

interface SlashCommand {
  category: string;
  data: any;
  execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<any>;
}

const command: SlashCommand = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('config-strikes')
    .setDescription('Configura las acciones automáticas por strikes.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('view').setDescription('Muestra la configuración actual de strikes.')
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Añade una nueva regla de acción automática.')
        .addIntegerOption(opt => opt.setName('points').setDescription('Puntos necesarios.').setRequired(true))
        .addStringOption(opt => opt.setName('action').setDescription('Acción.').setRequired(true).addChoices(
            { name: 'Timeout', value: 'timeout' },
            { name: 'Kick', value: 'kick' },
            { name: 'Ban', value: 'ban' }
        ))
        .addStringOption(opt => opt.setName('duration').setDescription('Duración (ej: 10m).').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Elimina una regla.')
        .addIntegerOption(opt => opt.setName('points').setDescription('Puntos de la regla.').setRequired(true))
    )
    .addSubcommand(sub =>
        sub.setName('set-log-channel')
          .setDescription('Establece el canal de logs.')
          .addChannelOption(opt => opt.setName('channel').setDescription('Canal de texto.').addChannelTypes(ChannelType.GuildText).setRequired(true))
    ),

  async execute(interaction, client) {
    if (!interaction.guild) return interaction.reply({ content: 'Solo en servidores.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
        let config = await GuildConfig.findOne({ guildId });
        if (!config) config = new GuildConfig({ guildId, autoActions: [] });

        switch (subcommand) {
            case 'view': {
                const embed = new EmbedBuilder().setTitle('⚙️ Configuración').setColor(0xEBA6D1);
                const logChannel = config.modLogChannel ? `<#${config.modLogChannel}>` : 'No configurado';
                embed.addFields({ name: 'Canal de Logs', value: logChannel });

                const actionsList = config.autoActions?.length > 0 
                    ? config.autoActions.sort((a: any, b: any) => a.points - b.points).map((act: any) => 
                        `• **${act.points} pts**: \`${act.action.toUpperCase()}\`${act.duration ? ` (${formatDuration(act.duration)})` : ''}`
                      ).join('\n')
                    : 'Sin reglas.';
                
                embed.addFields({ name: 'Reglas Automáticas', value: actionsList });
                return interaction.editReply({ embeds: [embed] });
            }

            case 'add': {
                const points = interaction.options.getInteger('points', true);
                const action = interaction.options.getString('action', true);
                const durationStr = interaction.options.getString('duration');
                let durationMs: number | undefined;

                if (action === 'timeout') {
                    if (!durationStr) return interaction.editReply({ content: '❌ Falta duración para timeout.' });
                    const parsed = parseDuration(durationStr);
                    if (!parsed) return interaction.editReply({ content: '❌ Formato inválido.' });
                    durationMs = parsed;
                }

                if (config.autoActions.some((act: any) => act.points === points)) {
                    return interaction.editReply({ content: `❌ Ya existe una regla para ${points} puntos.` });
                }

                // SOLUCIÓN AL ERROR: Forzamos el tipo a 'any' al hacer el push
                // Esto evita que TypeScript valide la estructura interna contra el Schema
                (config.autoActions as any[]).push({
                    points,
                    action,
                    duration: durationMs
                });

                await config.save();
                return interaction.editReply({ content: `✅ Regla añadida para **${points}** puntos.` });
            }

            case 'remove': {
                const points = interaction.options.getInteger('points', true);
                const initialLength = config.autoActions.length;
                config.autoActions = config.autoActions.filter((act: any) => act.points !== points);
                
                if (config.autoActions.length < initialLength) {
                    await config.save();
                    return interaction.editReply({ content: '✅ Regla eliminada.' });
                }
                return interaction.editReply({ content: '❌ No encontrada.' });
            }

            case 'set-log-channel': {
                const channel = interaction.options.getChannel('channel', true) as TextChannel;
                config.modLogChannel = channel.id;
                await config.save();
                return interaction.editReply({ content: `✅ Logs configurados en ${channel}.` });
            }
        }
    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: '😿 Error al guardar.' });
    }
  }
};

export default command;