// src/Commands/SlashCmds/Fun/Racha/crear.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  User,
} from "discord.js";
import { SlashCommand } from "../../../../Interfaces/Command";
import { createStreakGroup } from "../../../../Services/StreakService";

const command: SlashCommand = {
  category: "Fun",
  data: new SlashCommandBuilder()
    .setName("racha-crear")
    .setDescription("🔥 Crea una racha diaria con amigos.")
    .addStringOption((o) =>
      o.setName("nombre").setDescription("Nombre del grupo (ej: 'Los Nekos')").setRequired(true)
    )
    .addUserOption((o) => o.setName("miembro1").setDescription("Primer miembro").setRequired(true))
    .addUserOption((o) => o.setName("miembro2").setDescription("Segundo miembro").setRequired(false))
    .addUserOption((o) => o.setName("miembro3").setDescription("Tercer miembro").setRequired(false))
    .addUserOption((o) => o.setName("miembro4").setDescription("Cuarto miembro").setRequired(false))
    .addUserOption((o) => o.setName("miembro5").setDescription("Quinto miembro").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) {
      await interaction.editReply("❌ Las rachas solo funcionan en servidores.");
      return;
    }

    const ownerId   = interaction.user.id;
    const guildId   = interaction.guildId!;
    const channelId = interaction.channelId;
    const name      = interaction.options.getString("nombre", true);

    const members = [
      interaction.user,
      interaction.options.getUser("miembro1", true),
      interaction.options.getUser("miembro2"),
      interaction.options.getUser("miembro3"),
      interaction.options.getUser("miembro4"),
      interaction.options.getUser("miembro5"),
    ].filter(Boolean) as User[];

    const memberIds = [...new Set(members.map((u) => u.id))];

    if (memberIds.length < 2) {
      await interaction.editReply("❌ Mínimo 2 miembros para crear una racha.");
      return;
    }

    if (memberIds.length !== members.length) {
      await interaction.editReply("❌ No puedes repetir miembros.");
      return;
    }

    if (memberIds.length > 5) {
      await interaction.editReply("❌ Máximo 5 miembros (premium: 10).");
      return;
    }

    // Embed de invitación
    const buildInviteEmbed = (responses: Map<string, boolean>) =>
      new EmbedBuilder()
        .setColor(0xff8fab)
        .setTitle("🐾 ¡Invitación de racha!")
        .addFields(
          { name: "📛 Nombre", value: name, inline: true },
          { name: "👥 Miembros", value: members.map((u) => {
            const resp = responses.get(u.id);
            return resp === undefined ? `<@${u.id}> ⏳` : resp ? `<@${u.id}> ✅` : `<@${u.id}> ❌`;
          }).join("\n"), inline: false },
        )
        .setFooter({ text: "Todos deben aceptar en 5 minutos o se cancela." })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`racha-accept-${interaction.id}`)
        .setLabel("✅ Aceptar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`racha-reject-${interaction.id}`)
        .setLabel("❌ Rechazar")
        .setStyle(ButtonStyle.Danger),
    );

    const responses = new Map<string, boolean>();

    const inviteMsg = await interaction.editReply({
      embeds: [buildInviteEmbed(responses)],
      components: [row],
    });

    const collector = inviteMsg.createMessageComponentCollector({
      filter: (i) =>
        (i.customId === `racha-accept-${interaction.id}` ||
          i.customId === `racha-reject-${interaction.id}`) &&
        members.some((m) => m.id === i.user.id),
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      const accepted = i.customId.startsWith("racha-accept-");
      responses.set(i.user.id, accepted);

      // Si alguien rechazó, terminar ya
      if (!accepted) {
        collector.stop("rejected");
        await i.update({ embeds: [buildInviteEmbed(responses)], components: [] });
        return;
      }

      // Actualizar embed con estado actual
      await i.update({
        embeds: [buildInviteEmbed(responses)],
        components: responses.size === members.length ? [] : [row],
      });

      // Si todos aceptaron, terminar
      if (responses.size === members.length) collector.stop("all_accepted");
    });

    collector.on("end", async (_, reason) => {
      if (reason === "rejected") {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b6b)
              .setTitle("💔 Invitación rechazada")
              .setDescription("Alguien dijo que no. La racha no fue creada."),
          ],
          components: [],
        });
        return;
      }

      if (reason !== "all_accepted") {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x888888)
              .setTitle("⏰ Invitación expirada")
              .setDescription("No todos respondieron a tiempo."),
          ],
          components: [],
        });
        return;
      }

      // Crear el grupo
      const result = await createStreakGroup(
        ownerId,
        memberIds,
        memberIds.length === 2 ? "duo" : "group",
        name,
        guildId,
        channelId,
      );

      if (result.ok) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00ff88)
              .setTitle("🎉 ¡Racha creada!")
              .setDescription(
                `**${name}** está lista.\n` +
                `Usa **/racha** cada día para reclamar y mantenerla viva 🔥`
              )
              .addFields({
                name: "👥 Miembros",
                value: members.map((u) => `<@${u.id}>`).join(", "),
                inline: false,
              }),
          ],
          components: [],
        });
      } else {
        await interaction.editReply({
          content: `❌ Error al crear la racha: ${result.reason}`,
          components: [],
        });
      }
    });
  },
};

export default command;