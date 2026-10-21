import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { SlashCommand } from "../../../Interfaces/Command";
import { LANGUAGE_MAP, translateText } from "../../../Services/translationService";
import {
  ADMIN_MARKER,
  markAsAdminMessage,
} from "../../../Features/ai/adminMessageTracker";

const LANG_CHOICES = [
  ["Auto Detect", "auto"],
  ["English", "en"],
  ["Spanish", "es"],
  ["Portuguese", "pt"],
  ["French", "fr"],
  ["German", "de"],
  ["Japanese", "ja"],
  ["Korean", "ko"],
  ["Chinese (Simplified)", "zh-CN"],
] as const;

const command: SlashCommand = {
  category: "Fun",
  cooldown: 5, // 5 segundos entre traducciones
  data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription(
      "Traduce texto detectando automáticamente el idioma de origen",
    )
    .addStringOption((opt) => {
      let o = opt
        .setName("target")
        .setDescription("Idioma destino (defecto: English)")
        .setRequired(false);
      for (const [name, value] of LANG_CHOICES)
        o = o.addChoices({ name, value } as any);
      return o;
    })
    .addStringOption((opt) =>
      opt
        .setName("text")
        .setDescription(
          "Texto a traducir (si se omite intentará traducir el último mensaje)",
        )
        .setRequired(false),
    ),

  async execute(interaction, client) {
    // ❌ ELIMINADO: await interaction.deferReply();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const reply = await interaction.editReply(
        `❌ Falta la variable de entorno \`GEMINI_API_KEY\`.${ADMIN_MARKER}`,
      );
      if (reply?.id) markAsAdminMessage(reply.id);
      return;
    }

    let text = interaction.options.getString("text");
    const targetInput = interaction.options.getString("target") || "en";

    // If no text provided, attempt to fetch the last non-bot message in the channel
    if (!text) {
      try {
        const channel = interaction.channel;
        if (!channel || !channel.isTextBased()) {
          const reply = await interaction.editReply(
            `❌ No puedo acceder al canal para obtener el mensaje.${ADMIN_MARKER}`,
          );
          if (reply?.id) markAsAdminMessage(reply.id);
          return;
        }
        const messages = await channel.messages.fetch({ limit: 5 });
        const last = messages
          .filter((m) => !m.author.bot)
          .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
          .first();
        if (!last) {
          const reply = await interaction.editReply(
            `❌ No encontré un mensaje válido para traducir.${ADMIN_MARKER}`,
          );
          if (reply?.id) markAsAdminMessage(reply.id);
          return;
        }
        text = last.content;
      } catch (err) {
        console.error("Error obteniendo mensaje anterior:", err);
        const reply = await interaction.editReply(
          `❌ Error al obtener el mensaje anterior.${ADMIN_MARKER}`,
        );
        if (reply?.id) markAsAdminMessage(reply.id);
        return;
      }
    }

    if (!text || text.trim().length === 0) {
      const reply = await interaction.editReply(
        `❌ Debes indicar texto a traducir o usar el comando en un canal con mensajes recientes.${ADMIN_MARKER}`,
      );
      if (reply?.id) markAsAdminMessage(reply.id);
      return;
    }

    if (text.length > 4000) {
      const reply = await interaction.editReply(
        `❌ El texto es demasiado largo para traducir (máx. 4000 caracteres).${ADMIN_MARKER}`,
      );
      if (reply?.id) markAsAdminMessage(reply.id);
      return;
    }

    try {
      const targetLang =
        targetInput === "auto"
          ? "Spanish"
          : LANGUAGE_MAP[targetInput] || targetInput;
      const { detectedLang, translation: translated } = await translateText(
        text,
        targetLang,
        apiKey,
      );

      if (!translated) {
        const reply = await interaction.editReply(
          `❌ No se pudo obtener la traducción.${ADMIN_MARKER}`,
        );
        if (reply?.id) markAsAdminMessage(reply.id);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🌐 Traducción (Gemini)")
        .addFields(
          { name: "Detectado", value: detectedLang, inline: true },
          { name: "Destino", value: targetLang, inline: true },
          {
            name: "Original",
            value: text.length > 200 ? text.substring(0, 200) + "..." : text,
          },
        )
        .setDescription(translated)
        .setColor(0x57f287)
        .setFooter({ text: `Solicitado por ${interaction.user.username}${ADMIN_MARKER}` });

      const reply = await interaction.editReply({ embeds: [embed] });
      if (reply?.id) markAsAdminMessage(reply.id);
    } catch (err: any) {
      console.error("Error en /translate:", err?.message || err);
      const reply = await interaction.editReply(
        `❌ Ocurrió un error al traducir.${ADMIN_MARKER}`,
      );
      if (reply?.id) markAsAdminMessage(reply.id);
    }
  },
};
export default command;