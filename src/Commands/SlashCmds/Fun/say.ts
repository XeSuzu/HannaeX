import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { HoshikoClient } from "../../../index";

interface SlashCommand {
  data: SlashCommandBuilder | any;
  category: string;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient
  ) => Promise<void>;
}

const command: SlashCommand = {
  category: "Fun",
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Hace que el bot diga un mensaje ✨")
    .addStringOption((o) =>
      o
        .setName("mensaje")
        .setDescription("El mensaje que quieres que el bot diga")
        .setRequired(true)
        .setMaxLength(1500)
    )
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction, client) {
    // Verificaciones iniciales
    if (!interaction.guild || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        content: "❌ Este comando solo funciona en canales de texto del servidor.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel;
    const mensaje = interaction.options.getString("mensaje", true).trim();

    if (mensaje.length < 1) {
      await interaction.editReply({
        content: "⚠️ Debes escribir un mensaje válido.",
        // Quitar flags aquí ❌
      });
      return;
    }

    // Sanitiza el mensaje básico
    const limpio = mensaje
      .replace(/@everyone/gi, "@\u200beveryone")
      .replace(/@here/gi, "@\u200bhere")
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "")
      .trim();

    try {
      await channel.send({
        content: limpio,
        allowedMentions: { parse: ["users"] },
      });

      await interaction.editReply({
        content: "✅ Mensaje enviado correctamente.",
        // Quitar flags aquí ❌
      });
    } catch (err) {
      console.error("Error en /say:", err);
      await interaction.editReply({
        content: "❌ Ocurrió un error al intentar enviar el mensaje.",
        // Quitar flags aquí ❌
      });
    }
  }
};

export = command;
