export interface AiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64
  };
}

export interface AiContent {
  role: "user" | "model";
  parts: AiContentPart[];
}

export interface AiGenerationOptions {
  model?: string;
  systemInstruction?: string;
  contents: AiContent[];
  temperature?: number;
  maxOutputTokens?: number;
  safetyLevel?: "relaxed" | "standard" | "strict";
  tools?: Array<{ googleSearch: Record<string, unknown> } | any>;
  signal?: AbortSignal;
}

export interface AiStreamChunk {
  text: string;
  candidates?: any[];
  groundingMetadata?: any;
}

export interface IAiClient {
  readonly clientName: string;
  generateText(options: AiGenerationOptions): Promise<string>;
  generateStream(options: AiGenerationOptions): Promise<AsyncIterable<AiStreamChunk>>;
  healthCheck(): Promise<boolean>;
}
