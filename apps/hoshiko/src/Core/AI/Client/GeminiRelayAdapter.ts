import type {
  AiGenerationOptions,
  AiStreamChunk,
  IAiClient,
} from "./IAiClient";

export class GeminiRelayAdapter implements IAiClient {
  readonly clientName = "GeminiRelayAdapter";
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.GEMINI_RELAY_URL ||
      "http://127.0.0.1:8080/gemini-relay"
    ).replace(/\/+$/, "");
    this.apiKey =
      options?.apiKey ||
      process.env.GEMINI_RELAY_KEY ||
      process.env.GEMINI_API_KEY ||
      "";
  }

  async healthCheck(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);
      return res !== null && (res.status === 200 || res.status === 204);
    } catch {
      return false;
    }
  }

  async generateText(options: AiGenerationOptions): Promise<string> {
    const payload = this.buildPayload(options);
    const model = options.model || "gemini-flash";
    const endpoint = `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "x-goog-api-key": this.apiKey }),
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[GeminiRelay] HTTP Error ${response.status}: ${errText.slice(0, 200)}`,
      );
    }

    const data: any = await response.json();
    const candidate = data?.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("PROHIBITED_CONTENT");
    }

    const textPart = candidate?.content?.parts?.find((p: any) => typeof p.text === "string");
    return textPart?.text || candidate?.content?.parts?.[0]?.text || "";
  }

  async generateStream(
    options: AiGenerationOptions,
  ): Promise<AsyncIterable<AiStreamChunk>> {
    const payload = this.buildPayload(options);
    const model = options.model || "gemini-flash";
    const endpoint = `${this.baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
        ...(this.apiKey && { "x-goog-api-key": this.apiKey }),
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[GeminiRelay] Stream HTTP Error ${response.status}: ${errText.slice(0, 200)}`,
      );
    }

    if (!response.body) {
      throw new Error("[GeminiRelay] Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    return {
      async *[Symbol.asyncIterator]() {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":") || trimmed === "event: ping") continue;

              let jsonStr = trimmed;
              if (trimmed.startsWith("data:")) {
                jsonStr = trimmed.slice(5).trim();
              }
              if (jsonStr === "[DONE]") return;

              try {
                const parsed = JSON.parse(jsonStr);
                const candidate = parsed?.candidates?.[0];
                if (candidate?.finishReason === "SAFETY") {
                  throw new Error("PROHIBITED_CONTENT");
                }
                const textPart = candidate?.content?.parts?.find((p: any) => typeof p.text === "string");
                const text = textPart?.text || "";
                yield {
                  text,
                  candidates: parsed?.candidates,
                  groundingMetadata: candidate?.groundingMetadata,
                };
              } catch (e: any) {
                if (e.message === "PROHIBITED_CONTENT") throw e;
                // Ignorar fragmentos no JSON en streaming SSE
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },
    };
  }

  private buildPayload(options: AiGenerationOptions) {
    return {
      contents: options.contents.map((c) => ({
        role: c.role,
        parts: c.parts.map((p) => {
          if (p.inlineData) {
            return {
              inlineData: {
                mimeType: p.inlineData.mimeType,
                data: p.inlineData.data,
              },
            };
          }
          return { text: p.text || "" };
        }),
      })),
      ...(options.systemInstruction && {
        systemInstruction: {
          parts: [{ text: options.systemInstruction }],
        },
      }),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 4096,
      },
      ...(options.tools && options.tools.length > 0 && { tools: options.tools }),
    };
  }
}
