import { EmbedBuilder, Message, PermissionsBitField } from "discord.js";
import { SettingsManager } from "../Database/SettingsManager";
import AFK from "../Models/afk";
import {
  buildSnipeEmbed,
  buildSnipeNotFoundMessage,
  getSnipeEntry,
  SNIPE_MAX_ENTRIES,
} from "../Utils/snipe";

export async function handleTextMessageSnipe(message: Message, args: string[]) {
  if (!message.guildId) return;

  const settings = await SettingsManager.getSettings(message.guildId);
  if (!settings?.securityModules?.snipe) {
    await message.reply(
      "❌ El comando snipe está desactivado en este servidor. Un administrador puede activarlo con `/setup`.",
    );
    return;
  }

  const position = args[0] ? parseInt(args[0]) : 1;
  if (isNaN(position) || position < 1 || position > SNIPE_MAX_ENTRIES) {
    await message.reply(`❌ El número debe ser entre 1 y ${SNIPE_MAX_ENTRIES}.`);
    return;
  }

  const { total, entry } = await getSnipeEntry(message.channelId, position);
  if (!total || !entry) {
    await message.reply({ content: buildSnipeNotFoundMessage(position, total) });
    return;
  }

  const embed = buildSnipeEmbed(entry, position, total);
  await message.reply({ embeds: [embed] });
}

export async function handleTextMessageAfk(message: Message, args: string[]) {
  if (!message.guild || !message.member) {
    await message.reply("❌ Este comando solo funciona en un servidor.");
    return;
  }

  const reason = args.join(" ") || "Estoy ausente 🐾";
  let currentNickname = message.member.displayName;

  if (currentNickname.startsWith("[AFK] ")) {
    currentNickname = currentNickname.replace("[AFK] ", "");
  }

  const originalNickname = currentNickname;
  let nicknameChanged = false;

  if (message.member.id !== message.guild.ownerId) {
    const botMember = await message.guild.members.fetchMe();
    const hasPerms = botMember.permissions.has(
      PermissionsBitField.Flags.ManageNicknames,
    );
    const canChange =
      hasPerms &&
      botMember.roles.highest.position > message.member.roles.highest.position;

    if (canChange && !message.member.displayName.startsWith("[AFK] ")) {
      try {
        const newNickname = `[AFK] ${originalNickname}`.substring(0, 32);
        await message.member.setNickname(newNickname);
        nicknameChanged = true;
      } catch (error) {
        console.warn(`[AFK] No pude cambiar apodo a ${message.author.tag}`);
      }
    }
  }

  try {
    await AFK.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { reason, timestamp: new Date(), originalNickname },
      { upsert: true, new: true },
    );
  } catch (dbError) {
    console.error("[AFK] Error DB:", dbError);
    await message.reply("❌ Error al guardar tu estado AFK.");
    return;
  }

  const unixTimestamp = Math.floor(Date.now() / 1000);
  const embed = new EmbedBuilder()
    .setColor(0xffc0cb)
    .setTitle("🌙 Te has marcado como ausente")
    .setAuthor({
      name: `${message.author.username} ahora está AFK`,
      iconURL: message.author.displayAvatarURL(),
    })
    .addFields(
      { name: "Razón", value: `> ${reason}` },
      { name: "Ausente desde", value: `> <t:${unixTimestamp}:R>` },
    )
    .setFooter({ text: "Un pequeño descanso... 🐱💗" });

  if (nicknameChanged) {
    embed.addFields({
      name: "Apodo",
      value: "> He actualizado tu apodo a `[AFK]`.",
    });
  }

  await message.reply({ embeds: [embed] });
}
