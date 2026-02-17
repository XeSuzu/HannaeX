import {
  Message,
  PermissionsBitField,
  TextChannel,
  NewsChannel,
  DMChannel,
} from "discord.js";
import { HoshikoClient } from "../../../index";
import { Logger } from "../../../Utils/SystemLogger";

interface PrefixCommand {
  name: string;
  description: string;
  execute: (
    message: Message<boolean>,
    args: string[],
    client: HoshikoClient,
  ) => Promise<void>;
}

const command: PrefixCommand = {
  name: "say",
  description: "Hace que el bot diga un mensaje",

  async execute(message, args, client) {
    if (!message.channel?.isTextBased()) return;

    const channel = message.channel as TextChannel | NewsChannel | DMChannel;
    const msg = args.join(" ");
    const botMember = message.guild?.members.me;

    try {
      if (
        message.guild &&
        !botMember?.permissions.has(PermissionsBitField.Flags.SendMessages)
      ) {
        const channelName = (channel as TextChannel | NewsChannel).name ?? "DM";
        await message.author
          .send(
            `❌ No tengo permisos para enviar mensajes en el canal ${channelName}.`,
          )
          .catch(() => {});
        return;
      }

      if (!msg) {
        await channel.send(
          `❌ ${message.author}, debes escribir un mensaje para que lo diga.`,
        );
        return;
      }

      if (msg.includes("@everyone") || msg.includes("@here")) {
        await channel.send(
          `🚫 ${message.author}, no puedes mencionar a todos con este comando.`,
        );
        return;
      }

      if (
        message.guild &&
        botMember?.permissions.has(PermissionsBitField.Flags.ManageMessages)
      ) {
        await message.delete().catch(() => {});
      }

      await channel.send(msg);

      Logger.logSay(
        message.author,
        message.guild?.name || "DM",
        (channel as any).name || "Desconocido",
        msg,
      );
    } catch (error) {
      console.error("Error en el comando say:", error);
      await channel
        .send(`❌ Ocurrió un error al ejecutar el comando.`)
        .catch(() => {});
    }
  },
};

export = command;
