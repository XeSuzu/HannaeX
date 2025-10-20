import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Message
} from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { HoshikoClient } from '../../../index';

// ✅ Interfaz correcta y simple
interface SlashCommand {
  data: SlashCommandBuilder | any;
  category: string;
  execute: (interaction: ChatInputCommandInteraction, client: HoshikoClient) => Promise<void | Message>;
}

// ✅ Interfaz para los reportes
interface Report {
  id: number;
  userId: string;
  userTag: string;
  timestamp: string;
  descripcion: string;
}

const command: SlashCommand = {
  category: 'Information',
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Envía un reporte sobre un bug o problema con el bot.')
    .addStringOption(option =>
      option.setName('descripcion')
        .setDescription('Describe el problema de la forma más detallada posible.')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const descripcion = interaction.options.getString('descripcion', true);
    const user = interaction.user;

    const nuevoReporte: Report = {
      id: Date.now(),
      userId: user.id,
      userTag: user.tag,
      timestamp: new Date().toISOString(),
      descripcion
    };

    const filePath = path.join(__dirname, '../../../../reports.json');
    let reportes: Report[] = [];

    try {
      const data = await fs.readFile(filePath, 'utf8');
      reportes = JSON.parse(data) as Report[];
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error al leer reports.json:', error);
        return interaction.editReply({ content: 'Hubo un error al procesar la base de datos de reportes.' });
      }
    }

    reportes.push(nuevoReporte);

    try {
      await fs.writeFile(filePath, JSON.stringify(reportes, null, 2));
    } catch (error) {
      console.error('❌ Error al escribir en reports.json:', error);
      return interaction.editReply({ content: 'Hubo un error al guardar tu reporte.' });
    }

    // ✅ Embed kawaii y limpio
    const embedConfirmacion = new EmbedBuilder()
      .setColor(0x3ba55c)
      .setTitle('✅ ¡Reporte Enviado!')
      .setDescription('Gracias por tu ayuda para mejorar el bot. Tu reporte ha sido recibido.')
      .addFields([
        { name: 'Tu Reporte', value: `\`\`\`${descripcion}\`\`\`` }
      ])
      .setFooter({ text: `Gracias por tu feedback, ${user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embedConfirmacion] });
  }
};

export = command;
