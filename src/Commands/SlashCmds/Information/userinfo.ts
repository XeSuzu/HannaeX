import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { attachUserInfoCollector, createUserInfoView } from "./userinfoViews";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Profiles",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Revela un perfil detallado de un usuario, nyaa~!")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario del que deseas ver la información")
        .setRequired(false),
    ),

  async execute(interaction, client) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ Este comando solo puede usarse en un servidor.",
      });
      return;
    }

    try {
      // ❌ ELIMINADO: await interaction.deferReply(); // Público

      const targetUser =
        interaction.options.getUser("usuario") ?? interaction.user;
      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      const fetchedUser = await targetUser.fetch();

      const view = createUserInfoView(
        interaction,
        targetUser,
        member,
        fetchedUser,
      );

      const response = await interaction.editReply({
        embeds: [view.embed],
        components: [view.buttons],
      });

      attachUserInfoCollector(
        interaction,
        response,
        targetUser,
        member,
        fetchedUser,
        view,
      );
    } catch (error: any) {
      console.error("❌ Error en /userinfo:", error);
      const errorMessage = {
        content: "❌ Ocurrió un error al obtener la información del usuario.",
        embeds: [],
        components: [],
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage).catch(console.error);
      } else {
        await interaction.reply(errorMessage).catch(console.error);
      }
    }
  },
};
export default command;