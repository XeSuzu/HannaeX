// src/Commands/SlashCmds/Interactions/slap.ts
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

async function startSlap(
  targetUser: User,
  authorUser: User,
  color: string,
  replyCallback: (payload: any) => Promise<Message>,
) {
  if (targetUser.id === authorUser.id) {
    const gif = await getAnimeGif("slap");
    return replyCallback({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `😶 **${authorUser.username}**... te diste una cachetada a ti mism@. Todo bien?`,
          )
          .setImage(gif),
      ],
    });
  }

  const gif = await getAnimeGif("slap");
  const flavors = [
    `le da una cachetada épica a`,
    `viene con toda la mano a`,
    `le manda un tortazo a`,
    `le aplica la ley del talión a`,
  ];
  const flavor = flavors[Math.floor(Math.random() * flavors.length)];

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setDescription(
      `👋 **${authorUser.username}** ${flavor} **${targetUser.username}**!\n\n*¿Devolverás la cachetada?* 😤`,
    )
    .setImage(gif)
    .setTimestamp()
    .setFooter({
      text: `Esperando a ${targetUser.username}...`,
      iconURL: targetUser.displayAvatarURL(),
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("slap_return")
      .setLabel("👋 Devolver")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("slap_ignore")
      .setLabel("😤 Ignorar")
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
        content: "❌ Esta cachetada no es para ti.",
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

    if (i.customId === "slap_return") {
      const gif2 = await getAnimeGif("slap");
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff5252")
            .setDescription(
              `💥 **${targetUser.username}** le devolvió la cachetada a **${authorUser.username}**. ¡Empate!`,
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
              `😤 **${targetUser.username}** ignoró la cachetada con clase. Dignidad: 100.`,
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
    .setName("slap")
    .setDescription("👋 Dale una cachetada a alguien")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("A quién cachetear")
        .setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario", true);
    const member = interaction.member as GuildMember;
    await startSlap(
      target,
      interaction.user,
      member?.displayHexColor || "#ff5252",
      async (p) => (await interaction.editReply(p)) as Message,
    );
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    if (!target)
      return message.reply(
        "🌸 Menciona a alguien. Ejemplo: `hoshi slap @usuario`",
      );
    await startSlap(
      target,
      message.author,
      message.member?.displayHexColor || "#ff5252",
      async (p) => message.reply(p),
    );
  },
};
export default command;
