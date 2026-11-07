# Hoshiko Music: Arquitectura Técnica y Diseño del Subsistema

## 1. Visión General del Subsistema

**Hoshiko Music** es el módulo multimedia planificado para **Hoshiko (HannaeX)**, diseñado para proporcionar reproducción de audio en canales de voz de Discord con alta fidelidad, baja latencia y mínimo impacto en el rendimiento del bot.

El principio arquitectónico fundamental del diseño es el **Desacoplamiento Estricto del Procesamiento de Audio**:

```text
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│     Hoshiko Bot (Node.js 20+)    │                 │    Lavalink v4 Server (Java 21) │
│                                 │                 │                                 │
│  • Comandos Slash (/play, etc.) │                 │  • Descarga de Chunks de Audio  │
│  • Permisos y Lógica de Negocio │   WebSocket     │  • Decodificación (MP3/AAC/OGG) │
│  • Gestión de Colas en Memoria  │ ◄─────────────► │  • Procesamiento de Filtros DSP │
│  • Handshake de Voz (Gateway)   │   REST API v4   │  • Empaquetado Opus (48 kHz)    │
└────────────────┬────────────────┘                 └────────────────┬────────────────┘
                 │                                                   │
                 │ Gateway (Opcode 4)                                │ UDP / RTP (Opus)
                 ▼                                                   ▼
       ┌───────────────────┐                               ┌───────────────────┐
       │  Discord Gateway  │                               │ Discord Voice Svc │
       └───────────────────┘                               └───────────────────┘
```

El Event Loop de Node.js es de un solo hilo (single-threaded). Procesar y transcodificar flujos de audio dentro del proceso principal de HannaeX degradaría severamente la capacidad de respuesta de los comandos slash, los filtros de automoderación y el procesamiento de IA conversacional. Por ello, toda la carga intensiva de decodificación y streaming UDP se delega a **Lavalink v4**.

---

## 2. Componentes Internos del Módulo

Dentro de la estructura de HannaeX, la implementación de música se ubicará de forma autocontenida en `src/Features/music/`, coordinada mediante los siguientes módulos de responsabilidad única:

```text
src/Features/music/
├── MusicManager.ts          # Fachada y coordinador central del dominio de música
├── PlayerManager.ts         # Ciclo de vida de los reproductores por servidor (GuildPlayer)
├── QueueManager.ts          # Gestión de cola en memoria RAM (FIFO, Loop, Shuffle)
├── TrackResolver.ts         # Búsqueda, resolución de metadatos y fallbacks entre fuentes
├── LavalinkClient.ts        # Adaptador del cliente Shoukaku y manejo de eventos del nodo
└── VoiceConnectionBridge.ts # Negociación de credenciales de voz con Discord Gateway
```

### Detalle de Responsabilidades:

1. **`MusicManager` (Fachada del Dominio):**
   - Punto de entrada unificado para los comandos slash de `src/Commands/SlashCmds/Music/`.
   - Valida que el usuario solicitante se encuentre en un canal de voz y que el bot cuente con permisos para unirse (`Connect`) y hablar (`Speak`).
   - Aplica controles de permisos de rol de DJ y verificación de estado.

2. **`PlayerManager` (Gestión de Reproductores):**
   - Mantiene el mapa activo de instancias de reproducción: `Map<string, GuildPlayer>`.
   - Inicializa y destruye reproductores asociados a servidores específicos.
   - Gestiona el temporizador de auto-desconexión (inactividad de 5 minutos o canal vacío).

3. **`QueueManager` (Control de Cola en Memoria):**
   - Implementa una estructura FIFO de pistas pendientes (`Track[]`).
   - Maneja los modos de repetición: `OFF`, `TRACK` (repetir actual), `QUEUE` (repetir cola completa).
   - Implementa operaciones de reordenamiento determinista (`shuffle`, `remove`, `move`).
   - **Decisión de persistencia:** El estado de la cola reside estrictamente en memoria RAM, evitando saturar MongoDB con escrituras por cada pista reproducida (ver [ADR-0004](./decisions/ADR/0004-queue-state-and-session-resilience.md)).

