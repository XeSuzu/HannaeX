# 05 — AI and Moderation Disclosure (Internal Reference Dossier)

**Título:** Divulgación Técnica de Inteligencia Artificial y Moderación Asistida  
**Identificador de Versión:** `HOSHIKO-INT-AIMOD-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `INTERNALLY-APPROVED`  
**Alcance:** `apps/hoshiko` (Bot Principal)  
**Referencias:** `Services/gemini.ts`, `Features/aiHandler.ts`, `Features/automod/aiJudge.ts`, `Features/automod/aiHistorySummarizer.ts`  

---

## 1. Flujos de Datos hacia Google Gemini API

En `apps/hoshiko`, el SDK `@google/generative-ai` se invoca en cinco flujos claramente delimitados:

| Flujo / Archivo | Modelo Utilizado (`config/aiModels.ts`) | Datos Enviados a Google | Almacenamiento Local del Resultado |
| :--- | :--- | :--- | :--- |
| **1. Conversación en Canal** (`Features/aiHandler.ts`, `conversationContext.ts`, `conversationReply.ts`) | `gemini-2.5-flash-lite` (con herramienta `googleSearch` en interacciones directas) | Instrucción del sistema (`SystemPrompts`), nombre del servidor y canal, username del autor, hasta 15 recuerdos (`UserMemory`), últimos 10 a 15 mensajes del canal y hasta 1 imagen adjunta (≤ 5 MB). | La respuesta se publica en Discord. No se guarda en `Conversation` (modelo huérfano). |
| **2. Extracción de Hechos Biográficos** (`Services/gemini.ts:extractFacts`, invocado por `aiHandler.ts`) | `gemini-2.5-flash-lite` | Sólo cuando `shouldExtractFacts(message.content)` detecta patrones biográficos explícitos: se envía el texto del mensaje del usuario para extraer hechos cortos (5–100 caracteres). | Hasta 15 hechos por `{ userId, guildId }` en MongoDB (`UserMemory`). |
| **3. Traducción** (`Services/translationService.ts`, comando `/translate`) | `gemini-2.5-flash` | Texto proporcionado por el usuario e idioma de destino. | Efímero; se responde en el canal de Discord sin guardar en DB. |
| **4. Juez de AutoMod IA** (`Features/automod/aiJudge.ts`) | `gemini-2.5-flash-lite` | Mensaje sospechoso, reglas activas del servidor (`serverRules`) y contexto breve para clasificar en `ok`, `spam`, `scam`, `toxic`, `raid` o `unsure`. | Veredicto en caché RAM (`automod_ai_verdicts`) por 1 hora. Si actúa o envía a revisión, crea registro en `CaseModel` y/o embed en `#message-review` / `#mod-log`. |
| **5. Resumen Disciplinario** (`Features/automod/aiHistorySummarizer.ts`, comando `/historial`) | `gemini-2.5-flash-lite` | `userTag`, `userId` y los últimos 15 casos disciplinarios (`action`, `reason` truncado a 100 caracteres, `ruleId`, `createdAt`). | Efímero; se muestra al moderador que ejecutó `/historial`. |

---

## 2. Decisiones Automatizadas y Modos de AutoMod (`shadow` vs. `enforce`)

En `apps/hoshiko`, la moderación opera en dos capas:
1. **Reglas Deterministas Locales (Sin IA):**
   - `wordFilter.ts`: Normaliza texto (acentos, leetspeak, homóglifos cirílicos/griegos, repeticiones) y aplica la acción configurada (`flag`, `delete` o `delete+timeout`).
   - `linkProtector.ts`: Bloquea dominios de phishing conocidos (lista en memoria + sincronización con `phish.sinking.yachts`) o enlaces no permitidos.
2. **Evaluación Asistida por IA (`aiJudge.ts`):**
   - **Modo `shadow` (Observación):** Registra veredictos o envía alertas a `#message-review` sin sancionar automáticamente al usuario.
   - **Modo `enforce` (Ejecución):** Puede eliminar el mensaje infractor, aplicar aislamiento temporal (*timeout*) o enviar a revisión humana con botones interactivos (`modlog_act:timeout`, `modlog_act:ban`, `modlog_act:forgive`).
   - **Salvaguarda de Reversión:** Los moderadores disponen del botón `modlog_act:forgive` y de los comandos `/unmute`, `/unban` y `/warn remove` para revertir cualquier falso positivo.

---

## 3. Régimen de Google Gemini y Restricción de Edad
- El titular declara operar con cuenta facturada de Google Cloud (*Paid Services*), bajo la cual Google no utiliza los prompts para entrenar sus modelos. Sin embargo, dado que la vinculación de facturación de cada clave (`GEMINI_API_KEY` / `GEMINI_MODERATION_API_KEY`) se configura fuera del código, se deja constancia de que el tratamiento por Google se rige por los [Términos de Servicio de Gemini API](https://ai.google.dev/gemini-api/terms).
- Debido a las restricciones de los Términos de Gemini API respecto a menores de 18 años, los documentos públicos informan expresamente de este requisito para las funciones asistidas por IA.
