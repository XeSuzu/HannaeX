import {
  GoogleGenerativeAI as GoogleSDK,
  type ModelParams,
  type RequestOptions,
  type GenerativeModel,
} from "@google/generative-ai";

export class GoogleGenerativeAI extends GoogleSDK {
  constructor(
    _legacyApiKey: string,
    private readonly purpose: "main" | "moderation" = "main",
  ) {
    // El relay añade la key real desde Secret Manager.
    super("relay-placeholder");
  }

  override getGenerativeModel(
    modelParams: ModelParams,
    requestOptions?: RequestOptions,
  ): GenerativeModel {
    const baseUrl = process.env.GEMINI_RELAY_URL?.trim().replace(/\/+$/, "");
    const token = process.env.GEMINI_RELAY_TOKEN?.trim();

    if (!baseUrl || !token) {
      throw new Error("Falta GEMINI_RELAY_URL o GEMINI_RELAY_TOKEN");
    }

    if (!baseUrl.startsWith("https://")) {
      throw new Error("GEMINI_RELAY_URL debe usar HTTPS");
    }

    const headers = new Headers(requestOptions?.customHeaders);
    headers.set("x-relay-token", token);

    return super.getGenerativeModel(modelParams, {
      ...requestOptions,
      baseUrl: `${baseUrl}/${this.purpose}`,
      apiVersion: "v1beta",
      customHeaders: headers,
    });
  }
}
