import { Events, GuildMember, EmbedBuilder } from "discord.js";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember, newMember: GuildMember, client: any): Promise<void> {
    if (newMember.user.bot) return;

    const wasBoosting = !!oldMember.premiumSince;
    const isBoosting = !!newMember.premiumSince;

    // Sin cambio de boost — ignorar
    if (wasBoosting === isBoosting) return;

    const isNewBoost = !wasBoosting && isBoosting;

    const embed = new EmbedBuilder()
      .setColor(isNewBoost ? 0xff73fa : 0x808080)
      .setTitle(isNewBoost ? "🚀 ¡Nuevo Boost!" : "💨 Boost Perdido")
      .setThumbnail(newMember.user.displayAvatarURL())
      .addFields(
        {
          name: "Usuario",
          value: `${newMember.user.tag} \`(${newMember.user.id})\``,
          inline: true,
        },
        {
          name: "Total de boosts",
          value: `\`${newMember.guild.premiumSubscriptionCount ?? 0}\``,
          inline: true,
        },
        {
          name: "Nivel del servidor",
          value: `Nivel \`${newMember.guild.premiumTier}\``,
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Boost Log" });

    await HoshikoLogger.sendToChannel(newMember.guild, "boostlog", embed);
  },
};
                                                                                                      