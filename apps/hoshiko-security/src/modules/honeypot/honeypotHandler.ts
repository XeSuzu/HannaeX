import { Message } from "discord.js";

export class HoneypotManager {
  private static honeypotChannels = new Map<string, string>();

  static setHoneypotChannel(guildId: string, channelId: string): void {
    this.honeypotChannels.set(guildId, channelId);
  }

  static getHoneypotChannel(guildId: string): string | undefined {
    return this.honeypotChannels.get(guildId);
  }

  static async handleMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const honeypotChannelId = this.honeypotChannels.get(message.guild.id);
    if (honeypotChannelId && message.channel.id === honeypotChannelId) {
      try {
        await message.delete().catch(() => null);

        if (message.member?.bannable) {
          await message.guild.members.ban(message.author.id, {
            reason:
              "[Hoshiko Security] Activación de canal Honeypot (bot de raid/scraper detectado).",
          });
        }

        console.warn(
          `[Honeypot] 🪤 Trampa activada por ${message.author.tag} (${message.author.id}) en ${message.guild.name}`,
        );
        return true;
      } catch (err) {
        console.error("[Honeypot] Error al procesar activación:", err);
      }
    }

    return false;
  }
}
