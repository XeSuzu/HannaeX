import { DirectGeminiAdapter } from "./DirectGeminiAdapter";
import { GeminiRelayAdapter } from "./GeminiRelayAdapter";
import type {
  AiGenerationOptions,
  AiStreamChunk,
  IAiClient,
} from "./IAiClient";

export class AiClientService {
  private static instance: AiClientService | null = null;
  private readonly primaryClient: IAiClient;
  private readonly fallbackClient: IAiClient | null = null;
  private readonly isDirectFallbackAllowed: boolean;

  private constructor() {
    this.primaryClient = new GeminiRelayAdapter();
    this.isDirectFallbackAllowed =
      process.env.ALLOW_DIRECT_GEMINI_FALLBACK === "true";

    if (this.isDirectFallbackAllowed) {
      this.fallbackClient = new DirectGeminiAdapter();
    }
  }

  static getInstance(): AiClientService {
    if (!AiClientService.instance) {
      AiClientService.instance = new AiClientService();
    }
    return AiClientService.instance;
  }

  getPrimaryClient(): IAiClient {
    return this.primaryClient;
  }

  async generateText(options: AiGenerationOptions): Promise<string> {
    try {
      return await this.primaryClient.generateText(options);
    } catch (err: any) {
      if (err.message === "PROHIBITED_CONTENT") throw err;

      // Política de seguridad: Prohibido bypass automático hacia Google en producción
      if (this.isDirectFallbackAllowed && this.fallbackClient) {
        console.warn(
          `[AiClientService] ⚠️ Relay no disponible en entorno de desarrollo/test (${err.message}). Usando DirectGeminiAdapter autorizado explícitamente.`,
        );
        return await this.fallbackClient.generateText(options);
      }

      console.error(
        `[AiClientService] ❌ Error en Gemini Relay: ${err.message}. Bypass automático denegado por política de seguridad.`,
      );
      throw err;
    }
  }

  async generateStream(
    options: AiGenerationOptions,
  ): Promise<AsyncIterable<AiStreamChunk>> {
    try {
      return await this.primaryClient.generateStream(options);
    } catch (err: any) {
      if (err.message === "PROHIBITED_CONTENT") throw err;

      if (this.isDirectFallbackAllowed && this.fallbackClient) {
        console.warn(
          `[AiClientService] ⚠️ Relay stream no disponible en desarrollo/test (${err.message}). Usando DirectGeminiAdapter.`,
        );
        return await this.fallbackClient.generateStream(options);
      }

      console.error(
        `[AiClientService] ❌ Error de stream en Gemini Relay: ${err.message}.`,
      );
      throw err;
    }
  }
}
