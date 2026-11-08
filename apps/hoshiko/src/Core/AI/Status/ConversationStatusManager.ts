import { EmbedBuilder } from "discord.js";

export type StatusPhraseType = "default" | "memory" | "research";

export interface StatusStep {
  title: string;
  detail: string;
  footer: string;
}

export class ConversationStatusManager {
  public static readonly COLOR_STATUS = 0xffe4e1; // Rosa neblina suave

  public static readonly RESEARCH_STEPS: StatusStep[] = [
    {
      title: "🔍 Decodificando consulta",
      detail: "Interpretando términos clave y contexto de tu mensaje...",
      footer: "Etapa 1 de 5 • Análisis de intención",
    },
    {
      title: "🌐 Rastreando información en vivo",
      detail: "Consultando fuentes oficiales y bases de datos actualizadas...",
      footer: "Etapa 2 de 5 • Búsqueda web activa",
    },
    {
      title: "⚖️ Verificación cruzada de datos",
      detail: "Cotejando múltiples reportes y filtrando información obsoleta...",
      footer: "Etapa 3 de 5 • Duda metódica y filtro",
    },
    {
      title: "✨ Estructurando síntesis",
      detail: "Organizando los puntos clave y preparando el formato...",
      footer: "Etapa 4 de 5 • Síntesis y redacción",
    },
    {
      title: "🐾 Pulido final",
      detail: "Revisando los últimos detalles para responderte con cuidado...",
      footer: "Etapa 5 de 5 • Finalizando entrega",
    },
  ];

  private static readonly PHRASES: Record<StatusPhraseType, string[]> = {
    default: [
      "Mmm, déjame pensar esto con calma... ya casi ✨",
      "Aguzando el oído y ordenando mis ideas... un momento 🐾",
      "Pensando con calma... un ratito y te respondo.",
      "Procesando lo que me dijiste... dame un momentito ♡",
    ],
    memory: [
      "Mmm, buscando entre mis recuerdos lo que me contaste... un momento ✨",
      "Haciendo memoria... buscando en mis recuerdos para responderte con cuidado 🐾",
      "Revisando lo que me contaste antes... ya casi lo tengo listo ♡",
      "Un instante, buscando entre mis recuerdos de lo que me contaste ✨",
    ],
    research: [
      "Mmm, investigando un poco para darte una respuesta precisa... ya casi ✨",
      "Rastreando fuentes e investigando el tema con cuidado... un segundito 🐾",
      "Buscando información confiable y al día, dame unos segundos ♡",
      "Profundizando en los detalles para traerte el dato exacto... ya casi 🐾",
    ],
  };

  static getProgressiveStep(stepIndex: number = 0): StatusStep {
    const idx = Math.min(Math.max(0, stepIndex), this.RESEARCH_STEPS.length - 1);
    return this.RESEARCH_STEPS[idx];
  }

  static createProgressiveStatusEmbed(botUser?: any, stepIndex: number = 0): EmbedBuilder {
    const step = this.getProgressiveStep(stepIndex);
    const embed = new EmbedBuilder()
      .setColor(this.COLOR_STATUS)
      .setDescription(`**${step.title}**\n*${step.detail}*`);

    if (botUser && typeof botUser.displayAvatarURL === "function") {
      embed.setAuthor({
        name: "Hoshiko",
        iconURL: botUser.displayAvatarURL(),
      });
    }

    embed.setFooter({ text: step.footer });
    return embed;
  }

  static getStatusPhrase(type: StatusPhraseType = "default"): string {
    const list = this.PHRASES[type] || this.PHRASES.default;
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  static getRotatingStatusPhrase(
    type: StatusPhraseType = "default",
    previousPhrase?: string,
  ): string {
    const list = this.PHRASES[type] || this.PHRASES.default;
    const candidates = list.filter((p) => p !== previousPhrase);
    const pool = candidates.length > 0 ? candidates : list;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  static createStatusEmbed(
    type: StatusPhraseType = "default",
    botUser?: any,
    customPhrase?: string,
  ): EmbedBuilder {
    const phrase = customPhrase || this.getStatusPhrase(type);
    const embed = new EmbedBuilder()
      .setColor(this.COLOR_STATUS)
      .setDescription(phrase);

    if (botUser && typeof botUser.displayAvatarURL === "function") {
      embed.setAuthor({
        name: "Hoshiko",
        iconURL: botUser.displayAvatarURL(),
      });
    }

    const footerLabels: Record<StatusPhraseType, string> = {
      default: "⚡ Pensando respuesta...",
      memory: "🧠 Consultando recuerdos personales...",
      research: "🔍 Búsqueda web en vivo activa...",
    };
    embed.setFooter({ text: footerLabels[type] || footerLabels.default });

    return embed;
  }
}
