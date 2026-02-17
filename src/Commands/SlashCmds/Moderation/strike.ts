import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  SharedNameAndDescription,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { addStrike, getTotalPoints } from "../../../Database/strike";
import { checkAutoActions } from "../../../Services/strikeActions";

interface SlashCommand {
  category: string;
  // Usamos un tipo más amplio para evitar errores con toJSON() o Builders
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | any;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) => Promise<any>;
}

const command: SlashCommand = {
  category: "Moderation",
  // Eliminamos .toJSON() aquí para que el objeto mantenga su estructura de Builder
  data: new SlashCommandBuilder()
    .setName("strike")
    .setDescription("Añade un strike a un usuario (moderadores).")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Usuario a sancionar")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("puntos")
        .setDescription("Cantidad de puntos del strike")
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName("razon")
        .setDescription("Razón del strike")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    // Es buena práctica asegurar que estamos en un servidor antes del defer
    if (!interaction.guild) {
      return interaction.reply({
        content: "Este comando debe ejecutarse en un servidor.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const target = interaction.options.getUser("usuario", true);
      const points = interaction.options.getInteger("puntos") ?? 1;
      const reason =
        interaction.options.getString("razon") ?? "Sin razón proporcionada";

      // Validaciones de seguridad
      if (target.id === client.user?.id) {
        return interaction.editReply({
          content:
            "¡No puedes hacerme eso! ٩(๏̯͡๏)۶ No puedo sancionarme a mí misma.",
        });
      }
      if (target.id === interaction.user.id) {
        return interaction.editReply({
          content: "No puedes sancionarte a ti mismo, ¡ten más cuidado!",
        });
      }
      if (target.bot) {
        return interaction.editReply({
          content:
            "Los otros bots también tienen sentimientos, no los sanciones.",
        });
      }

      // Guardar strike en la base de datos
      await addStrike(
        interaction.guild.id,
        target.id,
        interaction.user.id,
        points,
        reason,
      );
      const total = await getTotalPoints(interaction.guild.id, target.id);

      // Crear el mensaje bonito
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("⚠️ Strike añadido")
        .setDescription(
          `Se han añadido **${points}** punto(s) a **${target.tag}**.`,
        )
        .addFields(
          { name: "Razón", value: reason, inline: false },
          { name: "Moderador", value: `${interaction.user.tag}`, inline: true },
          { name: "Puntos totales", value: `${total}`, inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Intentar avisar al usuario por privado
      try {
        await target.send(
          `Hola, has recibido ${points} strike(s) en **${interaction.guild.name}**.\n**Razón:** ${reason}\n**Puntos totales:** ${total}`,
        );
      } catch {
        /* El usuario puede tener DMs cerrados */
      }

      // ¡Aquí está la magia! Revisamos si se debe aplicar una acción automática.
      await checkAutoActions(client, interaction.guild, target, total);
    } catch (err) {
      console.error("Error en /strike:", err);
      // Usamos un mensaje tierno incluso en los errores
      await interaction.editReply({
        content:
          "Lo siento mucho, ocurrió un error inesperado al procesar el strike. ＞﹏＜",
      });
    }
  },
};

export default command;