4. **`TrackResolver` (Resolución y Fallbacks):**
   - Interpreta la entrada del usuario (término de búsqueda, URL directa, enlace de Spotify, enlace de SoundCloud).
   - Orquesta el patrón **Metadata Bridge**: si se detecta un enlace de Spotify, consulta sus metadatos y resuelve el stream de audio en YouTube Music o SoundCloud.
   - Aplica degradación elegante: si YouTube retorna error 429 (Too Many Requests), conmuta automáticamente a SoundCloud.

5. **`LavalinkClient` (Capa de Transporte):**
   - Wrapper ligero alrededor de la librería `shoukaku`.
   - Gestiona la conexión WebSocket con el nodo local (`127.0.0.1:2333`), emitiendo eventos normalizados hacia el resto del bot (`trackStart`, `trackEnd`, `trackException`, `nodeDisconnect`).

---

## 3. Protocolo de Comunicación Hoshiko ↔ Lavalink v4

La comunicación entre HannaeX y Lavalink v4 se realiza mediante una combinación de **WebSocket** (eventos bidireccionales en tiempo real) y **REST API v4** (comandos imperativos):

### Endpoints REST Clave:
- **`GET /v4/loadtracks?identifier={query}`:** Resuelve pistas o búsquedas. Retorna tipos estandarizados: `track`, `playlist`, `search`, `empty` o `error`.
- **`PATCH /v4/sessions/{sessionId}/players/{guildId}`:** Controla el estado del reproductor:
  - Inyectar credenciales de voz (`voice: { token, endpoint, sessionId }`).
  - Asignar pista a reproducir (`track: { encoded: "..." }`).
  - Control de volumen (`volume: 0..1000`).
  - Pausa y reanudación (`paused: boolean`).
  - Aplicar filtros DSP (`filters: { equalizer, timescale, ... }`).
- **`DELETE /v4/sessions/{sessionId}/players/{guildId}`:** Detiene la reproducción y destruye el reproductor en el nodo.

### Eventos WebSocket:
- **`ready`:** Emitido al conectar. Proporciona el `sessionId` necesario para todas las operaciones REST y confirma si la sesión fue reanudada (`resumed: true/false`).
- **`playerUpdate`:** Emitido periódicamente (cada 5 segundos por defecto) informando la posición actual de reproducción en milisegundos y el estado de la conexión UDP.
- **`event`:** Notificaciones de ciclo de vida del reproductor:
  - `TrackStartEvent`: Inicio de pista.
  - `TrackEndEvent`: Fin de pista (razones: `finished`, `loadFailed`, `stopped`, `replaced`, `cleanup`).
  - `TrackExceptionEvent`: Error durante la decodificación o streaming de la fuente.
  - `TrackStuckEvent`: Detección de congelamiento de audio (buffer agotado).

---

## 4. Secuencia de Reproducción de una Pista

El siguiente flujo describe paso a paso la interacción entre usuario, Discord y los procesos locales ante un comando `/play`:

```text
Usuario               Hoshiko Bot               Discord Gateway            Lavalink v4            Discord Voice
   │                       │                           │                        │                      │
   ├── /play <query> ─────►│                           │                        │                      │
   │                       ├── deferReply() ──────────►│                        │                      │
   │                       │                           │                        │                      │
   │                       ├── GET /v4/loadtracks ─────────────────────────────►│                      │
   │                       │◄── Pista resuelta (Track Loaded) ──────────────────┤                      │
   │                       │                                                    │                      │
   │                       ├── Gateway Opcode 4 (Join VC) ──►│                  │                      │
   │                       │◄── VOICE_STATE_UPDATE ──────────┤                  │                      │
   │                       │◄── VOICE_SERVER_UPDATE ─────────┤                  │                      │
   │                       │                                                    │                      │
   │                       ├── PATCH /v4/sessions/{sid}/players/{gid} ─────────►│                      │
   │                       │   (credenciales de voz + encodedTrack)             │                      │
   │                       │                                                    ├── Handshake UDP ────►│
   │                       │                                                    ├── Streaming Opus ───►│
   │                       │◄── WebSocket: TrackStartEvent ─────────────────────┤                      │
   │◄── Embed Now Playing ─┤                                                    │                      │
```

