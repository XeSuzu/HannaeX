---
name: hannaex-workers-infra
description: Guía completa para Redis (RedisClientService, RedisKeys), caché multinivel (LocalCacheService L1 + Redis L2), colas BullMQ/Outbox (src/App/infrastructure/, src/worker.ts) y Worker Threads con @napi-rs/canvas (src/workers/, src/Renderers/).
---

# HannaeX — Redis, Caché, Colas BullMQ y Workers Canvas

## Cuándo usar este skill
- Al implementar caché, rate-limits distribuidos, locks o contadores en Redis (`src/App/infrastructure/redis/`).
- Al usar caché en memoria LRU (`src/App/infrastructure/cache/LocalCacheService.ts`).
- Al encolar o procesar trabajos asíncronos con BullMQ y el patrón Outbox (`src/App/infrastructure/queue/`, `src/worker.ts`).
- Al modificar o crear tarjetas visuales con `@napi-rs/canvas` en `src/Renderers/` o `src/workers/` (`canvasWorker.ts`, `statCardWorker.ts`).

---

## 1. Redis (`src/App/infrastructure/redis/`)

### Cliente y Estado (`RedisClientService`)
- **Acceso seguro**: Usa `RedisClientService.getClient()` o `await RedisClientService.ensureClient()` (`src/App/infrastructure/redis/RedisClient.ts`).
- **Estados posibles (`RedisConnectionState`)**: `"disabled" | "connecting" | "ready" | "degraded" | "closed"`.
- **Degradación elegante obligatoria**:
  - HannaeX está diseñado para **no caerse nunca si Redis falla o está deshabilitado** (`REDIS_ENABLED=false`).
  - Antes de ejecutar comandos en Redis, verifica que `RedisClientService.getState() === "ready"` y envuelve llamadas en `try/catch` con fallback inmediato a memoria (`LocalCacheService` o `Map` local).
  - `enableOfflineQueue: false` está activo por diseño para fallar rápido (`commandTimeout: 3000ms`) y activar el fallback sin colgar interacciones de Discord.

### Convención de Claves (`RedisKeys.ts`)
- Usa siempre `buildRedisKey(scope, key)` de `src/App/infrastructure/redis/RedisKeys.ts`, que genera el prefijo estándar por entorno:
  ```ts
  // Formato: hannaex:<NODE_ENV>:<scope>:<key>
  const key = buildRedisKey("antiraid", guildId);
  ```
- Toda clave temporal en Redis (cooldowns, contadores anti-raid, caché de configuración, sesiones) **debe tener TTL explícito** (`EX` o `PX`).

---

## 2. Caché Multinivel (L1 `LocalCacheService` + L2 Redis)

- **L1 (Memoria del proceso)**: Usa `LocalCacheService<T>` (`src/App/infrastructure/cache/LocalCacheService.ts`), basado en `lru-cache` con `max` y `ttlMs` obligatorios y métricas integradas (`getStats()`).
- **L2 (Redis compartido entre bot y workers)**:
  - Lectura: consulta L1 -> si hay miss, consulta L2 (Redis) -> si hay miss, consulta MongoDB (`src/Database/`) y puebla L2 + L1.
  - Invalidación: al actualizar configuración de servidor (`GuildConfig`, `ServerConfig`, `Trigger`), invalida tanto L1 como la clave `buildRedisKey(...)` en L2.

---

## 3. Colas BullMQ y Outbox (`src/App/infrastructure/queue/` y `src/worker.ts`)

- **Separación de procesos**:
  - `src/index.ts` ejecuta el bot de Discord (baja latencia para eventos e interacciones).
  - `src/worker.ts` levanta `WorkerBootstrap` para procesar trabajos en segundo plano sin bloquear el gateway de Discord.
- **Idempotencia y Reintentos**:
  - Todo job procesado por un worker debe ser **idempotente** (seguro si se ejecuta más de una vez tras un reintento).
  - Para transiciones de estado y backoff exponencial (incluyendo manejo de `RateLimited`), sigue la lógica probada en `Outbox` (`tests/unit/`).

---

## 4. Renderizado con `@napi-rs/canvas` y Worker Threads (`src/workers/`, `src/Renderers/`)

- **No bloquear el Event Loop**:
  - Los renderizados pesados de tarjetas (`canvasWorker.ts`, `statCardWorker.ts`) corren en `worker_threads`.
  - Mantén la resolución dual `.ts` (desarrollo) / `.js` (producción en `dist/`) al instanciar `new Worker(...)`.
- **Assets en Linux (Case-Sensitive)**:
  - Verifica mayúsculas/minúsculas exactas en `src/assets/` (`Images/`, `Fonts/`).
  - Recuerda que `npm run copy:assets` copia `{json,sql,env,txt,md,png,jpg,jpeg,webp,svg,ico}` hacia `dist/`.
