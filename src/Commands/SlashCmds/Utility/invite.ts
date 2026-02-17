import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OAuth2Scopes,
  PermissionFlagsBits,
  Colors,
} from "discord.js";

export default {
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

    // 2. Datos para "fardar" (Presumir)
    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce(
      (acc, g) => acc + g.memberCount,
      0,
    );
    const botPing = client.ws.ping;

    // 3. Diseño Premium (Embed)
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
        {
          name: "🛡️ Seguridad",
          value: "Auto-Mod, Logs, Anti-Raid",
          inline: true,
        },
        {
          name: "🧠 Inteligencia",
          value: "IA Generativa (Gemini), Chat",
          inline: true,
        },
        {
          name: "🎭 Diversión",
          value: "Niveles, Confesiones, Roles",
          inline: true,
        },
      )
      .setColor("#ff9eb5") // Un rosa más suave y estético
      .setThumbnail(client.user?.displayAvatarURL({ size: 512 })) // Avatar en alta calidad
      // 👇 TRUCO PRO: Si tienes un Banner (GIF) pon el link aquí. Si no, borra esta línea.
      .setImage(
        "https://i.pinimg.com/originals/0d/f5/59/0df559e264fa08b7fa204f7c67a33926.gif",
      )
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

      // Botón secundario (Opcional: Link a tu servidor de soporte o web)
      /*
                new ButtonBuilder()
                    .setLabel('Soporte / Ayuda')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/TU_SERVIDOR_AQUI') // Pon tu link real
                    .setEmoji('🆘')
                */
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
