# Hoshiko Music: Registro Consolidado de Decisiones de Arquitectura (ADR)

## 1. Metodología de Decisiones

HannaeX adopta el formato **Architecture Decision Records (ADR)** para documentar de forma trazable las decisiones técnicas estructurales, el contexto en el que se tomaron, las alternativas evaluadas y sus consecuencias operativas.

Todos los registros individuales se encuentran versionados en el directorio [`decisions/ADR/`](./decisions/ADR/).

---

## 2. Catálogo de Decisiones Aprobadas

### [ADR-0001: Selección del Cliente de Lavalink para Node.js](./decisions/ADR/0001-lavalink-client-selection.md)
- **Estado:** Aceptado (Aprobado para implementación).
- **Problema:** Elegir la biblioteca cliente para conectar HannaeX (Discord.js v14) con el nodo Lavalink v4.
- **Alternativas Evaluadas:** `shoukaku`, `lavalink-client`, `magmastream`.
- **Decisión:** Adoptar **`shoukaku`** (v4.x).
- **Justificación:** Cumple con el principio `ponytail` (la solución más limpia y pequeña que resuelve el problema de raíz). Es un wrapper minimalista y estrictamente tipado que delega la gestión de colas a la aplicación sin introducir abstracciones redundantes ni consumir memoria innecesaria en el Event Loop.

---

### [ADR-0002: Coexistencia del Nodo Lavalink en la Misma VM (CubePath)](./decisions/ADR/0002-local-lavalink-node-cohabitation.md)
- **Estado:** Aceptado (Aprobado para implementación).
- **Problema:** Determinar si Lavalink debe desplegarse en un servidor dedicado externo o dentro del VPS actual (4 vCPU / 8 GB RAM).
- **Alternativas Evaluadas:** VPS dedicado para audio vs Coexistencia local en el VPS CubePath.
- **Decisión:** Desplegar Lavalink v4 como **servicio Systemd local** en la interfaz loopback (`127.0.0.1:2333`).
- **Justificación:** Para el objetivo inicial de evaluación (~10 reproducciones simultáneas), el VPS cuenta con recursos suficientes si se fijan techos estrictos de memoria RAM (Lavalink 1 GB, MongoDB 1.5 GB, Bot 1 GB). Evita costes de infraestructura adicionales y reduce la latencia de control a menos de 0.2 ms.

---

### [ADR-0003: Estrategia de Fuentes de Audio y Cumplimiento de TOS](./decisions/ADR/0003-audio-source-strategy-and-tos.md)
- **Estado:** Aceptado (Aprobado para implementación).
- **Problema:** Proporcionar soporte a enlaces populares de Spotify sin violar sus términos de DRM, mitigando a la vez los bloqueos anti-bot de YouTube.
- **Alternativas Evaluadas:** Intentar scraping directo vs Proveedor único vs Patrón Metadata Bridge.
- **Decisión:** Implementar el patrón **Metadata Bridge** con dos niveles disjuntos:
  1. Spotify se utiliza exclusivamente para consultar metadatos (ISRC, título, artista) mediante la API oficial.
  2. El audio efectivo se resuelve en YouTube Music (fuente primaria con PO-Tokens) con fallback transparente a SoundCloud ante errores 429.
- **Justificación:** Máxima compatibilidad para los usuarios, respeto de las restricciones DRM de Spotify y resiliencia ante bloqueos de IP de datacenter.

---

### [ADR-0004: Gestión de Estado de Colas y Resiliencia de Sesiones](./decisions/ADR/0004-queue-state-and-session-resilience.md)
- **Estado:** Aceptado (Aprobado para implementación).
- **Problema:** Definir cómo almacenar el estado de la cola de reproducción y cómo evitar interrupciones de música durante reinicios del bot.
- **Alternativas Evaluadas:** Persistencia de cada canción en MongoDB vs Colas en Redis vs Colas en memoria RAM con Session Resuming.
- **Decisión:** Mantener las colas activas **estrictamente en memoria RAM** (`Map<string, GuildPlayer>`) y habilitar **Session Resuming** en Lavalink (`resuming.timeout: 60`).
- **Justificación:** Cero sobrecarga de escrituras I/O en MongoDB durante la reproducción normal. Si Hoshiko se reinicia mediante PM2 por un despliegue (< 5 segundos), Lavalink mantiene el audio sonando y Shoukaku reanuda la sesión sin corte audible para los usuarios.

---

## 3. Matriz de Decisiones Técnicas vs Propuestas en Evaluación

| Decisión / Tema | Estado Actual | Clasificación | Documento de Referencia |
| :--- | :--- | :--- | :--- |
| **Cliente de audio en Node.js** | Shoukaku v4 seleccionado | ✅ Decisión Aprobada | [ADR-0001](./decisions/ADR/0001-lavalink-client-selection.md) |
| **Ubicación del nodo Lavalink** | Servicio local en `127.0.0.1` | ✅ Decisión Aprobada | [ADR-0002](./decisions/ADR/0002-local-lavalink-node-cohabitation.md) |
| **Resolución de Spotify** | Metadata Bridge (API -> YT/SC) | ✅ Decisión Aprobada | [ADR-0003](./decisions/ADR/0003-audio-source-strategy-and-tos.md) |
| **Almacenamiento de colas** | Memoria RAM + Resuming 60s | ✅ Decisión Aprobada | [ADR-0004](./decisions/ADR/0004-queue-state-and-session-resilience.md) |
| **Playlists persistentes de usuarios** | MongoDB (`PlaylistModel`) | ⏳ Propuesta (Post-MVP) | [ROADMAP.md](./ROADMAP.md) |
| **Generador automático local de PO-Tokens** | Docker local con headless browser | ⏳ En evaluación técnica | [PROVIDERS.md](./PROVIDERS.md) |
| **Filtros DSP avanzados de audio** | Nightcore, Bassboost, 8D | ⏳ Pospuesto a Fase 3 | [ROADMAP.md](./ROADMAP.md) |
| **Tarjetas gráficas de reproducción** | Canvas `@napi-rs/canvas` en Workers| ⏳ Pospuesto a Fase 3 | [ROADMAP.md](./ROADMAP.md) |
| **Desacoplamiento a VPS de audio externo**| Migración si concurrencia > 15 | ⏳ Condicional (Fase 2) | [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) |
