---
type: infrastructure-plan
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-10-11
updated: 2026-10-11
---

# HannaeX — Infraestructura preparada y plan de adopción

## Propósito

Definir el stack de infraestructura que HannaeX debe tener **instalado, configurado, comprobado y disponible** antes de que las features lo necesiten.

Este documento no ordena migrar de golpe las features actuales a Redis, BullMQ, workers o nuevos servicios. El objetivo es preparar la base para que, cuando llegue una feature como IA asíncrona, recordatorios, economía, roles temporales, renderizado o procesamiento de voz, se conecte a infraestructura existente sin improvisar una instalación en producción.

## Principio operativo

```text
Preparar ahora
        ↓
Validar conexión y seguridad
        ↓
Monitorear disponibilidad
        ↓
Mantener inactivo si ninguna feature depende aún
        ↓
Adoptar por feature, una por una
```

Ejemplo:

```text
Redis y BullMQ preparados
        ↓
No cambian XP, IA ni recordatorios actuales
        ↓
Se crea una feature de recordatorios
        ↓
La feature registra su cola y worker
        ↓
No se rediseña infraestructura en ese momento
```

## Decisiones recomendadas

| Área | Opción inicial recomendada | Alternativa al escalar | Motivo |
|---|---|---|---|
| Base de datos | MongoDB + Mongoose | MongoDB Atlas si se necesita operación gestionada | Ya existe y encaja con los modelos actuales |
| Process manager | PM2 | Docker Compose / orquestador cuando haya varios procesos | El repo ya contiene `ecosystem.config.js` |
| Caché y estado compartido | Redis local protegido en la VM | Redis Cloud o Upstash | Coste bajo y preparación inmediata; migrable después |
| Colas | BullMQ + ioredis | RabbitMQ/SQS solo ante necesidades específicas | Integración natural con Node.js y Redis |
| Trabajo CPU | Worker Threads / worker existente | Piscina o procesos separados | Render e imágenes no deben bloquear Discord |
| Scheduler | node-cron mientras exista una instancia | BullMQ repeatable jobs al usar Redis/colas | Ruta simple y migrable |
| HTTP externo | Undici centralizado | Mantener Axios si ya está centralizado y probado | Timeouts, keep-alive y control uniforme |
| Logs | HoshikoLogger evolucionado | Better Stack, Loki/Grafana, Datadog | No reemplazar lo útil de golpe |
| Errores | Logger + clasificación local | Sentry | Sentry cuando se quiera grouping/releases/alertas |
| Métricas | PerformanceMonitor + logs | Grafana Cloud / Better Stack | Evitar instalar observabilidad compleja sin consumo real |
| Uptime | Health endpoint Express | UptimeRobot / Better Uptime / Healthchecks.io | Monitor externo sencillo |
| Secretos | Variables seguras del host/PM2 | OCI Vault, Doppler u otro secret manager | No bloquear el inicio, pero dejar ruta segura |
| Backups | Backup Mongo automatizado | Atlas backups / R2 / B2 / S3 | Recuperación fuera de la VM |

## Estado conocido del repositorio

Ya hay piezas que deben reutilizarse y revisarse antes de crear reemplazos:

- `src/Services/mongo.ts`.
- `src/Handlers/databaseHandler.ts`.
- `HoshikoLogger`.
- `PerformanceMonitor`.
- `RateLimiter`, `Blacklist` y `Sanitizer`.
- `InteractionLock`.
- `CacheManager`.
- `src/workers/spotifyRenderer.worker.ts`.
- `Dockerfile`.
- `ecosystem.config.js`.
- Endpoint HTTP básico `/healthz`.

La existencia de estas piezas no demuestra que cubran todos los requisitos. El primer trabajo es inventariar qué hace cada una y conectar el nuevo stack alrededor de ellas, no reemplazarlas a ciegas.

---

# 1. Arquitectura objetivo preparada

## 1.1 Diagrama de procesos

