import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { buildInviteActionRow } from "../../../Utils/inviteUtils";

const command: SlashCommand = {
  category: "Utility",
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("🌸 Obtén los enlaces de invitación para llevar a Hoshiko a tu servidor."),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client;
    const clientId = client.user?.id || process.env.BOT_ID || "";

    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce(
      (acc, g) => acc + (g.memberCount || 0),
      0,
    );
    const botPing = client.ws.ping < 0 ? 0 : client.ws.ping;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Hoshiko 🐾",
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTitle("🌸 Lleva a Hoshiko a tu servidor")
      .setDescription(
        `¡Hola! Soy **Hoshiko**, tu compañera para acompañar y proteger a tu comunidad con calidez, elegancia y precisión.\n\n` +
        `Actualmente acompaño a **${totalServers.toLocaleString()}** servidores y **${totalUsers.toLocaleString()}** usuarios.\n\n` +
        `> Elige la opción de invitación que mejor se ajuste a tu comunidad:`
      )
      .addFields(
        {
          name: "🌸 Permisos Recomendados (Estándar y Seguro)",
          value:
            "Solicita las facultades necesarias para moderación, niveles, tarjetas gráficas y filtros automáticos. **Es la opción recomendada para mantener tu servidor seguro y transparente.**",
          inline: false,
        },
        {
          name: "⚙️ Permisos Completos (Modo Administrador)",
          value:
            "Otorga la casilla `Administrador` de Discord con acceso total a todos los canales y roles. Útil para una configuración sin fricción ni ajustes canal por canal. *Concede este permiso solo si confías plenamente en el bot.*",
          inline: false,
        },
        {
          name: "🛡️ Seguridad & Auto-Mod",
          value: "Filtros contra spam, menciones masivas y protección de canales.",
          inline: true,
        },
        {
          name: "📈 Niveles & Voz",
          value: "Experiencia en texto y voz con tarjetas canvas personalizadas.",
          inline: true,
        },
        {
          name: "💌 Confesiones & Comunidad",
          value: "Buzón anónimo, bienvenida y herramientas de convivencia.",
          inline: true,
        },
      )
      .setColor(0xff9eb5)
      .setThumbnail(client.user?.displayAvatarURL({ size: 512 }) || null)
      .setFooter({
        text: `Latencia: ${botPing}ms • Creada con cariño y elegancia`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    const actionRow = buildInviteActionRow(
      clientId,
      process.env.SUPPORT_SERVER_INVITE,
    );

    await interaction.editReply({ embeds: [embed], components: [actionRow] });
  },
};

export default command;
