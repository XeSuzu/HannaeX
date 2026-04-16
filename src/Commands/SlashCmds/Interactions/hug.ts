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
  InteractionResponse, // Asegúrate de importar esto si no lo usas en otro lado
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { SlashCommand } from "../../../Interfaces/Command";
import { getAnimeGif } from "../../../Utils/animeGif";

// ⚙️ LÓGICA CENTRAL (Compartida por Slash y Texto)
async function startHug(
  targetUser: User,
  authorUser: User,
  color: string,
  // Función para responder (abstraemos la diferencia entre interaction y message)
  replyCallback: (payload: any) => Promise<Message>,
) {
  // 1. Auto-Abrazo
  if (targetUser.id === authorUser.id) {
    const gifUrl = await getAnimeGif("hug");
    const embedAuto = new EmbedBuilder()
      .setColor(color as any)
      .setDescription(
        `💖 **${authorUser.username}**, abrazarte a ti mism@ es el primer paso. ¡Amor propio! ✨`,
      )
      .setImage(gifUrl)
      .setFooter({
        text: "Tú puedes con todo 🐻",
        iconURL: authorUser.displayAvatarURL(),
      });

    return replyCallback({ embeds: [embedAuto] });
  }

  // 2. Propuesta de Abrazo
  const gifUrl = await getAnimeGif("hug");
  const flavorText = [
    `quiere darte un abrazo lleno de cariño. 💖`,
    `te envía un abrazo estelar. 💫`,
    `te ofrece un abrazo reconfortante. ☕️`,
    `corre hacia ti con los brazos abiertos. 🏃‍♀️`,
  ][Math.floor(Math.random() * 4)];

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setDescription(
      `**${targetUser}**, ${authorUser} ${flavorText}\n\n*¿Aceptas este abrazo?* 🤔`,
    )
    .setImage(gifUrl)
    .setTimestamp()
    .setFooter({
      text: `Esperando a ${targetUser.username}...`,
      iconURL: targetUser.displayAvatarURL(),
    });

  // Botones
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("hug_accept")
      .setLabel("🤗 Aceptar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("hug_reject")
      .setLabel("✋ Rechazar")
      .setStyle(ButtonStyle.Danger),
  );

  // Enviamos mensaje y guardamos la referencia
  const responseMessage = await replyCallback({
    content: `✨ ¡**${authorUser.username}** quiere abrazar a ${targetUser}!`,
    embeds: [embed],
    components: [row],
  });

  // 3. Colector
  const collector = responseMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
  });

  collector.on("collect", async (i: ButtonInteraction) => {
    if (i.user.id !== targetUser.id) {
      return i.reply({
        content: "❌ Nyaa~ Este abrazo no es para ti.",
        ephemeral: true,
      });
    }

    // Desactivar botones
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("yes")
        .setLabel("Procesado")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
    await i.update({ components: [disabledRow] });

    if (i.customId === "hug_accept") {
      const returnGif = await getAnimeGif("hug");
      const embedOk = new EmbedBuilder()
        .setColor("#4caf50")
        .setDescription(
          `💖 **${targetUser.username}** aceptó el abrazo de **${authorUser.username}**. ¡Qué bonito! 🥰`,
        )
        .setImage(returnGif);
      await i.followUp({ embeds: [embedOk] });
    } else {
      const sadGif = await getAnimeGif("cry");
      const embedNo = new EmbedBuilder()
        .setColor("#f44336")
        .setDescription(
          `💔 **${targetUser.username}** rechazó el abrazo... Auch.`,
        )
        .setImage(sadGif);
      await i.followUp({
        content: `||💔 <@${authorUser.id}> ||`,
        embeds: [embedNo],
      });
    }
    collector.stop();
  });
}

// 📦 EXPORTACIÓN DEL COMANDO
const command: SlashCommand = {
  category: "Interactions",

  // 🟢 DATA SLASH
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("🤗 Envía un abrazo (Slash)")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("A quien abrazar")
        .setRequired(true),
    ),

  // 🟢 EJECUCIÓN SLASH (/hug)
  async execute(
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) {
    const target = interaction.options.getUser("usuario", true);
    const member = interaction.member as GuildMember;

    await startHug(
      target,
      interaction.user,
      member?.displayHexColor || "#f48fb1",
      // Adaptador: Interaction -> Message
      async (payload) => {
        return await interaction.editReply(payload) as Message;
      },
    );
  },

  // 🔵 EJECUCIÓN TEXTO (hoshi hug @usuario)
  async prefixRun(client: HoshikoClient, message: Message, args: string[]) {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply(
        "🌸 Nyaa~ Tienes que mencionar a alguien. Ejemplo: `hoshi hug @Suki`",
      );
    }

    const member = message.member;

    await startHug(
      target,
      message.author,
      member?.displayHexColor || "#f48fb1",
      // Adaptador: Message -> Message (Este no necesitaba cambios)
      async (payload) => message.reply(payload),
    );
  },
};
export default command;