```text
                    ┌───────────────────────────┐
                    │          Discord          │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │        hoshiko-bot         │
                    │  Discord.js + Express      │
                    │  Eventos y respuestas      │
                    └──────┬───────────┬────────┘
                           │           │
                  ┌────────▼───┐   ┌───▼─────────────┐
                  │   MongoDB  │   │ Redis preparado │
                  │ fuente real│   │ cache/locks/jobs│
                  └────────────┘   └───┬─────────────┘
                                       │
                               ┌───────▼────────┐n                               │ hoshiko-worker │
                               │ preparado/idle │
                               │ BullMQ workers │
                               └────────────────┘
```

En la etapa preparada:

- `hoshiko-bot` funciona igual que ahora.
- MongoDB sigue siendo la fuente de verdad.
- Redis conecta y se monitorea, pero no es requisito de las features existentes.
- `hoshiko-worker` arranca, valida configuración, queda listo y puede no consumir colas todavía.
- BullMQ está instalado y conectado, pero sin jobs de negocio registrados.

## 1.2 Regla de dependencia

```text
Feature
   ↓
Servicio interno
   ↓
Infraestructura preparada
   ↓
Mongo / Redis / worker / proveedor externo
```

Una feature no debe inicializar su propio cliente Redis, crear su propio `setInterval` crítico, leer secretos directamente ni ejecutar un trabajo de CPU pesado dentro de un listener de Discord.

---

# 2. Base de datos y persistencia

## 2.1 MongoDB + Mongoose

### Decisión

Mantener MongoDB/Mongoose como fuente de verdad de HannaeX.

### Usos

- Configuración de guilds.
- Perfiles y niveles.
- Sesiones de voz.
- AFK.
- Memoria permitida.
- Moderación.
- Economía futura.
- Recordatorios.
- Auditoría.
- Locks persistentes cuando aplique.

### Preparar ahora

- Una sola política de conexión por proceso.
- Timeouts explícitos.
- Eventos de conexión y desconexión.
- Cierre ordenado en shutdown.
- Health check de Mongo.
- Métricas de latencia/errores.
- Índices revisados por modelos críticos.
- Entornos separados.

### Servicios o aplicaciones

| Necesidad | Opción recomendada |
|---|---|
| Mongo administrado | MongoDB Atlas |
| Mongo en infraestructura propia | MongoDB Community en VM/servidor dedicado |
| ODM TypeScript | Mongoose |
| Backups externos | MongoDB Atlas Backups, Cloudflare R2, Backblaze B2 o AWS S3 |
| Migraciones | Scripts TypeScript versionados en el repositorio |

### Consideraciones

- No usar Redis como sustituto de datos persistentes.
- Índices compuestos con `guildId` para datos locales.
- Backups no deben vivir solo en la misma VM.
- Probar restauración, no solo creación de backup.
- Para economía y recompensas, usar operaciones atómicas o diseño compensable.

## 2.2 Repositorios

### Decisión

Crear repositorios de forma gradual, cuando una feature se modifique.

### Repositorios futuros

```text
GuildSettingsRepository
LevelRepository
VoiceSessionRepository
AfkRepository
MemoryRepository
ModerationRepository
EconomyRepository
ReminderRepository
AuditRepository
```

### Regla

Los comandos y events llaman servicios; los servicios llaman repositorios; los repositorios conocen Mongoose.

---

# 3. Redis preparado

## 3.1 Decisión

Instalar Redis **ahora**, pero mantenerlo opcional mientras ninguna feature actual dependa de él.

### Opción inicial recomendada

Redis local en la VM actual, protegido y limitado.

### Alternativas futuras

