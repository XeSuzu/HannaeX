import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { HoshikoClient } from "../../../index";
import Tester from "../../../Models/testers";
import { SlashCommand } from "../../../Interfaces/Command"; // Ajusta la ruta
import { Logger } from "../../../Utils/SystemLogger";

const command: SlashCommand = {
  category: "Owner", // 🔒 CRÍTICO: Categoría Owner
  data: new SlashCommandBuilder()
    .setName("manage-testers")
    .setDescription("👑 [OWNER] Gestiona quién tiene acceso total al bot.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Da acceso total a un usuario (Tester)")
        .addUserOption((o) =>
          o
            .setName("usuario")
            .setDescription("El afortunado")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Quita el acceso total")
        .addUserOption((o) =>
          o.setName("usuario").setDescription("El usuario").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Ver lista de testers"),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    // 1. Verificar que seas TÚ (El Dueño Real)
    if (interaction.user.id !== process.env.BOT_OWNER_ID) {
      // 📊 Log de intento de acceso no autorizado
      await Logger.logSecurityBreach(interaction.user, "manage-testers");
      
      return interaction.reply({
        content: "⛔ No puedes usar esto.",
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const target = interaction.options.getUser("usuario", true);

      // Guardar en DB
      try {
        await Tester.create({
          userId: target.id,
          addedBy: interaction.user.id,
        });
        return interaction.reply(
          `✅ **Acceso Concedido:** ${target.tag} ahora es un Tester con permisos totales.`,
        );
      } catch (e) {
        return interaction.reply(`⚠️ Ese usuario ya es Tester.`);
      }
    }

    if (sub === "remove") {
      const target = interaction.options.getUser("usuario", true);
      const deleted = await Tester.findOneAndDelete({ userId: target.id });

      if (deleted)
        return interaction.reply(
          `🗑️ **Acceso Revocado:** ${target.tag} ya no tiene poderes.`,
        );
      else return interaction.reply(`⚠️ Ese usuario no estaba en la lista.`);
    }

    if (sub === "list") {
      const testers = await Tester.find();
      if (testers.length === 0)
        return interaction.reply("No hay testers activos.");

      const list = testers.map((t, i) => `${i + 1}. <@${t.userId}>`).join("\n");
      return interaction.reply({
        content: `📋 **Testers Activos:**\n${list}`,
        allowedMentions: { parse: [] },
      });
    }
  },
};
export default command;