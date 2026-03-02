import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { Logger } from "../../../Utils/SystemLogger";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Fun",
  // ✅ AQUÍ ESTÁ EL SECRETO: Le avisamos al Guardián Supremo cómo actuar
  options: {
    cooldown: 5,
    ephemeral: true, // Esto hace que el "Hoshiko está pensando..." sea privado
  },
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction, client: HoshikoClient) {
    // 1. Verificaciones iniciales
    // ✅ Usamos editReply porque el Guardián ya hizo el defer
    if (
      !interaction.guild ||
      !interaction.channel ||
      !(interaction.channel instanceof TextChannel)
    ) {
      await interaction.editReply({
        content: "❌ Este comando solo funciona en canales de texto del servidor.",
      });
      return;
    }

    const channel = interaction.channel;
    const mensaje = interaction.options.getString("mensaje", true).trim();

    if (mensaje.length < 1) {
      await interaction.editReply({
        content: "⚠️ Debes escribir un mensaje válido.",
      });
      return;
    }

    // 2. Sanitiza el mensaje
    const limpio = mensaje
      .replace(/@everyone/gi, "@\u200beveryone")
      .replace(/@here/gi, "@\u200bhere")
      .trim();

    try {
      // Enviar el mensaje al canal (esto sí es público)
      await channel.send({
        content: limpio,
        allowedMentions: { parse: ["users"] },
      });

      // Registrar uso (Auditoría)
      void Logger.logSay(
        interaction.user,
        interaction.guild.name,
        channel.name,
        limpio,
      );

      // 3. Confirmamos al usuario (esto será privado gracias al Guardián)
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

export default command;