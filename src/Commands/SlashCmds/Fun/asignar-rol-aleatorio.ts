// src/Commands/Admin/viralRole.ts
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import ViralSetup from "../../../Database/Schemas/ViralSetup";

export default {
  data: new SlashCommandBuilder()
    .setName("config-viral")
    .setDescription("Configura premios por popularidad en mensajes")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

    .addSubcommand((sub) =>
      sub
        .setName("crear")
        .setDescription("Crea una nueva regla de popularidad")
        .addStringOption((opt) =>
          opt
            .setName("emoji")
            .setDescription("El emoji a detectar (ponlo aquí)")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("meta")
            .setDescription("Cuantas reacciones se necesitan")
            .setRequired(true),
        )
        .addRoleOption((opt) =>
          opt
            .setName("premio")
            .setDescription("Rol para el autor del mensaje")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("tiempo")
            .setDescription("Minutos de duración (0 = permanente)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("lista").setDescription("Ver reglas activas"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("borrar")
        .setDescription("Borra una regla")
        .addStringOption((opt) =>
          opt
            .setName("emoji")
            .setDescription("El emoji de la regla a borrar")
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "crear") {
      const rawEmoji = interaction.options.getString("emoji", true);
      const count = interaction.options.getInteger("meta", true);
      const role = interaction.options.getRole("premio", true);
      const minutes = interaction.options.getInteger("tiempo", true);

      // 🧠 MAGIA DE EMOJIS:
      // Si el emoji es custom viene así: <:pepe:123456789> -> Extraemos solo el ID.
      // Si es normal viene así: 🔥 -> Lo dejamos igual.
      const customEmojiMatch = rawEmoji.match(/<a?:.+:(\d+)>/);
      const emojiId = customEmojiMatch ? customEmojiMatch[1] : rawEmoji;

      // Guardamos
      await ViralSetup.findOneAndUpdate(
        { guildId: interaction.guildId, emoji: emojiId },
        { requiredCount: count, roleId: role.id, durationMinutes: minutes },
        { upsert: true, new: true },
      );

      return interaction.reply({
        content: `✅ **Regla Creada:**\nSi **cualquier mensaje** recibe **${count}** reacciones de ${rawEmoji}, el autor ganará el rol **${role.name}** por **${minutes} min**.`,
      });
    }

    if (sub === "lista") {
      const rules = await ViralSetup.find({ guildId: interaction.guildId });
      if (!rules.length)
        return interaction.reply({
          content: "No hay reglas configuradas.",
          ephemeral: true,
        });

      const embed = new EmbedBuilder()
        .setTitle("🌟 Reglas de Popularidad")
        .setColor("Purple");
      const description = rules
        .map((r) => {
          // Intentamos reconstruir el emoji para que se vea bonito
          const emojiDisplay = r.emoji.match(/^\d+$/)
            ? `<:emoji:${r.emoji}>`
            : r.emoji;
          return `• **${emojiDisplay}** x${r.requiredCount} \u279C Rol <@&${r.roleId}> (${r.durationMinutes}m)`;
        })
        .join("\n");

      embed.setDescription(description);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "borrar") {
      const rawEmoji = interaction.options.getString("emoji", true);
      const customEmojiMatch = rawEmoji.match(/<a?:.+:(\d+)>/);
      const emojiId = customEmojiMatch ? customEmojiMatch[1] : rawEmoji;

      await ViralSetup.findOneAndDelete({
        guildId: interaction.guildId,
        emoji: emojiId,
      });
      return interaction.reply({
        content: `🗑️ Regla para ${rawEmoji} eliminada.`,
      });
    }
  },
};