| Opción | Cuándo elegirla | Ventajas | Consideraciones |
|---|---|---|---|
| Redis local en VM | Una instancia, coste mínimo, misma red | Latencia baja, control total | Punto único de fallo; mantenimiento propio |
| Redis Cloud | Se quiere administración y TLS sencillo | Servicio gestionado, métricas | Coste y dependencia externa |
| Upstash Redis | Uso pequeño, serverless o bajo mantenimiento | Fácil de iniciar | Latencia remota y límites por plan |
| Redis administrado del cloud | Infraestructura madura en un proveedor | Red privada y operación integrada | Coste y complejidad mayores |

### Recomendación para HannaeX

```text
Ahora: Redis local, enlazado solo a localhost o red privada.
Después: Redis Cloud/Upstash cuando existan varias instancias,
workers remotos, alta disponibilidad o necesidad de separar la VM.
```

## 3.2 Qué estará listo para usar

```text
cache compartida
cooldowns distribuidos
rate limits compartidos
locks de corta duración
sesiones temporales
pub/sub
BullMQ
estado de workers
feature flags temporales
```

Nada de esto debe usarse por una feature hasta que se adopte explícitamente.

## 3.3 Configuración segura

- Escuchar en `127.0.0.1` o red privada, no en internet pública.
- Activar autenticación o ACL.
- Usar TLS si Redis está fuera de la VM.
- Definir `maxmemory`.
- Para uso futuro con BullMQ, definir persistencia AOF/RDB apropiada.
- No configurar Redis solamente como caché volátil si tendrá jobs durables.
- Usar namespace por entorno: `hannaex:dev:*`, `hannaex:prod:*`.
- No guardar secretos, prompts completos ni datos privados sin necesidad.

## 3.4 Cliente interno recomendado

### Librerías

```text
ioredis
bullmq
```

### Estructura preparada

```text
src/Infrastructure/Redis/
├── RedisClient.ts
├── RedisHealthService.ts
├── RedisKeys.ts
└── RedisConfig.ts
```

### Contrato mínimo

```ts
interface RedisService {
  isAvailable(): Promise<boolean>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
```

### Estado inicial

El cliente puede iniciar y validar conexión, pero no debe romper el bot si Redis no está disponible mientras ninguna feature dependa de él.

---

# 4. Caché preparada

## 4.1 L1: caché local

### Opción recomendada

- `lru-cache` con TTL y `max` obligatorio.

### Usos apropiados

```text
guild-settings:{guildId}
provider-state:{provider}
leaderboard:{guildId}:{period}
metadata:{source}:{trackId}
```

### No usar para

- Saldos.
- Transacciones.
- Locks distribuidos.
- Sesiones críticas.
- Rate limits cuando haya más de una instancia.

### Reglas

- Toda entrada tiene TTL.
- Toda caché tiene tamaño máximo/LRU.
- Los settings se invalidan al actualizarse.
- Medir hits, misses, evictions y tamaño.
- La caída de caché debe caer de vuelta a Mongo de forma segura.

## 4.2 L2: Redis

Redis se usará como L2 cuando una feature necesite estado compartido. La feature debe definir la clave, TTL, fuente de verdad, estrategia de invalidación y comportamiento si Redis falla.

### Claves recomendadas

```text
hannaex:{env}:guild-settings:{guildId}
hannaex:{env}:rate-limit:{guildId}:{userId}:{feature}
hannaex:{env}:lock:{operation}:{resourceId}
hannaex:{env}:queue-status:{worker}
hannaex:{env}:leaderboard:{guildId}:{period}
```

Nunca usar solo `userId` para un dato local al guild.

---

# 5. BullMQ y colas preparadas

## 5.1 Decisión

Instalar BullMQ + ioredis y crear la base de queue/worker ahora, pero **no migrar ninguna tarea existente** hasta elegirla como cambio independiente.

## 5.2 Para qué quedará disponible

- IA lenta o resumida.
- Render de imágenes/cards.
- Recordatorios.
- Roles temporales.
- Reintentos de notificaciones.
- Limpieza y mantenimiento.
- Procesamiento de voz por lotes.
- Embeddings o indexación futura.

