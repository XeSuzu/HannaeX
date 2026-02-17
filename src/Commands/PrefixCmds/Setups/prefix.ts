import { Message, PermissionFlagsBits } from "discord.js";
import ServerConfig from "../../../Models/serverConfig";
import { HoshikoClient } from "../../../index";

const command = {
  name: "prefix",
  aliases: ["setprefix", "cambiarprefijo"],
  description: "Cambia el símbolo con el que responde el bot.",

  async execute(message: Message, args: string[], client: HoshikoClient) {
    if (!message.guild) return;

    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(
        "❌ **Acceso denegado.** Solo los administradores pueden cambiar mi prefijo.",
      );
    }

    const newPrefix = args[0];
    if (!newPrefix) {
      return message.reply(
        "⚠️ **Falta el prefijo.**\n> Uso correcto: `xprefix <nuevo_simbolo>`\n> Ejemplo: `xprefix .`",
      );
    }

    if (newPrefix.length > 3) {
      return message.reply("❌ El prefijo no puede tener más de 3 caracteres.");
    }

    try {
      await ServerConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { prefix: newPrefix },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      await message.reply(
        `✅ **¡Listo!** Prefijo actualizado a: \`${newPrefix}\`\n> Ahora usa: \`${newPrefix}ping\``,
      );
    } catch (error) {
      console.error(error);
      message.reply("❌ Hubo un error al guardar en la base de datos.");
    }
  },
};

export = command;
