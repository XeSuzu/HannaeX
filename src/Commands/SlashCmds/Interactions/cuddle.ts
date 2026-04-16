// src/Commands/SlashCmds/Interactions/cuddle.ts
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

async function getAnimeGif(category: string): Promise<string> {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${category}`);
    const json = await res.json();
    return json.results[0].url;
  } catch {
    return "https://media.tenor.com/7X7HPs4.gif";
  }
}

async function startCuddle(
  targetUser: User,
  authorUser: User,
  color: string,
  replyCallback: (payload: any) => Promise<Message>,
) {
  if (targetUser.id === authorUser.id) {
    const gif = await getAnimeGif("cuddle");
    return replyCallback({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🥺 **${authorUser.username}** se acurruca solito/a... ven aquí, te mando un cuddle virtual 🤍`,
          )
          .setImage(gif),
      ],
    });
  }

  const gif = await getAnimeGif("cuddle");
  const flavors = [
    `quiere acurrucarse contigo,`,
    `se acerca lentamente a`,
    `busca un momento tierno con`,
    `quiere sentir tu calidez,`,
  ];
  const flavor = flavors[Math.floor(Math.random() * flavors.length)];

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setDescription(
      `🤍 **${authorUser.username}** ${flavor} **${targetUser.username}**~\n\n*¿Te acurrucas?* 🥺`,
    )
    .setImage(gif)
    .setTimestamp()
    .setFooter({
      text: `para ${targetUser.username} con mucho cariño~`,
      iconURL: targetUser.displayAvatarURL(),
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("cuddle_accept")
      .setLabel("🤍 Acurrucarme")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("cuddle_reject")
      .setLabel("😶 Ahora no")
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
        content: "❌ Este momento tierno no es para ti.",
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

    if (i.customId === "cuddle_accept") {
      const gif2 = await getAnimeGif("cuddle");
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#f48fb1")
            .setDescription(
              `🤍 **${targetUser.username}** y **${authorUser.username}** se acurrucan juntos. Escena protegida.`,
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
              `😶 **${targetUser.username}** no estaba para cuddles hoy. Quizás mañana~`,
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
    .setName("cuddle")
    .setDescription("🤍 Acurrúcate con alguien")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Con quién acurrucarte")
        .setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario", true);
    const member = interaction.member as GuildMember;
    await startCuddle(
      target,
      interaction.user,
      member?.displayHexColor || "#f48fb1",
      async (p) => (await interaction.editReply(p)) as Message,
    );
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    if (!target)
      return message.reply(
        "🌸 Menciona a alguien. Ejemplo: `hoshi cuddle @usuario`",
      );
    await startCuddle(
      target,
      message.author,
      message.member?.displayHexColor || "#f48fb1",
      async (p) => message.reply(p),
    );
  },
};
export default command;
