import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { HoshikoClient } from "../../../index";
// Importar Logger para auditoría de uso
import { Logger } from "../../../Utils/SystemLogger";

interface SlashCommand {
  data: SlashCommandBuilder | any;
  category: string;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) => Promise<void>;
}

const command: SlashCommand = {
  category: "Fun",
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Hace que el bot diga un mensaje")
    .addStringOption((o) =>
      o
        .setName("mensaje")
        .setDescription("El mensaje que quieres que el bot diga")
        .setRequired(true)
        .setMaxLength(1500),
    )
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages), // ⚠️ Sugerencia: ManageMessages es más seguro

  async execute(interaction, client) {
    // Verificaciones iniciales
    if (
      !interaction.guild ||
      !interaction.channel ||
      !(interaction.channel instanceof TextChannel)
    ) {
      await interaction.reply({
        content:
          "❌ Este comando solo funciona en canales de texto del servidor.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Deferimos de forma invisible
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel;
    const mensaje = interaction.options.getString("mensaje", true).trim();

    if (mensaje.length < 1) {
      await interaction.editReply({
        content: "⚠️ Debes escribir un mensaje válido.",
      });
      return;
    }

    // Sanitiza el mensaje
    const limpio = mensaje
      .replace(/@everyone/gi, "@\u200beveryone")
      .replace(/@here/gi, "@\u200bhere")
      // Nota: Esta regex elimina emojis y tildes, ten cuidado si quieres permitirlos.
      // Si quieres permitir todo menos control characters, usa: /[^\x20-\x7E\u00A0-\uFFFF]/g
      .trim();

    try {
      // Enviar el mensaje al canal
      await channel.send({
        content: limpio,
        allowedMentions: { parse: ["users"] }, // Evita menciones fantasma a roles
      });

      // Registrar uso en webhook (no bloquear la ejecución)
      void Logger.logSay(
        interaction.user,
        interaction.guild.name,
        channel.name,
        limpio,
      );

      // 3. Confirmamos al usuario
      await interaction.editReply({
        content: "✅ Mensaje enviado correctamente.",
      });
    } catch (err) {
      console.error("Error en /say:", err);
      await interaction.editReply({
        content: "❌ Ocurrió un error al intentar enviar el mensaje.",
      });
    }
  },
};

export = command;
