# Hoshiko Music: Fuentes Musicales, Proveedores y Resolución de Audio

## 1. Visión General del Ciclo de Audio

Para evitar confusiones habituales en el desarrollo de bots de música, la arquitectura de **Hoshiko Music** divide estrictamente el ciclo de procesamiento de audio en **cuatro fases técnicas disjuntas**:

```text
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ 1. Búsqueda y Metadatos │ ──► │ 2. Resolución de Pista  │ ──► │  3. Acceso a la Fuente  │ ──► │  4. Decodificación/RTP  │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
  • Texto o URL ingresada         • Mapeo de ISRC/Título          • Negociación HTTP/CDN          • Lavaplayer en Java 21
  • Extracción de Título,         • Enlace Spotify ->             • Tráfico de chunks             • Filtros DSP / PCM
    Artista, Duración e             YouTube / SoundCloud            de audio                        • Empaquetado Opus
    ISRC (Spotify/iTunes)         • Selección de mejor match      • Manejo de PO-Tokens/429         48 kHz hacia Discord
```

1. **Fase 1 (Búsqueda y Metadatos):** Consulta inicial del término o URL suministrado por el usuario. No obtiene audio, sino la ficha técnica identificativa (título, artista, álbum, duración, miniatura y código ISRC estándar).
2. **Fase 2 (Resolución de Pista / Metadata Bridge):** Cuando la fuente original no permite streaming directo (como Spotify o Apple Music), el sistema traduce los metadatos a una consulta reproducible en una fuente abierta (YouTube Music o SoundCloud).
3. **Fase 3 (Acceso a la Fuente de Audio):** Negociación con los servidores de entrega de contenido (CDN). En esta fase operan las medidas anti-bot, la rotación de sesiones o los tokens de verificación de origen.
4. **Fase 4 (Decodificación y Transmisión RTP):** Lavaplayer decodifica el contenedor (WebM, MP4, MP3, OGG) a tramas PCM sin procesar, aplica ecualizadores o filtros si procede, y transcodifica a Opus a 48 kHz / 2 canales, transmitiéndolo por UDP hacia los Voice Servers de Discord.

---

## 2. Matriz Comparativa de Proveedores Investigados

| Proveedor | Tipo de Acceso | Método en Lavalink v4 | Estabilidad en VPS | Clasificación en Hoshiko |
| :--- | :--- | :--- | :--- | :--- |
| **YouTube / YT Music** | Búsqueda + Audio Directo | Plugin `youtube-source` (`lava-xm`) | ⚠️ Variable (Bloqueos IP/429) | **Fuente Primaria (con PO-Token)** |
| **SoundCloud** | Búsqueda + Audio Directo | Fuente Nativa Lavaplayer | 🟢 Muy Alta (Raras veces bloqueado) | **Fuente de Fallback Primaria** |
| **Spotify** | Solo Metadatos (Sin Audio) | Plugin `lavasrc` (API Oficial) | ✅ Alta (Vía Client Credentials) | **Soporte de Búsqueda / Links** |
| **Apple Music** | Solo Metadatos (Sin Audio) | Plugin `lavasrc` | ✅ Alta | *En evaluación para fases futuras* |
| **Bandcamp** | Búsqueda + Audio Directo | Fuente Nativa Lavaplayer | 🟢 Alta (Pistas independientes) | *Habilitado de forma nativa* |
| **Radio HTTP / Icecast**| Solo Streaming Directo | Fuente Nativa Lavaplayer | 🟢 Muy Alta (URLs directas MP3/AAC) | *Habilitado de forma nativa* |

---

## 3. Patrón Metadata Bridge para Spotify

Spotify protege sus archivos de audio mediante tecnologías de gestión de derechos digitales (**Widevine DRM**) y prohíbe explícitamente en sus términos de desarrollador la extracción o retransmisión de sus flujos.

Para permitir que los usuarios compartan enlaces de canciones o listas de Spotify (`https://open.spotify.com/...`), Hoshiko implementa el patrón **Metadata Bridge** mediante el plugin `lavasrc`:

