// src/Commands/SlashCmds/Interactions/highfive.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  Message,
  SlashCommandBuilder,
  User,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { getAnimeGif } from "../../../Utils/animeGif";

async function startHighfive(
  targetUser: User,
  authorUser: User,
  color: string,
  replyCallback: (payload: any) => Promise<Message>,
) {
  if (targetUser.id === authorUser.id) {
    const gif = await getAnimeGif("highfive");
    return replyCallback({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🙌 **${authorUser.username}** se da un high five a sí mism@. Autoestima al 100.`,
          )
          .setImage(gif),
      ],
    });
  }

  const gif = await getAnimeGif("highfive");
  const flavors = [
    `le tiende la mano a`,
    `celebra con`,
    `le da un choca esos cinco a`,
    `quiere celebrar algo con`,
  ];
  const flavor = flavors[Math.floor(Math.random() * flavors.length)];

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setDescription(
      `🙌 **${authorUser.username}** ${flavor} **${targetUser.username}**!\n\n*¿Chocas los cinco?* ✋`,
    )
    .setImage(gif)
    .setTimestamp()
    .setFooter({
      text: `¡${targetUser.username}, no lo dejes colgado!`,
      iconURL: targetUser.displayAvatarURL(),
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("hf_accept")
      .setLabel("✋ ¡Choca!")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("hf_reject")
      .setLabel("😐 Dejarlo colgado")
      .setStyle(ButtonStyle.Secondary),
  );

  const msg = await replyCallback({
    content: `${targetUser}`,
    embeds: [embed],
    components: [row],
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
  });

  collector.on("collect", async (i: ButtonInteraction) => {
    if (i.user.id !== targetUser.id)
      return i.reply({
        content: "❌ Este high five no es para ti.",
        ephemeral: true,
      });

    const disabled = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("done")
        .setLabel("Procesado")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
    await i.update({ components: [disabled] });

    if (i.customId === "hf_accept") {
      const gif2 = await getAnimeGif("highfive");
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#66bb6a")
            .setDescription(
              `🙌 **${targetUser.username}** y **${authorUser.username}** chocaron los cinco. ¡GOAT behavior!`,
            )
            .setImage(gif2),
        ],
      });
    } else {
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#9e9e9e")
            .setDescription(
              `😶 **${targetUser.username}** dejó a **${authorUser.username}** colgado... incómodo.`,
            ),
        ],
      });
    }
    collector.stop();
  });
}

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("highfive")
    .setDescription("🙌 Choca los cinco con alguien")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Con quién chocar")
        .setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario", true);
    const member = interaction.member as GuildMember;
    await startHighfive(
      target,
      interaction.user,
      member?.displayHexColor || "#66bb6a",
      async (p) => (await interaction.editReply(p)) as Message,
    );
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    if (!target)
      return message.reply(
        "🌸 Menciona a alguien. Ejemplo: `hoshi highfive @usuario`",
      );
    await startHighfive(
      target,
      message.author,
      message.member?.displayHexColor || "#66bb6a",
      async (p) => message.reply(p),
    );
  },
};
export default command;
