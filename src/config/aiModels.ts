/**
 * Modelos de Google Gemini utilizados por los servicios de IA y moderación en HannaeX.
 * Centraliza los identificadores oficiales de modelo y permite sobreescritura vía variables de entorno.
 */

export const GEMINI_MODEL_FLASH =
  process.env.GEMINI_MODEL_FLASH || "gemini-2.0-flash";

export const GEMINI_MODEL_FLASH_LITE =
  process.env.GEMINI_MODEL_FLASH_LITE || "gemini-2.0-flash-lite";
