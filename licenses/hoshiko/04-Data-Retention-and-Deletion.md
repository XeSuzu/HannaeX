# 04 — Data Retention and Deletion (Internal Technical Policy)

**Título:** Política Técnica de Retención, Expiración TTL y Eliminación de Datos  
**Identificador de Versión:** `HOSHIKO-INT-RET-3.2.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-09  
**Estado:** `INTERNALLY-APPROVED`  
**Alcance:** `apps/hoshiko` (Bot Principal)  
**Referencias:** `DATA-INVENTORY.md`, `guildDelete.ts`, `PersonalMemoryService.ts`, `FieldEncryptionService.ts`, `TrackingOptOutManager.ts`, `cronJobs.ts`  

---

## 1. Mecanismos de Expiración Automática (TTL) Verificados en Código

### 1.1. Cachés en Memoria RAM (`LocalCacheService` / `LRUCache`)
- `guild_settings_l1` (`CacheManager.ts:10-16`): Máx. 1000 entradas, **TTL 5 minutos** (`300000ms`).
- `LevelConfigCache` (`LevelConfigCache.ts:4-7`): Máx. 500 entradas, **TTL 60 segundos** (`60000ms`).
- `ai_processed_msgs` (`aiHandler.ts`): Máx. 5000 entradas, **TTL 15 segundos** (`15000ms`).
- `ai_user_cooldown` (`aiHandler.ts`): Máx. 5000 entradas, **TTL 3 segundos** (`3000ms`).
- `automod_ai_verdicts` (`aiJudge.ts:42-45`): Máx. 5000 entradas, **TTL 1 hora** (`3600000ms`).
- `automod_ai_budget` (`aiJudge.ts:48-51`): Máx. 5000 entradas, **TTL 24 horas** (`86400000ms`).
- `snipeCache` (`SnipeService.ts:5, 9, 68-80`): Filtra en tiempo de lectura cualquier entrada cuya antigüedad supere **1 hora** (`3600000ms`).

### 1.2. Caché Distribuida Redis L2 (`RedisClient.ts`, `CacheManager.ts`)
- Clave `hannaex:<NODE_ENV>:guild_cfg:<guildId>`: **TTL 10 minutos** (`EX 600`).
- Redis está deshabilitado por defecto (`REDIS_ENABLED=false`) y si se activa opera como caché transitoria.

### 1.3. Índices TTL en MongoDB
1. **`InteractionLock` (`Database/system/system.models.ts`):**
   - Campo `createdAt`, `expires: "15s"` (**15 segundos**). Evita procesamiento duplicado de interacciones.
2. **`Snipe` (`Database/moderation/snipe.model.ts`):**
   - Índice `idx_snipe_ttl` sobre `{ updatedAt: 1 }` con `expireAfterSeconds: 3600` (**1 hora**).
3. **`ActiveVoiceSession` (`Database/leveling/activeVoiceSession.model.ts`):**
   - Índice sobre `{ start: 1 }` con `expireAfterSeconds: 86400` (**24 horas**). Además, se elimina inmediatamente al salir del canal de voz (`removePersistedSession`).
4. **`Conversation` (`Database/ai/conversation.model.ts`):**
   - Conectado y activo para el flujo de `aiHandler.ts`. Almacena hasta 40 turnos de mensajes por usuario y contexto (`{ userId, guildId }`) cifrados en reposo mediante **AES-256-GCM** (*fail-closed*).
   - Cuenta con índice TTL sobre `{ lastInteraction: 1 }` con `expireAfterSeconds: 2592000` (**30 días**). Se purga automáticamente tras 30 días de inactividad.
5. **`PresenceHistory` (`Database/tracking/userTracking.models.ts`):**
   - Índice TTL sobre `{ updatedAt: 1 }` con `expireAfterSeconds: 86400` (**24 horas**).
   - Minimización estricta: los datos de presencia y actividades en tiempo real no se conservan más allá de 24 horas.
6. **`PersonalMemory` (`Database/ai/personalMemory.model.ts` y `PersonalMemoryService.ts`):**
   - Almacena recuerdos y preferencias bajo cifrado estricto *fail-closed* **AES-256-GCM**.
   - **Corrección de seguridad:** Se eliminó el índice TTL a nivel de documento completo para evitar la destrucción involuntaria de recuerdos explícitos del usuario y sus preferencias.
   - **Retención granular por elemento:**
     - **Recuerdos Explícitos (`source: explicit`, `legacy_migrated_confirmed`):** Permanentes hasta que el usuario decida eliminarlos manualmente.
     - **Recuerdos Auto-extraídos (`source: auto_extracted`):** Expiran automáticamente a los **90 días** (`AUTO_EXTRACTED_TTL_MS = 7776000000ms`), siendo filtrados en lectura y purgados de la base de datos diariamente a las 03:00 AM mediante `purgeExpiredAutoExtractedFacts()`.

### 1.4. Rotación de Logs Operativos en Disco (`scripts/cronJobs.ts`)
- Los archivos `logs/hoshiko-YYYY-MM-DD.jsonl` se eliminan automáticamente mediante el cron job diario `cleanOldLogs` (03:00 AM) cuando superan los **14 días** de antigüedad (`maxAgeDays = 14`).

---

## 2. Datos Sin Expiración Automática y Procedimientos Reales de Eliminación

Las colecciones `GlobalLevel`, `GlobalProfile`, `Confession`, `Suggestion`, `Couple`, `StreakGroup`, `StreakMember`, `AvatarHistory` y `UserHistory` no tienen índice TTL directo en MongoDB.

### 2.1. Comandos de Eliminación y Oposición Disponibles en Discord
- **Por el propio usuario:**
  - `/privacy estado`: Consulta los datos de seguimiento almacenados y estado de opt-out.
  - `/privacy ajustes seguimiento:optout`: Activa el derecho de oposición; impide el registro de avatares, nombres y presencia.
  - `/privacy borrar`: Permite la supresión inmediata de datos de seguimiento (`categoria:tracking`), recuerdos de IA (`categoria:memory`) o todo (`categoria:todo`).
  - `/memory ver`, `/memory guardar`, `/memory borrar`: Gestión granular soberana de recuerdos personales.
  - `/clearmemory`: Elimina recuerdos asociados al contexto del servidor.
- **Por administradores/moderadores del servidor:**
  - `/warn remove` y `/warnings clear`: Eliminan advertencias en el servidor.
  - `/confession-delete`: Realiza borrado lógico de confesiones manteniendo trazabilidad de seguridad anti-acoso.

### 2.2. Procedimiento Automatizado ante Retirada del Bot (`guildDelete.ts`)
- **Cumplimiento estricto de Discord Developer Policy (Sección 4):**
  - Implementado en `apps/hoshiko/src/Events/Client/Guilds/guildDelete.ts`.
  - Cuando el Bot es expulsado o retirado de un servidor (`Events.GuildDelete`), el sistema purga de forma inmediata e irreversible todas las colecciones acotadas al `guildId`:
    - `ServerConfig`, `StatusConfig`, `LevelConfig`
    - `LocalLevel`, `ActiveVoiceSession`
    - `ServerEntityMemory`, `Conversation`, `UserMemory`, `AiTester`
    - `AvatarHistory`, `PresenceHistory` (acotados a ese guildId)
    - `CaseModel`, `GuildSequenceModel`, `Snipe`, `Warning`
    - `Confession`, `Suggestion`, `Couple`
  - Invalida cachés locales en memoria (`CacheManager.delete`, `LevelConfigCache.invalidate`).
  - Preserva intactos los perfiles globales del usuario y sus recuerdos personales soberanos de IA.
  - Si `guild.available === false` (interrupción temporal de Discord / outage), la purga se omite para evitar pérdida accidental de datos.
