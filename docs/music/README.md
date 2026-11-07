# Hoshiko Music: Documentación de Investigación, Arquitectura y Planificación

Bienvenido a la documentación oficial de investigación, planificación y diseño arquitectónico para el subsistema multimedia **Hoshiko Music** en **Hoshiko (HannaeX)**.

Este directorio centraliza el estado consolidado de la investigación técnica, las decisiones arquitectónicas aprobadas, el análisis de fuentes de audio, las restricciones de infraestructura y la hoja de ruta de implementación.

> [!IMPORTANT]
> **Alcance Estricto y Estado del Repositorio:**
> Toda la información contenida en este directorio corresponde a una **fase de investigación y diseño aprobada para futura implementación**.
> En el código actual de HannaeX (`src/`), **no se ha modificado ningún archivo funcional, no se han instalado dependencias de audio ni se han desplegado servicios**. El único componente multimedia existente en el código es [`src/Services/Lyrics/lyricsFormatter.ts`](file:///home/hanna/HannaeX/src/Services/Lyrics/lyricsFormatter.ts), que consulta metadatos de letras en APIs públicas de texto.

---

## 1. ¿Qué es Hoshiko Music?

**Hoshiko Music** es el módulo multimedia planificado para Hoshiko, orientado a proporcionar reproducción de audio de alta fidelidad en canales de voz de Discord. Su propósito es ofrecer una experiencia musical comunitaria fluida, resiliente y de baja latencia, integrándose de forma armónica con la personalidad y comandos de Hoshiko sin degradar el rendimiento del bot.

---

## 2. Objetivos y Alcance Inicial

### Objetivos Clave:
1. **Protección del Event Loop de Node.js:** Desacoplar por completo la decodificación de audio y la transmisión UDP hacia un proceso independiente, garantizando que el bot mantenga tiempos de respuesta inmediatos (< 200 ms) en comandos slash e interacciones de usuario.
2. **Resiliencia ante Reinicios:** Mantener la música activa o reanudarla sin interrupciones perceptibles durante despliegues y reinicios de PM2 mediante *Session Resuming*.
3. **Eficiencia en Recursos:** Operar de manera cohabitada dentro del VPS actual sin incurrir en costes de infraestructura adicionales para la fase inicial.

### Alcance del MVP (Fase 1):
- Capacidad para **aproximadamente 10 reproducciones simultáneas** en servidores distintos.
- Soporte de búsqueda y enlaces para **YouTube, SoundCloud y Spotify** (este último mediante metadatos).
- Conjunto de comandos Slash esenciales: `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying` y `/volume`.
- Gestión de colas FIFO en memoria RAM por servidor con opciones de repetición (`loop: off | track | queue`).
- Auto-desconexión tras 5 minutos de inactividad o canal de voz vacío.

---

## 3. Estado Actual de la Investigación

La investigación técnica previa ha concluido los siguientes hitos de análisis:

| Área Investigada | Estado | Conclusión Técnica Principal |
| :--- | :--- | :--- |
| **Motor de Audio** | ✅ Completada | Lavalink v4.x (Java 21) seleccionado por su arquitectura desacoplada y plugins nativos. |
| **Cliente Node.js** | ✅ Completada | `shoukaku` seleccionado por su enfoque minimalista y estricto apego al principio `ponytail`. |
| **Fuentes Musicales** | ✅ Completada | Patrón *Metadata Bridge* diseñado para Spotify; YouTube con PO-Token y SoundCloud como fallback. |
| **Infraestructura VPS** | ✅ Completada | Viabilidad comprobada en VPS CubePath (4 vCPU / 8 GB RAM) con techos estrictos de memoria. |
| **Marco Legal / TOS** | ✅ Completada | Delimitación estricta: invariante de cero grabación de voz y uso informativo de la API de Spotify. |

---

## 4. Arquitectura Bajo Evaluación

El diseño arquitectónico se fundamenta en la separación de responsabilidades entre la capa de aplicación y el motor de medios:

```text
┌──────────────────────────────────────┐                   ┌──────────────────────────────────────┐
│       Hoshiko Bot (Node.js 20+)      │                   │     Lavalink v4 Server (Java 21)     │
│                                      │                   │                                      │
│  • src/Features/music/MusicManager   │   WS Control      │  • Plugin youtube-source             │
│  • src/Features/music/QueueManager   │ ◄───────────────► │  • Plugin lavasrc (Spotify metadata) │
│  • src/Features/music/TrackResolver  │   REST API v4     │  • Decodificación Lavaplayer (JNI)   │
│  • src/Features/music/LavalinkClient │                   │  • Transmisión Opus UDP (Discord VC) │
└──────────────────┬───────────────────┘                   └──────────────────┬───────────────────┘
                   │                                                          │
                   │ Discord Gateway (Opcode 4)                               │ Salida RTP Opus (48 kHz)
                   ▼                                                          ▼
         ┌───────────────────┐                                      ┌───────────────────┐
         │  Discord Gateway  │                                      │ Discord Voice Svc │
         └───────────────────┘                                      └───────────────────┘
```

El detalle completo de componentes, secuencia temporal de reproducción y protocolos se encuentra en [ARCHITECTURE.md](./ARCHITECTURE.md) y en los diagramas de [architecture/](./architecture/).

---

## 5. Alternativas Tecnológicas Evaluadas

Durante la investigación se contrastaron diversas alternativas del ecosistema:

1. **Cliente Lavalink para Node.js:**
   - **`shoukaku` (Seleccionada):** Wrapper minimalista y estrictamente tipado. No impone gestores de colas internos, permitiendo a HannaeX mantener su propia lógica sin duplicidad.
   - **`lavalink-client` (Descartada para MVP):** Introduce una capa de abstracción elevada con gestor de colas propio que duplica estados en memoria.
   - **`magmastream` (Descartada):** Dependiente de arquitectura legacy derivada de erela.js.
2. **Motor de Reproducción:**
   - **Lavalink v4 desacoplado (Seleccionada):** Mantiene el audio en un proceso Java independiente, aislando el Event Loop de Node.js.
   - **Librería interna `@discordjs/voice` en Node.js (Descartada):** La transcodificación de audio en el proceso principal de HannaeX saturaría la CPU y bloquearía los comandos slash y el automod.

---

## 6. Fuentes Musicales Investigadas

Se evaluaron las principales fuentes de contenido y sus particularidades técnicas:

- **YouTube / YouTube Music:** Fuente primaria de audio mediante el plugin `youtube-source`. Requiere mitigación de bloqueos de IP mediante *PO-Tokens* (Proof of Origin) y cookies de sesión.
- **Spotify:** No emite audio directo debido a su cifrado con DRM Widevine. Se implementa el patrón **Metadata Bridge** mediante el plugin `lavasrc`: consulta la API oficial de Spotify para extraer ISRC, artista y título, resolviendo el audio en YouTube Music o SoundCloud.
- **SoundCloud:** Fuente abierta de audio nativa en Lavaplayer, con altísima estabilidad en VPS. Se establece como el proveedor de respaldo prioritario ante caídas o límites 429 de YouTube.
- **Bandcamp y Radio HTTP:** Fuentes nativas sin restricciones DRM, habilitadas de forma directa.

El análisis exhaustivo de proveedores y mitigaciones anti-bot se detalla en [PROVIDERS.md](./PROVIDERS.md).

---

## 7. Estado de Infraestructura y Coexistencia

El subsistema se desplegará dentro del VPS actual de CubePath (Ubuntu 24.04 LTS, 4 vCPUs, 8 GB RAM):

- **Topología Local:** Hoshiko Bot (supervisado por PM2) se comunica con Lavalink v4 (servicio systemd) a través de la interfaz de loopback privada (`127.0.0.1:2333`).
- **Seguridad Perimetral:** El puerto 2333 está estrictamente cerrado en el cortafuegos UFW y nunca se expone a Internet.
- **Presupuesto de Memoria RAM:**
  - MongoDB 7 Local: `1.5 GB` (WiredTiger Cache).
  - Lavalink JVM (Java 21): `1.0 GB` (`-Xms256M -Xmx1024M`).
  - Hoshiko Bot: `1.0 GB` (`max_memory_restart` en PM2).
  - Kernel y Buffers de SO: `1.5 GB`.
  - **Margen de seguridad libre:** `> 2.5 GB`.

El informe completo de infraestructura y prevención de fallos se detalla en [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).

---

## 8. Estado Legal y Contractual

La investigación estableció un marco estricto de cumplimiento normativo y mitigación de riesgos:

1. **Discord Developer Policy (Privacidad Absoluta):** Hoshiko mantiene el invariante inmutable de **cero grabación de voz**. El bot solo emite audio (outbound); no procesa ni persiste paquetes de audio entrantes de los usuarios.
2. **Términos de Servicio de Spotify:** Cumplimiento estricto de las restricciones DRM. La integración con Spotify se limita exclusivamente a consultas informativas a través de su Web API oficial.
3. **Términos de Servicio de YouTube y Riesgos de Scraping:** La extracción de flujos multimedia no cuenta con autorización expresa de YouTube y opera en un contexto de riesgo técnico sujeto a medidas anti-bot de la plataforma. El bot no monetiza la reproducción musical.

El desglose de responsabilidades y análisis de precedentes se encuentra en [LEGAL.md](./LEGAL.md).

---

## 9. Decisiones Confirmadas (Catálogo ADR)

Las decisiones aprobadas se formalizan a través de registros de arquitectura Architecture Decision Records (ADR):

- **[ADR-0001](./decisions/ADR/0001-lavalink-client-selection.md):** Elección de `shoukaku` v4 como cliente oficial de Lavalink en Node.js.
- **[ADR-0002](./decisions/ADR/0002-local-lavalink-node-cohabitation.md):** Coexistencia del nodo Lavalink como servicio local systemd en la misma máquina virtual CubePath.
- **[ADR-0003](./decisions/ADR/0003-audio-source-strategy-and-tos.md):** Patrón Metadata Bridge para Spotify con fallback transparente a SoundCloud.
- **[ADR-0004](./decisions/ADR/0004-queue-state-and-session-resilience.md):** Estado de colas en memoria RAM y resiliencia de reproducción mediante Session Resuming de 60 segundos.

El resumen estructurado de las decisiones y alternativas descartadas se encuentra en [DECISIONS.md](./DECISIONS.md).

---

## 10. Cuestiones Pendientes y Próximas Etapas

Antes de proceder con la implementación en código de la **Fase 1 (MVP)**, deben coordinarse los siguientes puntos:

1. **Instalación de Dependencias del Sistema:** Instalación de OpenJDK 21 headless y configuración del servicio `lavalink.service` en el VPS.
2. **Mitigaciones de Infraestructura Previas:** Configuración de copias de seguridad automáticas de MongoDB fuera de la VM y ajuste de timeouts en `src/Services/mongo.ts`.
3. **Aprobación de Producto:** Autorización formal para instalar la dependencia `shoukaku` y comenzar el desarrollo de `src/Features/music/` y `src/Commands/SlashCmds/Music/`.

La planificación detallada de fases se encuentra en [ROADMAP.md](./ROADMAP.md).

---

## 11. Mapa de Documentación del Subsistema

Para consultar el detalle de cada área, utiliza los siguientes documentos complementarios:

| Documento | Propósito y Contenido Principal |
| :--- | :--- |
| 📖 [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Componentes de `src/Features/music/`, ciclo de vida, protocolo REST/WS y diagramas. |
| 🎵 [**PROVIDERS.md**](./PROVIDERS.md) | YouTube, Spotify, SoundCloud, Metadata Bridge, PO-Tokens y rate limits. |
| 🖥️ [**INFRASTRUCTURE.md**](./INFRASTRUCTURE.md) | Recursos del VPS CubePath, límites de RAM, red loopback, SPOF y backups. |
| ⚖️ [**LEGAL.md**](./LEGAL.md) | Términos de Discord, YouTube y Spotify, política de no grabación y derechos de autor. |
| 📌 [**DECISIONS.md**](./DECISIONS.md) | Registro consolidado de ADRs 0001 a 0004 y matriz de decisiones técnicas. |
| 🗺️ [**ROADMAP.md**](./ROADMAP.md) | Fases 1 (MVP), 2 (Estabilización) y 3 (Escala), tareas pendientes y checklist. |
| 📊 [**architecture/**](./architecture/) | Diagramas técnicos en formato Mermaid (`01` al `08`). |
| 📜 [**decisions/ADR/**](./decisions/ADR/) | Fichas técnicas individuales de los registros de decisión aprobados. |
| 🔬 [**research/**](./research/) | Evaluaciones técnicas preliminares de Lavalink, proveedores y hardware. |
