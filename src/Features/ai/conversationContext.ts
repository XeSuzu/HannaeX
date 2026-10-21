import type { Content } from "@google/generative-ai";
import type { Message } from "discord.js";
import { UserMemoryManager } from "../../Database/ai/UserMemoryManager";
import { SystemPrompts } from "../../Utils/AI/SystemPrompts";
import type { SystemPromptContext } from "../../Utils/AI/SystemPrompts";
import type { IServerConfig } from "../../Database/guild/serverConfig.model";
import type { HoshikoClient } from "../../client/HoshikoClient";
import { isAdminMessage, stripAdminMarker } from "./adminMessageTracker";

const EMPTY_MENTION_RESPONSES = ["¿Me llamaste?", "Dime~", "¿Qué pasó?", "Aquí estoy~ ¿en qué te ayudo?", "¿Sí?"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const SUPPORTED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function sanitizeDialogueContent(text: string): string {
  if (!text) return "";
  // Neutralizar corchetes de prefijos de turno independientemente de Markdown previo (** o >), saltos de línea o idioma
  return text.replace(/\[([^[\]\n]{1,64}(?:\s+dice|\s+says)?)\s*\]\s*:/gi, "($1):");
}

export function shouldExtractFacts(userMessage: string): boolean {
  if (!userMessage || userMessage.trim().length < 8) return false;
  const trimmed = userMessage.trim();

  // Descartar de inmediato saludos puros y preguntas banales cortas
  if (/^(?:hola|buenas|buen d[ií]a|buenas (?:tardes|noches)|hey|holi|hello|hi|ok|gracias|xd|jaj+a*)\b/i.test(trimmed) && trimmed.length < 25) {
    return false;
  }

  const BIOGRAPHICAL_PATTERNS = [
    // Identidad y origen
    /\b(me llamo|mi nombre es|soy de|nací en|vivo en|hablo (?:español|inglés|francés|japonés|portugués|italiano|alemán))\b/i,
    // Edad, familia, mascotas y posesiones personales (con numerales y plurales)
    /\b(tengo \d{1,2} años|mi cumple(?:años)?)\b/i,
    /\b(tengo (?:un[a]?|\d+) (?:hijos?|herman[oa]s?|mascotas?|perros?|gatos?))\b/i,
    /\b(mi (?:novi[oa]|pareja|espos[oa]|herman[oa]|madre|padre|mamá|papá|mascota|perro|gato|hijo|hija))\b/i,
    // Dieta y condiciones personales
    /\b(soy (?:vegetarian[oa]|vegan[oa]|cel[ií]ac[oa]|al[eé]rgic[oa]))\b/i,
    /\b(no (?:como carne|tomo alcohol|bebo|fumo)|dejé de fumar)\b/i,
    // Trabajo, estudios y metas
    /\b(estudio|mi carrera|trabajo (?:de|en|como)|profesi[oó]n|mi sueño es)\b/i,
    // Gustos, aficiones y juegos
    /\b((?:me gusta mucho|me encanta|me fascina|amo|odio|no soporto|mi hobby))\b/i,
    /\b(mi (?:color|comida|juego|anime|música|banda|película|canción|deporte) favorit[oa])\b/i,
    /\b(juego (?:al?|mucho a|siempre a|todos los días a)|suelo jugar|practico)\b/i,
    // Preferencias de interacción explícitas
    /\b(prefiero que (?:me llames|me hables|me trates|me respondas)|mi apodo es)\b/i,
  ];

  return BIOGRAPHICAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export async function buildConversationContext(
  message: Message,
  client: HoshikoClient,
  config: IServerConfig,
  options: { isPremium: boolean; isMentioned: boolean; prefixMatch: boolean; isReplyToMe: boolean; isRandomTrigger: boolean },
): Promise<{ systemInstruction: string; historyForApi: Content[]; userMessage: string }> {
  const limit = options.isPremium ? 15 : 10;
  const prevMessages = await (message.channel as any).messages.fetch({ limit });
  const triggerType: SystemPromptContext["triggerType"] = options.isRandomTrigger ? "spontaneous" : options.isReplyToMe ? "reply" : "direct";
  const channelName = "name" in message.channel ? (message.channel as any).name : undefined;
  const userFacts = await UserMemoryManager.getFacts(message.author.id, message.guild!.id);
  const promptContext: SystemPromptContext = {
    guildName: message.guild!.name, channelName, triggerType, userFacts, currentUsername: message.author.username,
  };
  const systemInstruction = SystemPrompts.getInstruction(config, promptContext);
  const rawRecent = Array.from(prevMessages.values()).reverse() as Message[];
  // Si el mensaje actual fue devuelto en la ventana, descartarlo del historial previo para evitar duplicidad
  if (rawRecent.length > 0 && rawRecent[rawRecent.length - 1]?.id === message.id) {
    rawRecent.pop();
  }
  const recentMessages = rawRecent;
  const rawTurns: Array<{ role: "user" | "model"; text: string }> = [];

  for (const m of recentMessages) {
    const msgObj = m as Message;
    if (!msgObj.content && msgObj.attachments.size === 0) continue;

    const isAdmin = isAdminMessage(msgObj);
    let textContent = sanitizeDialogueContent(
      stripAdminMarker(msgObj.content.replace(/<@!?[0-9]+>/g, "").trim()),
    );
    if (msgObj.attachments.size > 0 && msgObj.author.id !== client.user!.id) {
      textContent += " [El usuario envió una imagen/archivo]";
    }
    if (!textContent && msgObj.attachments.size === 0) continue;

    // Determinar a quién respondía si es un reply
    let targetUser: string | undefined = undefined;
    if (msgObj.reference?.messageId) {
      const refInWindow = prevMessages.get(msgObj.reference.messageId);
      if (refInWindow) {
        targetUser =
          refInWindow.author.id === client.user!.id
            ? "Hoshiko"
            : refInWindow.author.username;
      } else if (msgObj.mentions?.repliedUser) {
        targetUser =
          msgObj.mentions.repliedUser.id === client.user!.id
            ? "Hoshiko"
            : msgObj.mentions.repliedUser.username;
      }
    }

    if (msgObj.author.id === client.user!.id && !isAdmin) {
      // Turno legítimo de la personalidad Hoshiko
      const prefix = targetUser ? `(En respuesta a ${targetUser}): ` : "";
      rawTurns.push({ role: "model", text: `${prefix}${textContent || "..."}` });
    } else if (isAdmin) {
      // Mensaje administrativo o /say emitido por la cuenta del bot (contexto del canal, no rol model)
      rawTurns.push({
        role: "user",
        text: `[Anuncio en el canal]: ${textContent || "..."}`,
      });
    } else {
      // Mensaje de un participante humano en el canal
      const refTag = targetUser ? ` (en respuesta a ${targetUser})` : "";
      rawTurns.push({
        role: "user",
        text: `[${msgObj.author.username}${refTag} dice]: ${textContent || "..."}`,
      });
    }
  }

  // Agrupar mensajes consecutivos del mismo rol para preservar la alternancia estricta del SDK
  const historyForApi: Content[] = [];
  for (const turn of rawTurns) {
    if (
      historyForApi.length > 0 &&
      historyForApi[historyForApi.length - 1].role === turn.role
    ) {
      const lastPart = historyForApi[historyForApi.length - 1].parts[0];
      if ("text" in lastPart) {
        lastPart.text += `\n${turn.text}`;
      }
    } else {
      historyForApi.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
  }

  // Descartar turnos huérfanos de modelo al inicio del historial
  while (historyForApi.length > 0 && historyForApi[0].role === "model") {
    historyForApi.shift();
  }
  let userMessage = sanitizeDialogueContent(
    stripAdminMarker(
      message.content.replace(new RegExp(`<@!?${client.user!.id}>`, "g"), "").trim(),
    ),
  );
  const escapedPrefix = (config.prefix || "x").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const triggerPrefixRegex = new RegExp(
    `^(?:hoshi(?:\\s+ask)?|(?:${escapedPrefix}|x|h!)\\s*ask)\\b`,
    "i",
  );
  if (triggerPrefixRegex.test(userMessage)) {
    userMessage = userMessage.replace(triggerPrefixRegex, "").trim();
  }
  if (!userMessage) {
    userMessage = EMPTY_MENTION_RESPONSES[Math.floor(Math.random() * EMPTY_MENTION_RESPONSES.length)];
  }
  const attachment = message.attachments?.first
    ? message.attachments.first()
    : null;
  const rawMime = attachment?.contentType?.toLowerCase().split(";")[0]?.trim();

  if (attachment && rawMime && rawMime.startsWith("image/")) {
    if (!SUPPORTED_IMAGE_MIMES.has(rawMime)) {
      historyForApi.push({
        role: "user",
        parts: [{ text: `[${message.author.username} dice]: ${userMessage} [Formato de imagen no compatible: ${rawMime}]` }],
      });
    } else if (attachment.size && attachment.size > MAX_IMAGE_SIZE_BYTES) {
      historyForApi.push({
        role: "user",
        parts: [{ text: `[${message.author.username} dice]: ${userMessage} [La imagen enviada excede el límite de 5MB y no pudo ser procesada]` }],
      });
    } else {
      try {
        const imgResponse = await fetch(attachment.url);
        if (!imgResponse.ok) throw new Error("fetch_failed");
        const contentLength = Number(imgResponse.headers.get("content-length"));
        if (contentLength && contentLength > MAX_IMAGE_SIZE_BYTES) {
          throw new Error("payload_too_large");
        }
        const imgBuffer = await imgResponse.arrayBuffer();
        if (imgBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
          throw new Error("payload_too_large");
        }
        historyForApi.push({
          role: "user",
          parts: [
            { text: `[${message.author.username} dice]: ${userMessage || "Mira esta imagen:"}` },
            { inlineData: { mimeType: rawMime, data: Buffer.from(imgBuffer).toString("base64") } },
          ],
        });
      } catch (err: any) {
        const reason = err?.message === "payload_too_large"
          ? "[La imagen enviada excede el límite de 5MB]"
          : "[Error al cargar la imagen enviada]";
        historyForApi.push({ role: "user", parts: [{ text: `[${message.author.username} dice]: ${userMessage} ${reason}` }] });
      }
    }
  } else {
    historyForApi.push({ role: "user", parts: [{ text: `[${message.author.username} dice]: ${userMessage}` }] });
  }
  return { systemInstruction, historyForApi, userMessage };
}