## 5.3 Opción recomendada

- **BullMQ + Redis + ioredis**.

### Por qué

- Ecosistema Node.js/TypeScript maduro.
- Jobs persistentes en Redis.
- Reintentos y backoff.
- Repetición programada.
- Concurrencia controlable.
- Workers separados.
- Dashboard posible con Bull Board.

## 5.4 Estructura preparada

```text
src/Infrastructure/Queue/
├── QueueService.ts
├── QueueRegistry.ts
├── QueueTypes.ts
├── WorkerBootstrap.ts
├── JobContext.ts
└── processors/
    └── .gitkeep
```

## 5.5 Contrato mínimo

```ts
interface QueueJob<T> {
  name: string;
  payload: T;
  correlationId?: string;
  idempotencyKey?: string;
  version: number;
}

interface QueueService {
  isAvailable(): Promise<boolean>;
  enqueue<T>(queueName: string, job: QueueJob<T>): Promise<void>;
}
```

## 5.6 Estado inicial preparado

```text
Redis conectado
BullMQ instalado
Worker inicia
Queues de negocio: 0
Jobs procesados: 0
```

## 5.7 Reglas para una adopción futura

Cuando una feature use una cola, debe definir:

- Nombre de cola.
- Versión de payload.
- `jobId` o idempotency key.
- Timeout.
- Concurrencia.
- Reintentos.
- Backoff.
- Dead-letter o manejo de fallo final.
- Métricas.
- Qué ocurre si Redis está caído.

---

# 6. Workers y CPU preparados

## 6.1 Worker de cola

### Decisión

Crear un proceso `hoshiko-worker` preparado, separado de `hoshiko-bot`.

### Estado inicial

- Conecta a configuración, Mongo y Redis.
- Reporta health/ready.
- No consume jobs de negocio hasta que una feature registre un processor.

### Proceso futuro

```text
Feature
   ↓ enqueue
BullMQ / Redis
   ↓
hoshiko-worker
   ↓
Mongo / Discord / proveedor
```

## 6.2 Worker threads

### Opción recomendada

- Mantener `worker_threads` para tareas CPU-bound.
- Evaluar **Piscina** si se necesita un pool de workers con cola local.

### Usos

- Render de cards.
- Imágenes.
- Procesamiento de archivos.
- Cálculos pesados.

### No usar para

- Esperar HTTP/IA; eso es I/O y encaja mejor con cola/worker de proceso.
- Lógica rápida de comandos.

## 6.3 Límites de concurrencia

### Librerías recomendadas

- `p-limit` para límite de promesas sencillo.
- `Bottleneck` para límites avanzados y rate limits por clave.
- BullMQ para concurrencia duradera por queue/worker.

### Límites iniciales a preparar

| Recurso | Límite inicial | Motivo |
|---|---:|---|
| Render CPU | 1–2 por proceso | Proteger RAM/CPU |
| IA | Bajo y configurable | Coste, cuota y latencia |
| Consultas pesadas | Bajo | Proteger Mongo |
| Limpieza | Bajo | No competir con comandos |
| Economía por cuenta | 1 por cuenta | Consistencia |
| Mensajes Discord por destino | Limitado | Evitar saturación/rate limits |

Los valores se calibran con métricas de la VM.

---

# 7. Rails de recursos

## 7.1 RAM y heap

### Herramientas recomendadas

- `process.memoryUsage()`.
- `v8.getHeapStatistics()`.
- `PerformanceMonitor` existente.
- PM2 con `max_memory_restart` como último recurso.
- Grafana Cloud, Better Stack o Prometheus/Grafana cuando se necesite dashboard.

### Medir

```text
rss
heapUsed
heapTotal
external
arrayBuffers
uptime
cache entries
active voice sessions
cooldowns/jobs en memoria
worker count
```

### Umbrales

