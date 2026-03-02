import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { UserMemoryManager } from "../../../Database/UserMemoryManager";

export default {
  data: new SlashCommandBuilder()
    .setName("memory")
    .setDescription("Gestiona lo que Hoshiko recuerda sobre ti 🧠")
    .addSubcommand((sub) =>
      sub
        .setName("ver")
        .setDescription("Muestra todo lo que Hoshiko recuerda de ti en este servidor")
    )
    .addSubcommand((sub) =>
      sub
        .setName("borrar")
        .setDescription("Borra algo de tu memoria")
        .addStringOption((opt) =>
          opt
            .setName("opcion")
            .setDescription("¿Qué quieres borrar?")
            .setRequired(true)
            .addChoices(
              { name: "Todo", value: "todo" },
              { name: "Un fact específico", value: "uno" }
            )
        )
        .addIntegerOption((opt) =>
          opt
            .setName("numero")
            .setDescription("Número del fact a borrar (usa /memory ver para ver los números)")
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    ),

  // ✅ Le indica al interactionCreate que haga el defer como ephemeral
  ephemeral: true,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // ─── /memory ver ─────────────────────────────────────────────────────────
    if (subcommand === "ver") {
      const facts = await UserMemoryManager.getFacts(userId, guildId);

      if (facts.length === 0) {
        await interaction.editReply({
          content: "No recuerdo nada especial sobre ti todavía~ ¡Habla conmigo! 🌸",
        });
        return;
      }

      const factList = facts
        .map((f, i) => `\`${i + 1}.\` ${f}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🧠 Lo que recuerdo de ti~")
        .setDescription(factList)
        .setColor(0xff9ecd)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({
          text: `${facts.length}/20 recuerdos • Solo tú puedes ver esto`,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ─── /memory borrar ───────────────────────────────────────────────────────
    if (subcommand === "borrar") {
      const opcion = interaction.options.getString("opcion", true);

      if (opcion === "todo") {
        await UserMemoryManager.clearMemory(userId, guildId);
        await interaction.editReply({
          content: "¡Listo! Borré todo lo que recordaba de ti en este servidor~ 🌸 Como si nos acabáramos de conocer.",
        });
        return;
      }

      if (opcion === "uno") {
        const numero = interaction.options.getInteger("numero");

        if (!numero) {
          await interaction.editReply({
            content: "Necesitas indicar el número del fact a borrar~ Usa `/memory ver` primero para ver los números. 👀",
          });
          return;
        }

        const success = await UserMemoryManager.deleteFact(userId, guildId, numero - 1);

        if (!success) {
          await interaction.editReply({
            content: `No encontré el recuerdo número **${numero}**~ Usa \`/memory ver\` para ver cuáles tienes. 🌸`,
          });
          return;
        }

        await interaction.editReply({
          content: `¡Listo! Borré el recuerdo número **${numero}**~ 🗑️`,
        });
      }
    }
  },
};
