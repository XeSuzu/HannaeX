import { Message, PermissionFlagsBits } from "discord.js";
import ServerConfig from "../../../Models/serverConfig";
import { HoshikoClient } from "../../../index";
import { PrefixCommand } from "../../../Interfaces/Command";

const command: PrefixCommand = {
  name: "prefix",
  aliases: ["setprefix", "cambiarprefijo"], 
  description: "Cambia el símbolo con el que responde el bot.",

  async execute(message: Message, args: string[], client: HoshikoClient) {
    if (!message.guild) return;

    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply(
        "❌ **Acceso denegado.** Solo los administradores pueden cambiar mi prefijo.",
      );
      return;
    }

    const newPrefix = args[0];
    if (!newPrefix) {
      await message.reply(
        "⚠️ **Falta el prefijo.**\n> Uso correcto: `xprefix <nuevo_simbolo>`\n> Ejemplo: `xprefix .`",
      );
      return;
    }

    if (newPrefix.length > 3) {
      await message.reply("❌ El prefijo no puede tener más de 3 caracteres.");
      return;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error al guardar el prefijo:", errorMessage);
      await message.reply("❌ Hubo un error al guardar en la base de datos.");
    }
  },
};

//  3. Exportación limpia y moderna
export default command;