| Estado | Uso del límite real del proceso | Acción |
|---|---:|---|
| Normal | < 65% | Operación normal |
| Warning | 65–80% | Registrar y limpiar caché expirado | 
| Critical | 80–90% | Reducir concurrencia, pausar trabajo no urgente |
| Emergency | > 90% | Degradar trabajo costoso, alertar, reinicio controlado si es necesario |

### Reglas

- Medir contra el límite del proceso/contenedor.
- No crear caches ilimitadas.
- No usar GC manual como solución habitual.
- Un reinicio debe generar alerta e investigación si se repite.

## 7.2 Event loop

### Herramienta recomendada

- `perf_hooks.monitorEventLoopDelay()`.

### Alertar si

- Interacciones se defieren tarde.
- Timers se atrasan de forma sostenida.
- Aumentan errores de interacción expirada.
- Un render o consulta frena comandos no relacionados.

## 7.3 CPU

### Medir

- CPU del proceso bot.
- CPU del worker.
- Duración de handlers.
- Duración de jobs.
- Concurrencia actual.

### Respuesta

- Reducir concurrencia.
- Mover trabajo a queue/worker.
- Rechazar temporalmente trabajo no esencial.
- Nunca bloquear el event loop con loops grandes o render en línea.

## 7.4 Conexiones

### Recursos que vigilar

- Mongo/Mongoose.
- Redis.
- HTTP keep-alive.
- Discord REST.
- Webhooks.

### Reglas

- Timeout explícito.
- Reintentos limitados.
- Cierre ordenado.
- Métricas de error/latencia.
- No crear cliente HTTP nuevo por solicitud.

---

# 8. Scheduler y tareas programadas

## Opción inicial

- Mantener `node-cron` o cron actual si solo hay una instancia.

## Migración futura

- BullMQ repeatable jobs cuando Redis/BullMQ ya sea dependencia de tareas críticas.

## Tareas candidatas

- Roles temporales.
- Recordatorios.
- Limpieza de caches.
- Cierre/revisión de sesiones de voz.
- Expiración de memoria.
- Agregados semanales.
- Mantenimiento.

## Reglas

- Todo job programado es idempotente.
- Registrar inicio, resultado, duración y error.
- No duplicar scheduler en varias instancias.
- Usar lock distribuido si se escala.
- Si una tarea no puede perderse tras reinicio, migrarla a cola durable.

---

# 9. Integraciones externas preparadas

## 9.1 Cliente HTTP

### Opción recomendada

- **undici** como cliente HTTP común para nuevos servicios.
- Mantener Axios solo si ya se usa de forma centralizada; no mezclar múltiples clientes sin razón.

### Debe incluir

- Timeout de conexión y respuesta.
- `AbortSignal`.
- Keep-alive.
- Tamaño máximo de respuesta.
- Reintentos solo temporales.
- Clasificación de errores.
- Redacción de headers/secretos en logs.
- Validación anti-SSRF para URLs de usuario.

## 9.2 Gemini / IA

### Opción recomendada

- Mantener Gemini detrás de un adapter interno.

### Preparar

- Timeout.
- Límite de concurrencia.
- Rate limit por usuario/guild.
- Medición de tokens/coste si está disponible.
- Circuit breaker.
- Validación de salida.
- Privacidad antes de construir payload.
- Fallback solo si es compatible con la política de datos.

## 9.3 Discord

### Opción

- discord.js, ya presente.

### Preparar

- Defer temprano para trabajo lento.
- Clasificación de errores REST.
- Permisos y jerarquía.
- Idempotencia de interacciones.
- Control de respuestas duplicadas.
- Estado de gateway para readiness.

## 9.4 Webhooks

### Opciones

- `WebhookClient` de discord.js para Discord.
- Express actual, Hono o Fastify para endpoints futuros.

### Preparar

- Validación de firma y timestamp cuando el proveedor lo permita.
- Protección replay/idempotencia.
- Respuesta rápida.
- Encolar trabajo lento.
- Secretos fuera de logs.

