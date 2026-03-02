import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OAuth2Scopes,
  PermissionFlagsBits,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("✨ Genera una tarjeta de invitación premium."),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client;

    // 1. Generar Link con permisos de Administrador
    const inviteUrl = client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: [PermissionFlagsBits.Administrator],
    });

    // 2. Datos para presumir
    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce(
      (acc, g) => acc + g.memberCount,
      0,
    );
    const botPing = client.ws.ping;

    // 3. Embed
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Hoshiko System v2.0`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTitle("🌸 ¿Listo para mejorar tu Servidor?")
      .setDescription(
        `Hoshiko es la compañera inteligente que tu comunidad necesita. Desde moderación avanzada hasta charlas con IA.\n\n**¡Actualmente cuidando de ${totalServers} servidores y ${totalUsers} usuarios!**`,
      )
      .addFields(
        { name: "🛡️ Seguridad", value: "Auto-Mod, Logs, Anti-Raid", inline: true },
        { name: "🧠 Inteligencia", value: "IA Generativa (Gemini), Chat", inline: true },
        { name: "🎭 Diversión", value: "Niveles, Confesiones, Roles", inline: true },
      )
      .setColor("#ff9eb5")
      .setThumbnail(client.user?.displayAvatarURL({ size: 512 }))
      .setImage("https://i.pinimg.com/originals/0d/f5/59/0df559e264fa08b7fa204f7c67a33926.gif")
      .setFooter({
        text: `Ping: ${botPing}ms • Desarrollado con 💖`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    // 4. Botonera
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Invitar al Servidor")
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl)
        .setEmoji("🔗"),
    );

    // 👇 editReply en lugar de reply, porque interactionCreate ya hizo deferReply
    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
