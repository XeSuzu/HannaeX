# Hoshiko Music: Hoja de Ruta, Fases de Desarrollo y Próximos Pasos

## 1. Visión General de Fases

El desarrollo de **Hoshiko Music** se divide en tres fases secuenciales para minimizar riesgos operativos, garantizar la estabilidad del VPS y cumplir con el principio de entrega continua controlada:

```text
┌─────────────────────────────────┐
│     FASE 1: MVP Local           │  ◄── Alcance Inmediato (Pendiente de Autorización)
│  • Nodo Lavalink v4 Local       │
│  • Cliente Shoukaku en Node.js  │
│  • Comandos Esenciales          │
│  • Colas RAM + Session Resuming │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  FASE 2: Estabilización VPS     │  ◄── Crecimiento y Robustez Operativa
│  • Backups Externos de MongoDB  │
│  • Circuit Breaker en Mongo     │
│  • Generador Local PO-Tokens    │
│  • Evaluación VPS Dedicado      │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   FASE 3: Alta Escala y UI      │  ◄── Experiencia Avanzada y Expansión
│  • Playlists en MongoDB         │
│  • Tarjetas Canvas en Workers   │
│  • Filtros DSP de Audio         │
│  • Pool Multi-Nodo Balanceado   │
└─────────────────────────────────┘
```

---

## 2. Detalle de Fases de Desarrollo

### Fase 1: MVP Local (Alcance Inmediato)
**Objetivo:** Disponer de un reproductor musical completamente funcional y estable para hasta 10 streams simultáneos sin costes adicionales de infraestructura.

#### Prerrequisitos en Servidor (Fuera de Node.js):
- [ ] Instalar runtime OpenJDK 21 headless en Ubuntu 24.04: `sudo apt install openjdk-21-jre-headless`.
- [ ] Crear directorio `/home/hanna/lavalink` y descargar `Lavalink.jar` (v4.0.8+).
- [ ] Configurar `application.yml` con plugins `youtube-source` y `lavasrc`, limitando el bind a `127.0.0.1`.
- [ ] Crear y habilitar el servicio systemd `/etc/systemd/system/lavalink.service` con límites JVM (`-Xms256M -Xmx1024M`).

#### Desarrollo en HannaeX (`src/`):
- [ ] Instalar dependencia oficial `shoukaku` vía `npm install shoukaku`.
- [ ] Crear variables en `src/App/config/envSchema.ts` (`LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD`).
- [ ] Implementar la capa de dominio en `src/Features/music/`:
  - `MusicManager.ts`: Coordinador del dominio y validaciones.
  - `PlayerManager.ts`: Mapa de reproductores por servidor y auto-desconexión tras 5 minutos de inactividad.
  - `QueueManager.ts`: Gestión de cola FIFO en memoria RAM, modos de repetición y reordenamiento.
  - `TrackResolver.ts`: Integración con `shoukaku.search()` y fallback automático YouTube -> SoundCloud.
  - `LavalinkClient.ts`: Inicialización de Shoukaku y reconexión resiliente.
- [ ] Implementar Comandos Slash en `src/Commands/SlashCmds/Music/`:
  - `/play <query/url>`: Carga de pistas, listas de reproducción o búsquedas de texto.
  - `/pause` y `/resume`: Control de reproducción.
  - `/skip [amount]`: Saltar pista actual o múltiples pistas.
  - `/stop`: Detener reproducción, vaciar cola y desconectar.
  - `/queue [page]`: Visualizar lista de pistas encoladas con paginación limpia.
  - `/nowplaying`: Embed informativo con barra de progreso y metadatos de la pista actual.
  - `/volume <1-100>`: Ajuste de volumen con escala segura.

---

### Fase 2: Estabilización Operativa y Mitigación de Infraestructura
**Objetivo:** Proteger el VPS frente a pérdidas de datos catastróficas y blindar la conectividad con YouTube.

- [ ] **Mitigación SPOF de MongoDB Local:**
  - Configurar script nocturno que ejecute `mongodump`, comprima con cifrado GPG y sincronice el respaldo hacia un bucket S3 o Cloud Storage externo independiente de CubePath.
- [ ] **Circuit Breaker en Mongoose:**
  - Reducir `serverSelectionTimeoutMS` en `src/Services/mongo.ts` y añadir listeners `mongoose.connection.on('disconnected')` para degradar de inmediato comandos dependientes de BD sin superar la ventana de 3 segundos de Discord.
- [ ] **Automatización de PO-Tokens para YouTube:**
  - Evaluar el despliegue local de un contenedor ligero con navegador headless para renovar automáticamente tokens de prueba de origen (`poToken`) ante posibles bloqueos de IP.
- [ ] **Monitoreo de Recursos del VPS:**
  - Evaluar la carga real de CPU y memoria tras el despliegue del MVP. Si la concurrencia supera los 15 streams continuos, iniciar la migración del nodo Lavalink a un VPS dedicado (Fase 2 de escalabilidad).

---

### Fase 3: Funcionalidades Expandidas y Alta Escala
**Objetivo:** Enriquecer la experiencia del usuario con persistencia personalizada, diseño visual avanzado y soporte multi-nodo.

- [ ] **Playlists de Usuarios en MongoDB:**
  - Crear esquema `src/Database/multimedia/playlist.model.ts` para permitir a los usuarios guardar y compartir listas personales (`/playlist save`, `/playlist play`).
- [ ] **Tarjetas Gráficas con Canvas (`@napi-rs/canvas`):**
  - Diseñar tarjeta visual para `/nowplaying` renderizada en Worker Threads para proteger el Event Loop principal (conforme a las convenciones de HannaeX).
- [ ] **Filtros DSP de Audio en Tiempo Real:**
  - Añadir soporte para efectos ecualizados procesados por Lavalink: Nightcore, Vaporwave, 8D Audio y Bassboost.
- [ ] **Pool Multi-Nodo con Balanceo de Carga:**
  - Configurar múltiples nodos Lavalink en diferentes regiones para distribuir el tráfico y ofrecer redundancia geográfica total.

---

## 3. Checklist de Prerrequisitos y Tareas Pendientes antes de la Fase 1

Antes de comenzar a escribir código funcional de música en `src/`, deben cumplirse los siguientes puntos:

1. [x] **Investigación técnica y de compatibilidad completada.**
2. [x] **Evaluación de recursos y memoria en el VPS completada.**
3. [x] **Documentación de arquitectura, decisiones y riesgos aprobada en el repositorio.**
4. [ ] **Autorización explícita del usuario para iniciar la implementación de la Fase 1.**
5. [ ] **Verificación de Java 21 y binario de Lavalink en el VPS (paso de despliegue coordinado).**
