// src/Commands/SlashCmds/Interactions/poke.ts
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

async function startPoke(
  targetUser: User,
  authorUser: User,
  color: string,
  replyCallback: (payload: any) => Promise<Message>,
) {
  if (targetUser.id === authorUser.id) {
    const gif = await getAnimeGif("poke");
    return replyCallback({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `👆 **${authorUser.username}** se molesta a sí mism@... ok.`,
          )
          .setImage(gif),
      ],
    });
  }

  const gif = await getAnimeGif("poke");
  const flavors = [
    `molesta insistentemente a`,
    `le da un dedazo a`,
    `poke poke... pokea a`,
    `no deja en paz a`,
  ];
  const flavor = flavors[Math.floor(Math.random() * flavors.length)];

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setDescription(
      `👆 **${authorUser.username}** ${flavor} **${targetUser.username}**!\n\n*¿Le devuelves el poke?* 😏`,
    )
    .setImage(gif)
    .setTimestamp()
    .setFooter({
      text: `psst... ${targetUser.username}~`,
      iconURL: targetUser.displayAvatarURL(),
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("poke_return")
      .setLabel("👆 Devolver")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("poke_ignore")
      .setLabel("🙄 Ignorar")
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
        content: "❌ Este poke no es para ti.",
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

    if (i.customId === "poke_return") {
      const gif2 = await getAnimeGif("poke");
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#7986cb")
            .setDescription(
              `👆👆 **${targetUser.username}** le devolvió el poke a **${authorUser.username}**. Guerra de pokes iniciada~`,
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
              `🙄 **${targetUser.username}** ignoró el poke. Corazón de piedra.`,
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
    .setName("poke")
    .setDescription("👆 Molesta a alguien con un poke")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("A quién pokear").setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario", true);
    const member = interaction.member as GuildMember;
    await startPoke(
      target,
      interaction.user,
      member?.displayHexColor || "#7986cb",
      async (p) => (await interaction.editReply(p)) as Message,
    );
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    if (!target)
      return message.reply(
        "🌸 Menciona a alguien. Ejemplo: `hoshi poke @usuario`",
      );
    await startPoke(
      target,
      message.author,
      message.member?.displayHexColor || "#7986cb",
      async (p) => message.reply(p),
    );
  },
};
export default command;
