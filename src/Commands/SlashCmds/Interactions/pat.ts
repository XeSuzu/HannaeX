// src/Commands/SlashCmds/Interactions/pat.ts
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

async function startPat(
  targetUser: User,
  authorUser: User,
  color: string,
  replyCallback: (payload: any) => Promise<Message>,
) {
  if (targetUser.id === authorUser.id) {
    const gif = await getAnimeGif("pat");
    return replyCallback({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `🥹 **${authorUser.username}** se da palmaditas a sí mism@. Todo va a estar bien~`,
          )
          .setImage(gif),
      ],
    });
  }

  const gif = await getAnimeGif("pat");
  const flavors = [
    `le da una tierna palmadita en la cabeza a`,
    `acaricia suavemente la cabeza de`,
    `le dice "buen trabajo" con palmaditas a`,
    `consuela con cariño a`,
  ];
  const flavor = flavors[Math.floor(Math.random() * flavors.length)];

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setDescription(
      `🤍 **${authorUser.username}** ${flavor} **${targetUser.username}**~\n\n*¿Aceptas las palmaditas?* 🥺`,
    )
    .setImage(gif)
    .setTimestamp()
    .setFooter({
      text: `Para ${targetUser.username} con cariño~`,
      iconURL: targetUser.displayAvatarURL(),
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("pat_accept")
      .setLabel("🥹 Aceptar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("pat_reject")
      .setLabel("😾 No gracias")
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
        content: "❌ Estas palmaditas no son para ti.",
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

    if (i.customId === "pat_accept") {
      const gif2 = await getAnimeGif("pat");
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#f8bbd0")
            .setDescription(
              `🥹 **${targetUser.username}** aceptó las palmaditas de **${authorUser.username}**. Qué ternura~`,
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
              `😾 **${targetUser.username}** no quería palmaditas hoy. Respetado.`,
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
    .setName("pat")
    .setDescription("🤍 Dale palmaditas a alguien")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("A quién pattear")
        .setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario", true);
    const member = interaction.member as GuildMember;
    await startPat(
      target,
      interaction.user,
      member?.displayHexColor || "#f8bbd0",
      async (p) => (await interaction.editReply(p)) as Message,
    );
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    if (!target)
      return message.reply(
        "🌸 Menciona a alguien. Ejemplo: `hoshi pat @usuario`",
      );
    await startPat(
      target,
      message.author,
      message.member?.displayHexColor || "#f8bbd0",
      async (p) => message.reply(p),
    );
  },
};
export default command;