---

# 10. Seguridad preparada

## 10.1 Rate limits

### Opciones

| Etapa | Opción |
|---|---|
| Una instancia | `Bottleneck`, `p-limit` o servicio local con TTL |
| Varias instancias | `rate-limiter-flexible` + Redis |

### Clave recomendada

```text
{guildId}:{userId}:{feature}
```

Cuando la operación es global, documentar por qué no incluye guild.

## 10.2 Locks e idempotencia

### Opciones

- MongoDB + índice único para operaciones persistentes.
- Redis para locks cortos distribuidos.
- `InteractionLock` existente para interacciones Discord.

### Reglas

- Un lock no equivale a un registro de operación completada.
- Definir TTL.
- Diseñar reintentos sin duplicar efectos.
- Usar keys específicas: `reward:{guild}:{user}:{event}`.

## 10.3 Validación

### Opción recomendada

- **Zod** para schemas de entorno, inputs, jobs y payloads complejos.
- Mantener sanitizer para contenido donde aplique.

### Validar

- Tipo.
- Longitud.
- Rango.
- Formato.
- IDs pertenecientes al guild.
- URLs permitidas.
- Payload de queue/webhook.
- Resultado de proveedor.

## 10.4 Auditoría

### Opción recomendada

Modelo MongoDB + logger estructurado.

### Usar para

- Moderación.
- Economía.
- Configuración.
- Eliminación de datos.
- Administración.
- Acciones de seguridad.

---

# 11. Observabilidad, salud y alertas

## 11.1 Logs

### Opción inicial

Evolucionar `HoshikoLogger` en lugar de sustituirlo.

### Opciones cuando se centralicen

- Better Stack.
- Grafana Loki + Grafana.
- Datadog.
- Logs del proveedor cloud.

### Reglas

- Logs estructurados.
- `correlationId` por interacción y job.
- Redacción de tokens, claves, URLs firmadas y datos privados.
- Retención/coste definidos.

## 11.2 Error tracking

### Opción recomendada

- **Sentry** cuando se quiera agrupar excepciones y asociarlas a release/commit.

### Reglas

- Redactar PII antes de enviar.
- No enviar cuerpos completos de mensajes privados.
- Adjuntar versión y entorno.

## 11.3 Métricas

### Ruta recomendada

```text
Ahora: PerformanceMonitor + logs de métricas
Después: Grafana Cloud o Better Stack
Más adelante: Prometheus + Grafana si se administra stack propio
```

### No usar como labels de métrica

- `userId`.
- `messageId`.
- Texto de comando libre.

Eso crea cardinalidad excesiva. Usar logs/auditoría para detalle individual.

## 11.4 Health checks

### Endpoints recomendados

```text
GET /healthz/live
→ Node/proceso está vivo

GET /healthz/ready
→ configuración válida + Mongo listo + Discord listo
→ Redis se reporta como opcional hasta que una feature dependa de él

GET /healthz/details
→ restringido: heap, uptime, Mongo, Redis, worker, queues, event loop
```

### Monitor externo recomendado

- UptimeRobot.
- Better Uptime.
- Healthchecks.io.
- Monitor nativo del proveedor cloud.

## 11.5 Alertas

### Opciones

- Better Stack.
- Grafana Alerting.
- Sentry.
- Discord webhook privado como canal complementario, nunca único.

### Alertar por

- Proceso caído.
- Mongo no disponible.
- RAM crítica.
- Reinicios repetidos.
- Redis caído cuando sea dependencia real.
- Worker caído cuando procese jobs.
- Cola vieja o dead-letter creciente.
- Proveedor con fallos repetidos.
- Rate limit anómalo.

---

# 12. PM2, Docker y secretos

## 12.1 PM2

### Decisión

Mantener PM2 para la VM actual.

### Procesos preparados

```text
hoshiko-bot
hoshiko-worker
```

### Estado inicial

