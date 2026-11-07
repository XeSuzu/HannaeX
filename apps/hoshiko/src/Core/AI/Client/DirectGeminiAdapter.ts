import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SafetySetting,
} from "@google/generative-ai";
import type {
  AiGenerationOptions,
  AiStreamChunk,
  IAiClient,
} from "./IAiClient";

export class DirectGeminiAdapter implements IAiClient {
  readonly clientName = "DirectGeminiAdapter";
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.ALLOW_DIRECT_GEMINI_FALLBACK === "true";
    const key = process.env.GEMINI_API_KEY || process.env.GEMINI_MODERATION_API_KEY;
    if (this.isEnabled && key) {
      this.genAI = new GoogleGenerativeAI(key);
    }
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.isEnabled && this.genAI);
  }

  private assertAllowed(): void {
    if (!this.isEnabled) {
      throw new Error(
        "[DirectGeminiAdapter] Direct Google Gemini access is DISABLED by architectural policy. Gemini Relay is required in production.",
      );
    }
    if (!this.genAI) {
      throw new Error(
        "[DirectGeminiAdapter] GEMINI_API_KEY is not defined for direct adapter fallback.",
      );
    }
  }

  async generateText(options: AiGenerationOptions): Promise<string> {
    this.assertAllowed();

    const modelName = options.model || "gemini-1.5-flash";
    const safetySettings = this.buildSafetySettings(options.safetyLevel);

    const model = this.genAI!.getGenerativeModel({
      model: modelName,
      safetySettings,
      systemInstruction: options.systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 4096,
      },
      ...(options.tools && options.tools.length > 0 && { tools: options.tools }),
    });

    const res = await model.generateContent(
      { contents: options.contents as any },
      { signal: options.signal },
    );

    const candidate = res.response?.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("PROHIBITED_CONTENT");
    }

    return res.response.text();
  }

  async generateStream(
    options: AiGenerationOptions,
  ): Promise<AsyncIterable<AiStreamChunk>> {
    this.assertAllowed();

    const modelName = options.model || "gemini-1.5-flash";
    const safetySettings = this.buildSafetySettings(options.safetyLevel);

    const model = this.genAI!.getGenerativeModel({
      model: modelName,
      safetySettings,
      systemInstruction: options.systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 4096,
      },
      ...(options.tools && options.tools.length > 0 && { tools: options.tools }),
    });

    const res = await model.generateContentStream(
      { contents: options.contents as any },
      { signal: options.signal },
    );

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of res.stream) {
          if (chunk.candidates?.[0]?.finishReason === "SAFETY") {
            throw new Error("PROHIBITED_CONTENT");
          }
          const text = typeof chunk.text === "function" ? chunk.text() : "";
          const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
          yield {
            text,
            candidates: chunk.candidates,
            groundingMetadata,
          };
        }
      },
    };
  }

  private buildSafetySettings(
    safetyLevel: "relaxed" | "standard" | "strict" = "standard",
  ): SafetySetting[] {
    const threshold =
      safetyLevel === "relaxed"
        ? HarmBlockThreshold.BLOCK_NONE
        : safetyLevel === "strict"
          ? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
          : HarmBlockThreshold.BLOCK_ONLY_HIGH;

    return [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold },
    ];
  }
}