```text
Usuario ingresa URL de Spotify
              │
              ▼
Lavalink v4 invoca plugin 'lavasrc'
              │
              ▼
Consulta Spotify Web API (Client Credentials estándar)
              │
              ▼
Extrae metadatos normalizados:
  • Título: "Fly Me to the Moon"
  • Artista: "Frank Sinatra"
  • ISRC: "USWB19901416"
              │
              ▼
Cascada de Resolución de Audio:
  1. Intento 1: Buscar en YouTube Music por código ISRC exacto (ytsearch:"USWB19901416")
  2. Intento 2: Buscar en YouTube Music por "Fly Me to the Moon Frank Sinatra"
  3. Intento 3 (Fallback): Buscar en SoundCloud por "Fly Me to the Moon Frank Sinatra"
              │
              ▼
Pista de audio reproducible enlazada a la sesión
```

### Configuración de `lavasrc` en `application.yml` de Lavalink:
```yaml
plugins:
  lavasrc:
    providers:
      - 'ytsearch:"%ISRC%"'
      - 'ytsearch:%QUERY%'
      - 'scsearch:%QUERY%'
    sources:
      spotify: true
      applemusic: false
      deezer: false
    spotify:
      clientId: "${SPOTIFY_CLIENT_ID}"
      clientSecret: "${SPOTIFY_CLIENT_SECRET}"
      countryCode: "ES"
```

---

## 4. Retos Técnicos con YouTube y Mitigaciones Anti-Bot

YouTube implementa mecanismos de detección de tráfico no interactivo orientados a prevenir la extracción automatizada desde centros de datos (como la red de CubePath).

### Síntomas Identificados en la Investigación:
- Respuestas HTTP `429 Too Many Requests`.
- Errores de validación: `Sign in to confirm you're not a bot`.
- Petición de cookies de sesión o tokens de integridad de JavaScript.

### Estrategia de Mitigación Diseñada:

1. **Proof of Origin Tokens (PO-Tokens):**
   - El plugin `youtube-source` para Lavalink v4 soporta la inyección de `poToken` y `visitorData`.
   - Estos tokens demuestran que la petición proviene de un cliente validado previamente.
   - En la Fase 1 se configurarán tokens generados manualmente; para fases de mayor escala se evaluará un generador automatizado local (`youtube-trusted-session-generator`).

2. **Degradación Elegante a SoundCloud:**
   - Si YouTube rechaza una petición o expira su token durante la resolución, el `TrackResolver` de Hoshiko reintenta la búsqueda en SoundCloud (`scsearch:query`) de forma totalmente transparente.
   - Si se requirió fallback, el bot puede añadir un pequeño indicador visual en el pie del embed (ej. `Fuente alternativa: SoundCloud`).

3. **Rate Limiting y Caché de Búsquedas en HannaeX:**
   - **Límite por Usuario:** Máximo 5 consultas de búsqueda por minuto por usuario para evitar que un miembro sature las cuotas de IP del VPS.
   - **Caché Local de Búsquedas:** Almacenamiento en memoria mediante [`LocalCacheService`](file:///home/hanna/HannaeX/src/App/infrastructure/cache/LocalCacheService.ts) durante 15 minutos para consultas idénticas. Si dos usuarios piden la misma canción en servidores distintos, la segunda petición no consume recursos externos ni dispara peticiones a YouTube.

---

## 5. Clasificación de Proveedores por Estado del Proyecto

- **Investigación Realizada y Validada:**
  - Viabilidad de `lavasrc` con credenciales de Spotify Web API.
  - Funcionamiento de streaming directo de SoundCloud y HTTP Streams en Lavaplayer.
  - Mitigación de bloqueos de YouTube mediante PO-Tokens.
- **Decisiones Aprobadas para el MVP:**
  - Soporte de URLs y búsquedas de YouTube, SoundCloud y Spotify (vía Metadata Bridge).
  - Fallback automático hacia SoundCloud ante errores 429 de YouTube.
- **Alternativas en Evaluación (Post-MVP):**
  - Soporte de Apple Music y Deezer en `lavasrc` (requiere altas de cuentas de desarrollador adicionales).
  - Rotación de sesiones de YouTube mediante generador local de PO-Tokens.