- `hoshiko-bot`: procesa Discord y HTTP.
- `hoshiko-worker`: arranca, valida dependencias y queda idle hasta registrar queues.

### Configurar

- Inicio al boot.
- Logs rotados.
- Entorno por proceso.
- `max_memory_restart` como protección final.
- Shutdown ordenado.
- No duplicar scheduler sin lock.

## 12.2 Docker

### Decisión

Mantener Dockerfile y preparar Docker Compose para desarrollo/VM si conviene.

### Servicios futuros de Compose

```text
bot
worker
redis
mongo (solo desarrollo, si producción usa Mongo externo)
```

### Reglas

- Límites de CPU/RAM.
- Secretos por environment/secret manager, no dentro de imagen.
- Health checks.
- Logs a stdout.

## 12.3 Secretos

### Opciones

| Etapa | Opción |
|---|---|
| Inicio | Variables de entorno protegidas por host/PM2 |
| Oracle Cloud | OCI Vault |
| Multi-entorno/equipo | Doppler, 1Password Secrets Automation o secret manager del cloud |

### Reglas

- Separar dev/test/prod.
- Rotar secretos.
- Mínimo privilegio.
- No versionar `.env`.
- No incluir secretos en logs, Sentry ni archivos generados.

---

# 13. Plan de implementación sin adopción forzada

## Fase A — Instalar y verificar

Objetivo: componentes disponibles, sin alterar features.

1. Instalar y asegurar Redis local o contratar Redis administrado.
2. Instalar `ioredis` y `bullmq`.
3. Crear `RedisClient` opcional y health check.
4. Crear estructura de QueueService y WorkerBootstrap sin processors de negocio.
5. Añadir `hoshiko-worker` a PM2.
6. Confirmar que bot sigue funcionando si Redis/worker están apagados.
7. Registrar estado de Mongo, Redis, RAM y worker.

Resultado:

```text
Bot actual sin cambios funcionales
Redis disponible
BullMQ disponible
Worker listo e idle
Health/observabilidad inicial
```

## Fase B — Preparar contratos comunes

Objetivo: evitar que la primera feature use infraestructura directamente.

1. `CacheService` local con TTL/LRU.
2. `RedisService` opcional.
3. `QueueService` común.
4. `RateLimitService` unificado.
5. `IdempotencyService` unificado.
6. `HttpClientService` con timeout/retry.
7. `ConfigService` con validación de entorno.

Resultado: nuevas features pueden elegir infraestructura mediante servicios internos.

## Fase C — Primera adopción por feature

Elegir solo una feature de bajo riesgo o alto valor:

| Candidata | Uso de infraestructura | Riesgo |
|---|---|---|
| Render de cards | Worker/cola | Bajo-medio |
| Recordatorios | Mongo + scheduler/cola | Medio |
| Roles temporales | Cola + reintentos | Medio |
| IA resumida | Queue + rate limit + timeout | Medio-alto |
| Caché de settings | L1 cache primero | Bajo |

Recomendación: adoptar primero caché de settings L1 o render de cards, no economía ni XP crítico.

## Fase D — Redis como dependencia real

Solo cuando una feature crítica lo use:

1. Documentar qué pasa si Redis falla.
2. Ajustar readiness si la feature no puede operar sin Redis.
3. Añadir backups/operación de Redis si aloja jobs críticos.
4. Migrar rate limits o locks que necesitan ser distribuidos.
5. Medir costo, latencia y memoria Redis.

## Fase E — Escalado

1. Separar workers reales.
2. Añadir queues con reintentos y dead-letter.
3. Adoptar Redis administrado si la VM deja de ser suficiente.
4. Añadir alertas externas y error tracking.
5. Revisar sharding Discord solo con evidencia de necesidad.

---

# 14. Matriz por feature