1. **Aseguramiento de la Ventana de 3 Segundos:** Hoshiko ejecuta inmediatamente `interaction.deferReply()` para evitar el error `InteractionNotReplied` ante búsquedas que requieran resolución HTTP externa.
2. **Validación de Voz y Permisos:** Se verifica que el usuario esté en un canal de voz del servidor y que el bot tenga permisos de conexión y audio.
3. **Carga y Encolado:** Se solicita la resolución a Lavalink. Si el reproductor ya estaba activo, la pista se encola en `QueueManager` y se responde con un mensaje confirmando la posición en cola.
4. **Negociación de Voz:** Si el reproductor no estaba conectado, Hoshiko envía el Opcode 4 a Discord Gateway solicitando unirse al canal de voz. Discord responde con los eventos `VOICE_STATE_UPDATE` (sessionId) y `VOICE_SERVER_UPDATE` (token y endpoint).
5. **Transmisión de Credenciales:** Hoshiko transmite estas credenciales a Lavalink vía REST. Lavalink establece directamente la sesión WebRTC/UDP contra el servidor de voz de Discord y comienza la transmisión de tramas Opus.

---

## 5. Resiliencia, Resuming y Recuperación ante Fallos

La arquitectura incorpora mecanismos formales de tolerancia a fallos:

| Escenario de Fallo | Comportamiento del Sistema | Mecanismo de Recuperación |
| :--- | :--- | :--- |
| **Reinicio de Hoshiko por PM2** | El proceso de Node.js se reinicia en < 5s tras un despliegue o crash. | **Session Resuming:** Lavalink mantiene el audio sonando durante una ventana de gracia de 60 segundos (`resuming.timeout: 60`). Al arrancar, Shoukaku se reconecta con el mismo `sessionId` y reanuda el control sin que los usuarios perciban corte en la música. |
| **Caída de Lavalink** | El servicio Java se detiene inesperadamente. | Systemd reinicia el servicio automáticamente (`Restart=always`, `RestartSec=5`). `shoukaku` ejecuta reintentos con backoff exponencial y reconecta el nodo cuando vuelve a estar disponible. |
| **Desconexión Forzada de Voz** | Un moderador desconecta al bot o el canal es eliminado. | Hoshiko escucha el evento `voiceStateUpdate` del bot. Si el canal es nulo, destruye el reproductor en Lavalink, limpia la cola en memoria y libera recursos. |
| **Fallo en Pista Individual** | La pista seleccionada tiene DRM bloqueado o error 404/429. | Lavalink emite `TrackExceptionEvent`. Hoshiko notifica brevemente el error en el canal de texto y reproduce automáticamente la siguiente canción de la cola. |

---

## 6. Diagramas Arquitectónicos del Sistema

Los diagramas visuales en formato Mermaid se encuentran versionados en [`architecture/`](./architecture/):

- [`01-system-context.mmd`](./architecture/01-system-context.mmd): Contexto del sistema, usuarios, plataformas y límites de red.
- [`02-components.mmd`](./architecture/02-components.mmd): Estructura modular interna de `src/Features/music/`.
- [`03-playback-sequence.mmd`](./architecture/03-playback-sequence.mmd): Diagrama de secuencia temporal completo de reproducción.
- [`04-lavalink-communication.mmd`](./architecture/04-lavalink-communication.mmd): Protocolo detallado de payloads REST y WebSocket.
- [`05-deployment.mmd`](./architecture/05-deployment.mmd): Topología de procesos locales en la máquina virtual CubePath.
- [`06-failover-recovery.mmd`](./architecture/06-failover-recovery.mmd): Árbol de decisiones y flujos ante caídas de componentes.
- [`07-scaling.mmd`](./architecture/07-scaling.mmd): Estrategia de evolución desde 10 streams locales hasta clusters distribuidos.
- [`08-data-security.mmd`](./architecture/08-data-security.mmd): Zonas de confianza, saneamiento de entradas y garantía de no grabación de voz.
