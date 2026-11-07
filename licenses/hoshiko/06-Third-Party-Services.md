# 06 — Third-Party Services and Subprocessors (Internal Reference Dossier)

**Título:** Inventario Verificado de Proveedores Externos y Transferencias Internacionales  
**Identificador de Versión:** `HOSHIKO-INT-3P-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `INTERNALLY-APPROVED`  
**Alcance:** `apps/hoshiko` (Bot Principal)  
**Referencias:** `Services/gemini.ts`, `Services/search.ts`, `Services/Lyrics/`, `Features/linkProtector.ts`, `Utils/animeGif.ts`  

---

## 1. Matriz Completa de Proveedores Externos Verificados en Código

| Proveedor / Servicio | Naturaleza del Servicio | Ubicación / Jurisdicción | Datos Transmitidos desde Hoshiko | Evidencia en Código | Política / Términos del Proveedor |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Discord Inc.** | Plataforma de mensajería, Gateway WebSocket y API REST | Estados Unidos | Todos los eventos de Discord, respuestas de comandos, embeds, tarjetas Canvas y acciones de moderación | `apps/hoshiko/src/client/HoshikoClient.ts` | `https://discord.com/privacy` / `https://discord.com/terms` |
| **CubePath** | Proveedor de Máquina Virtual (Hosting del proceso Node.js, MongoDB local y Redis local) | Miami, Florida, Estados Unidos | Almacenamiento íntegro de la base de datos MongoDB, caché Redis y archivos rotativos de logs (`.jsonl`) | Infraestructura declarada por el responsable (`ecosystem.config.js`) | `https://cubepath.com/policy` |
| **Google LLC (Google Gemini API)** | Procesamiento de lenguaje natural, traducción, extracción de hechos y moderación asistida | Estados Unidos / Global | Prompts, contexto reciente del canal (10–15 mensajes), username, imágenes adjuntas en consultas de IA, casos en `/historial` | `apps/hoshiko/src/Services/gemini.ts`, `translationService.ts`, `aiJudge.ts`, `aiHistorySummarizer.ts` | `https://ai.google.dev/gemini-api/terms` / `https://policies.google.com/privacy` |
| **Google LLC (Custom Search JSON API)** | Búsqueda web y de imágenes (`googleapis.com/customsearch/v1`) | Estados Unidos | Texto de la consulta de búsqueda (filtrado previamente por `BLACKLISTED_TERMS_SET`; sin `userId`) | `apps/hoshiko/src/Services/search.ts:102` | `https://policies.google.com/privacy` |
| **Serper (`google.serper.dev`)** | API de búsqueda de imágenes (`https://google.serper.dev/images`) | Estados Unidos | Texto de la consulta de imagen (`q`), sin identificadores de usuario | `apps/hoshiko/src/Services/search.ts:165` | `https://serper.dev/privacy` |
| **Genius, LRCLIB, Lyrics.ovh e iTunes Search API** | Proveedores de letras musicales y metadatos de canciones (`genius-lyrics`, `lrclib.net`, `api.lyrics.ovh`, `itunes.apple.com`) | Estados Unidos / Internacional | Título de la canción y nombre del artista consultado (sin identificadores de Discord) | `apps/hoshiko/src/Services/Lyrics/lyricsFormatter.ts`, `providers/geniusProvider.ts`, `lrclibProvider.ts`, `lyricsOvhProvider.ts` | Términos públicos de cada API de catálogo musical |
| **Phish Sinking Yachts (`phish.sinking.yachts`)** | Feed público de dominios de phishing (`GET /v2/all` cada 6 horas) | Internacional | Ningún dato de usuario; Hoshiko sólo descarga la lista completa de dominios maliciosos con el header `X-Identity: Hoshiko-Discord-Bot` y evalúa localmente en memoria | `apps/hoshiko/src/Features/linkProtector.ts:58-61` | Servicio comunitario anti-phishing |
| **APIs de GIFs de Reacción (`nekos.best`, `api.otakugifs.xyz`, `api.waifu.im`, `media.tenor.com`)** | Obtención de URLs de GIFs de anime para comandos de interacción (`/hug`, `/kiss`, `/pat`, etc.) | Internacional | Categoría de reacción (ej. `hug`, `pat`), sin ningún dato de usuario | `apps/hoshiko/src/Utils/animeGif.ts:1-60` | Políticas públicas de cada API de imágenes |
| **CDNs de Recursos e Avatares (`cdn.discordapp.com`, `i.scdn.co`, `flaticon`, `wikimedia`, `imgur`, `pinimg`)** | Descarga de avatares de usuario, portadas de álbumes de Spotify (`i.scdn.co`) e iconos estáticos para renderizar tarjetas con `@napi-rs/canvas` | Estados Unidos / Global | Petición HTTP GET a la URL pública de la imagen desde la IP de la VM de Hoshiko | `apps/hoshiko/src/Commands/SlashCmds/Information/activity.ts`, `Renderers/spotifyRenderer.ts`, `instaRenderer.ts` | Términos de los respectivos CDNs |

---

## 2. Régimen de Transferencias Internacionales
Dado que el servidor virtual de Hoshiko reside en Miami, Florida (EE. UU.) a través de CubePath, y que tanto Discord como Google operan infraestructura en Estados Unidos, el uso de Hoshiko implica necesariamente el almacenamiento y procesamiento de datos en Estados Unidos. Esta circunstancia se informa de manera explícita en la Política de Privacidad pública conforme al Art. 56 y 60 de la LOPDP de Ecuador y el Capítulo V del RGPD.
