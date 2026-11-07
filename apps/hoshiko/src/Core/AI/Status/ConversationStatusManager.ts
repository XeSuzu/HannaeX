import { EmbedBuilder } from "discord.js";

export type StatusPhraseType = "default" | "memory" | "research";

export class ConversationStatusManager {
  private static readonly COLOR_STATUS = 0xffe4e1; // Rosa neblina suave

  private static readonly PHRASES: Record<StatusPhraseType, string[]> = {
    default: [
      "Dame un momentito, estoy preparando algo bonito para ti ♡",
      "Pensando con calma... ya casi lo tengo ✨",
      "Acomodando mis ideas... un segundito 🐾",
      "Leyéndote con atención... ya te contesto ♡",
    ],
    memory: [
      "Un instante, estoy buscando entre mis recuerdos ✨",
      "Revisando lo que me contaste antes... un momentito ♡",
      "Buscando en mis recuerdos para responderte con cuidado 🐾",
    ],
    research: [
      "Investigando un poco para darte una buena respuesta... ✨",
      "Buscando información confiable, dame unos segundos ♡",
      "Profundizando en el tema para ti... ya casi 🐾",
    ],
  };

  static getStatusPhrase(type: StatusPhraseType = "default"): string {
    const list = this.PHRASES[type] || this.PHRASES.default;
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  static createStatusEmbed(type: StatusPhraseType = "default"): EmbedBuilder {
    const phrase = this.getStatusPhrase(type);
    return new EmbedBuilder()
      .setColor(this.COLOR_STATUS)
      .setDescription(phrase);
  }
}
