# 04 — Data Retention and Deletion (Internal Technical Policy)

**Título:** Política Técnica de Retención, Expiración TTL y Eliminación de Datos  
**Identificador de Versión:** `HOSHIKO-INT-RET-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `INTERNALLY-APPROVED`  
**Alcance:** `apps/hoshiko` (Bot Principal)  
**Referencias:** `DATA-INVENTORY.md`, `SnipeService.ts`, `cronJobs.ts`, `LocalCacheService.ts`, `CacheManager.ts`  

---

## 1. Mecanismos de Expiración Automática (TTL) Verificados en Código

### 1.1. Cachés en Memoria RAM (`LocalCacheService` / `LRUCache`)
- `guild_settings_l1` (`CacheManager.ts:10-16`): Máx. 1000 entradas, **TTL 5 minutos** (`300000ms`).
- `LevelConfigCache` (`LevelConfigCache.ts:4-7`): Máx. 500 entradas, **TTL 60 segundos** (`60000ms`).
- `ai_processed_msgs` (`aiHandler.ts:22-26`): Máx. 5000 entradas, **TTL 15 segundos** (`15000ms`).
- `ai_user_cooldown` (`aiHandler.ts:27-31`): Máx. 5000 entradas, **TTL 3 segundos** (`3000ms`).
- `automod_ai_verdicts` (`aiJudge.ts:42-45`): Máx. 5000 entradas, **TTL 1 hora** (`3600000ms`).
- `automod_ai_budget` (`aiJudge.ts:48-51`): Máx. 5000 entradas, **TTL 24 horas** (`86400000ms`).
- `snipeCache` (`SnipeService.ts:5, 9, 68-80`): Filtra en tiempo de lectura cualquier entrada cuya antigüedad supere **1 hora** (`3600000ms`).

### 1.2. Caché Distribuida Redis L2 (`RedisClient.ts`, `CacheManager.ts`)
- Clave `hannaex:<NODE_ENV>:guild_cfg:<guildId>`: **TTL 10 minutos** (`EX 600`).
- Redis está deshabilitado por defecto (`REDIS_ENABLED=false`) y si se activa opera como caché transitoria.

### 1.3. Índices TTL en MongoDB
1. **`InteractionLock` (`Database/system/system.models.ts:15-19`):**
   - Campo `createdAt`, `expires: "15s"` (**15 segundos**). Evita procesamiento duplicado de interacciones.
2. **`Snipe` (`Database/moderation/snipe.model.ts:53-56`):**
   - Índice `idx_snipe_ttl` sobre `{ updatedAt: 1 }` con `expireAfterSeconds: 3600` (**1 hora**).
   - *Observación técnica importante:* Como el documento agrupa hasta 100 entradas por `channelId`, si se borran nuevos mensajes en el mismo canal dentro de la hora, el `updatedAt` del documento se actualiza y extiende la vida del documento en MongoDB, aunque `getSnipeEntry` oculta en lectura cualquier mensaje individual con más de 1 hora.
3. **`ActiveVoiceSession` (`Database/leveling/activeVoiceSession.model.ts:25-28`):**
   - Índice sobre `{ start: 1 }` con `expireAfterSeconds: 86400` (**24 horas**). Además, se elimina inmediatamente al salir del canal de voz (`removePersistedSession`).
4. **`Conversation` (`Database/ai/conversation.model.ts:59-62`):**
   - Índice sobre `{ lastInteraction: 1 }` con `expireAfterSeconds: 2592000` (**30 días**). *Nota: Modelo huérfano no conectado al flujo activo de `aiHandler.ts`.*

### 1.4. Rotación de Logs Operativos en Disco (`scripts/cronJobs.ts:29-79`)
- Los archivos `logs/hoshiko-YYYY-MM-DD.jsonl` se eliminan automáticamente mediante el cron job diario `cleanOldLogs` (03:00 AM) cuando superan los **14 días** de antigüedad (`maxAgeDays = 14`).

---

## 2. Datos Sin Expiración Automática y Procedimientos Reales de Eliminación

Las colecciones `ServerConfig`, `StatusConfig`, `LocalLevel`, `GlobalLevel`, `GlobalProfile`, `UserMemory`, `Confession`, `Suggestion`, `Couple`, `StreakGroup`, `StreakMember`, `AvatarHistory`, `UserHistory`, `PresenceHistory`, `Case` y `Warning` **no tienen índice TTL en MongoDB**.

### 2.1. Comandos de Eliminación Disponibles en Discord
- **Por el propio usuario:**
  - `/clearmemory` y `/memory borrar`: Ejecutan `UserMemory.deleteOne({ userId, guildId })` o eliminan un hecho individual en el servidor actual.
- **Por administradores/moderadores del servidor:**
  - `/clearmemoryall`: Ejecuta `UserMemory.deleteMany({ guildId })`, borrando toda la memoria de IA del servidor.
  - `/warn remove` y `/warnings clear`: Eliminan advertencias de `Warning` en el servidor.
  - `/confession-delete`: Realiza **borrado lógico** (`isDeleted: true`, reemplaza `content` por `"[Borrado por Moderación]"` y `imageUrl: null`), manteniendo `authorId` por trazabilidad de seguridad.

### 2.2. Procedimiento ante Retirada del Bot (`guildDelete`) y Solicitudes de Titulares (DSR)
- **Ausencia de borrado automático al salir del servidor:** Como `Events.GuildDelete` no está implementado, la retirada del bot detiene nuevos tratamientos, pero la purga física de los documentos asociados al `guildId` o `userId` se realiza a petición del administrador o del usuario escribiendo a `janneralexandergg@gmail.com`.
