import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, Message, version as djsVersion } from 'discord.js';
import { HoshikoClient } from '../../../index'; 

interface SlashCommand {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message>;
}

const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica la conexión y el estado del sistema de Hoshiko 🩵'),

    async execute(interaction, client) {
        try {
            const sent = await interaction.reply({ content: '⏳ Midiendo latencia... nya~', fetchReply: true });

            // --- Datos básicos ---
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(client.ws.ping);
            const color = latency > 400 ? 0xED4245 : latency > 200 ? 0xFEE75C : 0x57F287;

            // --- Datos técnicos y del sistema ---
            const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            const uptime = client.uptime ?? 0;
            const d = Math.floor(uptime / 86400000);
            const h = Math.floor((uptime % 86400000) / 3600000);
            const m = Math.floor((uptime % 3600000) / 60000);
            const uptimeString = `${d}d ${h}h ${m}m`;

            // --- Info de red y comandos ---
            const servers = client.guilds.cache.size;
            const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
            const totalCommands = client.slashCommands.size + client.commands.size;

            // --- Embed más expresivo ---
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🏓 Pong, ${interaction.user.username}-nya~!`)
                .setThumbnail(client.user?.displayAvatarURL() ?? null)
                .setDescription('✨ *Hoshiko lista.*')
                .addFields(
                    { 
                        name: '📡 Latencia',
                        value: `\`\`\`yaml\nBot       :: ${latency}ms\nAPI        :: ${apiLatency}ms\n\`\`\``,
                        inline: true 
                    },
                    { 
                        name: '💾 Sistema',
                        value: `\`\`\`yaml\nRAM        :: ${memoryUsage}MB\nUptime     :: ${uptimeString}\nNode.js    :: ${process.version}\n\`\`\``,
                        inline: true 
                    },
                    { 
                        name: '🌐 Red',
                        value: `\`\`\`yaml\nServidores :: ${servers}\nUsuarios   :: ${users}\nComandos   :: ${totalCommands}\nDiscord.js :: v${djsVersion}\n\`\`\`` 
                    }
                )
                .setFooter({ text: '💙 Hoshiko Status System — Precisión neko™' })
                .setTimestamp();

            // --- Animación visual: mensaje intermedio ---
            await interaction.editReply({
                content: `✅ Latencia estable detectada, nya~`,
                embeds: [embed],
            });

        } catch (error: any) {
            console.error('❌ Error en /ping:', error);
            const msg = '⚠️ Ocurrió un error al calcular el ping, nya~';
            if (interaction.replied || interaction.deferred)
                await interaction.followUp({ content: msg, ephemeral: true });
            else
                await interaction.reply({ content: msg, ephemeral: true });
        }
    }
};

export = command;