| Feature | Servicios mínimos | Servicios preparados que adoptará al escalar |
|---|---|---|
| Configuración de guild | Mongo, repositorio, caché L1 | Redis L2, feature flags, auditoría avanzada |
| XP texto | Mongo, índices, rate limit, idempotencia | Cache leaderboard, agregados, Redis si hay instancias múltiples |
| XP voz | Mongo, sesiones persistentes, checkpoints | Queue, worker, Redis locks, reconciliación |
| Ranking | Mongo, índices, cache TTL | Agregados, Redis L2, jobs de refresco |
| AFK | Mongo, Discord permisos | Caché/expiración programada si se amplía |
| IA | Gemini, HTTP client, timeout, rate limit | Queue, worker, Redis, circuit breaker, métricas de coste |
| Memoria IA | Mongo, privacidad, scope | Cola de indexación, embeddings/vector store |
| Moderación | Mongo, permisos, validación, auditoría | Alertas, jobs, automatizaciones/cola |
| Economía | Mongo, atomicidad, idempotencia, auditoría | Serialización por cuenta, queue, reconciliación |
| Recordatorios | Mongo, scheduler, idempotencia | BullMQ, Redis, worker, retries |
| Multimedia | HTTP, cache, límites | Worker, queue, Redis y métricas |
| Roles temporales | Mongo, scheduler, permisos | Queue durable, worker, locks Redis |

---

# 15. Checklist de preparación

## Redis

- [ ] Redis instalado o cuenta administrada creada
- [ ] Bind privado / TLS según ubicación
- [ ] ACL o contraseña configurada
- [ ] Límite de memoria definido
- [ ] Persistencia definida si BullMQ almacenará jobs
- [ ] Namespace por entorno definido
- [ ] Health check disponible
- [ ] Bot tolera Redis apagado mientras sea opcional

## BullMQ y worker

- [ ] `bullmq` e `ioredis` instalados
- [ ] Cliente Redis compartido correctamente configurado
- [ ] QueueService creado
- [ ] WorkerBootstrap creado
- [ ] Proceso PM2 `hoshiko-worker` declarado
- [ ] Worker inicia sin queues de negocio
- [ ] Logs y health del worker disponibles
- [ ] No existe job real migrado sin decisión explícita

## Recursos

- [ ] Métricas de RAM/heap registradas
- [ ] Umbrales warning/critical/emergency definidos
- [ ] Caché local con TTL y máximo definida
- [ ] Concurrencia de render/IA limitada
- [ ] Event loop delay observable

## Operación

- [ ] `/healthz/live` definido
- [ ] `/healthz/ready` definido
- [ ] Logs redactan secretos
- [ ] Shutdown cierra Discord, HTTP, Mongo, Redis y workers
- [ ] Backups externos configurados o planificados
- [ ] Restauración documentada

---

# 16. Qué no hacer todavía

- No migrar XP, voz, economía ni IA a BullMQ por el solo hecho de instalarlo.
- No hacer Redis requisito de arranque del bot hasta que una feature crítica dependa de él.
- No sustituir MongoDB por Redis.
- No crear microservicios sin una presión real de carga u operación.
- No exponer Redis a internet público.
- No usar caché local ilimitada.
- No ejecutar workers CPU pesados dentro de `messageCreate` o `interactionCreate`.
- No usar `setInterval` como único mecanismo de trabajo que no puede perderse.
- No añadir SaaS de métricas, logs y alertas sin definir costo, retención y dueño operativo.

## Primera inspección técnica

Antes de crear o integrar archivos de infraestructura, revisar uno por uno:

```text
src/Services/mongo.ts
src/Handlers/databaseHandler.ts
src/Database/CacheManager.ts
src/Security/Logger/HoshikoLogger.ts
src/Security/PerformanceMonitor.ts
ecosystem.config.js
Dockerfile
src/scripts/cronJobs.ts
```

La primera decisión de implementación será confirmar la política actual de Mongo y evitar que existan rutas duplicadas de conexión antes de introducir Redis, BullMQ o el worker preparado.
