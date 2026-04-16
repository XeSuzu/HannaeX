// src/Commands/SlashCmds/Interactions/bite.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChatInputCommandInteraction,
  Message,
  ButtonInteraction,
  GuildMember,
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

async function startBite(
  targetUser: User,
  authorUser: User,
  color: string,
  replyCallback: (payload: any) => Promise<Message>,
) {
  if (targetUser.id === authorUser.id) {
    const gif = await getAnimeGif("bite");
    return replyCallback({
      embeds: [
        new EmbedBuilder()
          .setColor(color as any)
          .setDescription(
            `😬 **${authorUser.username}** se muerde a sí mism@. Interesante elección.`,
          )
          .setImage(gif),
      ],
    });
  }

  const gif = await getAnimeGif("bite");
  const flavors = [
    `le pega una mordida a`,
    `muerde sin previo aviso a`,
    `le clava los dientes a`,
    `decide que hoy cena a`,
  ];
  const flavor = flavors[Math.floor(Math.random() * flavors.length)];

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setDescription(
      `😤 **${authorUser.username}** ${flavor} **${targetUser.username}**!\n\n*¿Muerde de vuelta?* 🦷`,
    )
    .setImage(gif)
    .setTimestamp()
    .setFooter({
      text: `au! ${targetUser.username}~`,
      iconURL: targetUser.displayAvatarURL(),
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("bite_return")
      .setLabel("🦷 Morder de vuelta")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("bite_ignore")
      .setLabel("😭 Llorar")
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
        content: "❌ Esta mordida no es para ti.",
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

    if (i.customId === "bite_return") {
      const gif2 = await getAnimeGif("bite");
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#ef5350")
            .setDescription(
              `🦷 **${targetUser.username}** mordió de vuelta a **${authorUser.username}**. ¡Se lo merecía!`,
            )
            .setImage(gif2),
        ],
      });
    } else {
      const gif2 = await getAnimeGif("cry");
      await i.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor("#90caf9")
            .setDescription(
              `😭 **${targetUser.username}** se puso a llorar... qué crueldad **${authorUser.username}**.`,
            )
            .setImage(gif2),
        ],
      });
    }
    collector.stop();
  });
}

const command: SlashCommand = {
  category: "Interactions",
  data: new SlashCommandBuilder()
    .setName("bite")
    .setDescription("🦷 Muerde a alguien")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("A quién morder").setRequired(true),
    ),

  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario", true);
    const member = interaction.member as GuildMember;
    await startBite(
      target,
      interaction.user,
      member?.displayHexColor || "#ef5350",
      async (p) => (await interaction.editReply(p)) as Message,
    );
  },

  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    if (!target)
      return message.reply(
        "🌸 Menciona a alguien. Ejemplo: `hoshi bite @usuario`",
      );
    await startBite(
      target,
      message.author,
      message.member?.displayHexColor || "#ef5350",
      async (p) => message.reply(p),
    );
  },
};
export default command;
