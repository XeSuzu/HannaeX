# Inventario de Componentes de Defensa y Moderación (Fase 0)

Este inventario documenta el estado real del código de HannaeX (Hoshiko) al iniciar la ejecución del plan de defensa y moderación, contrastando cada componente contra la base de código real (`archivo:línea`).

---

## 1. Tabla de Inventario de Componentes

| Componente | Ruta real en el código | Estado en código | Evidencia y comportamiento observado | Decisión / Fase |
| :--- | :--- | :---: | :--- | :--- |
| **`AntiRaid` (`handleJoin`)** | [`src/Security/Defense/antiraid.ts:7-34`](file:///home/hanna/HannaeX/src/Security/Defense/antiraid.ts#L7-L34) | **DESCONECTADO** | `JOIN_LIMIT = 1` (comentario dice 5). Ningún listener de Discord importa ni invoca `AntiRaid.handleJoin`. | Fase 5 (Reescribir y conectar) |
| **`isRaidActive`** | [`src/Security/Defense/antiraid.ts`](file:///home/hanna/HannaeX/src/Security/Defense/antiraid.ts) | **NO EXISTE** | No existe función o variable de ese nombre en todo el repositorio. | Fase 1 (Derivar del estrés $\ge$ umbral) |
| **Spam cross-channel / frecuencia** | [`src/Features/automod/automodState.ts:186,236`](file:///home/hanna/HannaeX/src/Features/automod/automodState.ts#L186) y [`src/Events/Client/messageCreate.ts:60,93`](file:///home/hanna/HannaeX/src/Events/Client/messageCreate.ts#L60) | **CONECTADO** | Conectados bajo `securityModules.antiSpam`. Ambos son 100% per-user (`${guild.id}:${userId}`). No vigilan mensajes repetidos en un solo canal. | Reusar y extender en Fase 1 |
| **`addServerStress`, `evaluateHighStressMessage`** | [`src/Features/automod/automodState.ts:68`](file:///home/hanna/HannaeX/src/Features/automod/automodState.ts#L68) y [`src/Features/automod/aiModeration.ts:265`](file:///home/hanna/HannaeX/src/Features/automod/aiModeration.ts#L265) | **CONECTADO** | `decayServerStress` (-5 pts/min). Invocados en `messageCreate.ts:120`, `guildMemberAdd.ts:63`, `linkProtector.ts:119`. | Reusar |
| **`triggerServerLockdown`, `liftServerLockdown`** | [`src/Features/automod/aiModeration.ts:340,405`](file:///home/hanna/HannaeX/src/Features/automod/aiModeration.ts#L340) | **CONECTADO** | Revoca `SendMessages` a `@everyone`. Guarda solo en RAM (`lockdownL1`) y Redis. Si el bot reinicia, `liftServerLockdown` devuelve `false` y no desbloquea. | Fase 1 (Persistir y hacer idempotente) |
| **IA Gemini en lotes** | [`src/Features/automod/aiModeration.ts:265-314`](file:///home/hanna/HannaeX/src/Features/automod/aiModeration.ts#L265-L314) | **CONECTADO** | Micro-batching de hasta 10 mensajes o 2.5s con cola `ai_moderation`. Circuit breaker tras 3 fallos (5 min). Ejecuta borrado y mute directo si se activa. | Fase 2 (Pasar a sombra y juez) |
| **`selectRaidSuspects` / "Banear raiders"** | [`src/Features/automod/aiModeration.ts:439,480`](file:///home/hanna/HannaeX/src/Features/automod/aiModeration.ts#L439) | **CONECTADO** | Excluye atacantes bot con `if (m.user.bot) continue;` en L449. Verifica `BanMembers` en el botón ([`components.ts:192`](file:///home/hanna/HannaeX/src/Events/Client/handlers/components.ts#L192)). | Fase 3 (Incluir bots atacantes) |
| **`HoshikoLogger` botones** | [`src/Security/Logger/HoshikoLogger.ts:461-502`](file:///home/hanna/HannaeX/src/Security/Logger/HoshikoLogger.ts#L461-L502) | **CONECTADO** | Si `target.bot` es true en L473, no añade botones interactivos para staff. Quien pulsa se valida en `components.ts:56-60`. | Fase 3 (Permitir botones para bots) |
| **Detector de menciones masivas** | [`src/Events/Client/messageCreate.ts`](file:///home/hanna/HannaeX/src/Events/Client/messageCreate.ts) | **NO EXISTE** | Ningún detector inspecciona `mentions.everyone` ni cuenta roles/usuarios mencionados para automoderar. | Crear en Fase 1 |
| **Detector repetición mono-cuenta (mismo canal)** | [`src/Features/automod/automodState.ts`](file:///home/hanna/HannaeX/src/Features/automod/automodState.ts) | **NO EXISTE** | `checkCrossChannelSpam` exige $\ge 3$ canales distintos; `checkSpamForUser` solo mide frecuencia (4 msgs en 5s). | Crear en Fase 1 |
| **Detector multi-cuenta** | [`src/Features/automod/automodState.ts`](file:///home/hanna/HannaeX/src/Features/automod/automodState.ts) | **NO EXISTE** | Todo el estado de spam está particionado por `userId`. No hay contadores colectivos. | Crear en Fase 2 o 5 |
| **`antiRaidText.ts`** | [`src/Features/automod/`](file:///home/hanna/HannaeX/src/Features/automod/) | **NO EXISTE** | No existe como archivo. | Evitar archivo nuevo; ubicar en `automodState.ts` |
| **Toggle `antiRepeat`** | [`src/Database/guild/serverConfig.model.ts`](file:///home/hanna/HannaeX/src/Database/guild/serverConfig.model.ts) | **NO EXISTE** | No existe en modelos ni UI. | No crear; cuelga de `antiSpam` |
| **`linkProtector`, `wordFilter`** | [`src/Features/linkProtector.ts`](file:///home/hanna/HannaeX/src/Features/linkProtector.ts) y [`src/Features/automod/wordFilter.ts`](file:///home/hanna/HannaeX/src/Features/automod/wordFilter.ts) | **CONECTADO** | Ambos conectados síncronamente en `messageCreate.ts:116,117`. | Reusar |
| **`antiNukeBans/Channels/Roles`** | [`src/Events/Client/Guilds/antiNuke*.ts`](file:///home/hanna/HannaeX/src/Events/Client/Guilds/) | **CONECTADO** | `banTracker`, `deletionTracker`, `roleDeletionTracker` son Maps nativos sin TTL ni límite de tamaño, indexados solo por `userId`. Ignoran bots ejecutores. | Fase 1 (Clave compuesta y TTL) |
| **`RateLimiter`** | [`src/Security/Defense/RateLimiter.ts`](file:///home/hanna/HannaeX/src/Security/Defense/RateLimiter.ts) | **CONECTADO** | Map global en memoria sin TTL ni purga de usuarios inactivos. | Fase 1 (TTL) |
| **`LocalCacheService`** | [`src/App/infrastructure/cache/LocalCacheService.ts`](file:///home/hanna/HannaeX/src/App/infrastructure/cache/LocalCacheService.ts) | **CONECTADO** | Wrapper sobre `lru-cache` con `max` y `ttlMs` estrictos. | Reusar ampliamente |
| **`SettingsManager`** | [`src/Database/guild/SettingsManager.ts`](file:///home/hanna/HannaeX/src/Database/guild/SettingsManager.ts) | **CONECTADO** | Caché LRU local (`settingsCache`), opera sobre `ServerConfig` (`serverconfigs`). | Reusar como única fuente de verdad |
| **`GuildConfig` / `guildconfigs`** | [`src/Database/guild/guildConfig.model.ts`](file:///home/hanna/HannaeX/src/Database/guild/guildConfig.model.ts) | **CONECTADO (PARASITARIO)** | Usado exclusivamente por `setup-automod.ts:95` y `automodPersistence.ts:8,74,86`. Causa split-brain. | Fase 1 (Eliminar usos) |
| **`ServerConfig` / `serverconfigs`** | [`src/Database/guild/serverConfig.model.ts`](file:///home/hanna/HannaeX/src/Database/guild/serverConfig.model.ts) | **CONECTADO** | Usado por `SettingsManager` y todos los listeners reales. Defaults: `antiSpam: false`, `securityLevel: 2`. | Fase 1 |
| **`RiskEngine`, casos, cuarentena (rol)** | `src/` | **NO EXISTE** | No existen en el código actual. | No construir por ahora |
| **Estado persistente de raid/lockdown en Mongo** | [`src/Database/guild/serverConfig.model.ts`](file:///home/hanna/HannaeX/src/Database/guild/serverConfig.model.ts) | **NO EXISTE** | No hay campos de lockdown en los esquemas de Mongo. | Fase 1 (Añadir a `serverConfig`) |
| **Feedback del staff (deshacer, huellas seguras)** | [`src/Events/Client/handlers/components.ts:130-156`](file:///home/hanna/HannaeX/src/Events/Client/handlers/components.ts#L130-L156) | **PARCIAL** | Botón `forgive` añade usuario a whitelist en `GuildConfig` y restaura mensajes; no maneja huellas seguras. | Fase 4 |
| **Tests de seguridad** | [`tests/unit/automod-entropy.test.cjs`](file:///home/hanna/HannaeX/tests/unit/automod-entropy.test.cjs) | **PARCIAL** | Solo prueba `checkCrossChannelSpam` y stubs de IA. Cero tests de `antiraid`, `linkProtector`, `antiNuke` o `messageCreate`. | Fase 1 en adelante |
| **Redis / BullMQ** | [`src/App/infrastructure/redis/RedisClient.ts`](file:///home/hanna/HannaeX/src/App/infrastructure/redis/RedisClient.ts) | **CONECTADO** | Presente y probado; opera con fallback en memoria L1 si `REDIS_URL` no está configurado. | Mantener arquitectura tolerante |
| **`securityLevel` (niveles)** | [`src/Database/guild/serverConfig.model.ts:8`](file:///home/hanna/HannaeX/src/Database/guild/serverConfig.model.ts#L8) | **CONECTADO** | Niveles 1 a 4. Umbrales: Nvl 1 (150 pts), Nvl 2 (100 pts), Nvl 3 (60 pts), Nvl 4 (30 pts). Nvl 4 expulsa en lockdown. | Base de los Presets en Fase 1B |
| **Handler de entrada (`guildCreate`)** | [`src/Events/Client/Guilds/guildCreate.ts:9-164`](file:///home/hanna/HannaeX/src/Events/Client/Guilds/guildCreate.ts#L9-L164) | **CONECTADO** | Registra comandos Slash y envía mensaje de bienvenida. No inicializa configuración de seguridad. | Fase 1B (Aplicar preset por defecto) |
| **Comandos de moderación manual** | [`src/Commands/SlashCmds/Moderation/`](file:///home/hanna/HannaeX/src/Commands/SlashCmds/Moderation/) | **PARCIAL** | Existen: `warn`, `unwarn`, `warnings`, `clearwarnings`, `Mute`, `tempmute`, `unmute`, `kick`, `ban`, `unban`, `softban`, `tempban`. Faltan: `purge` y `cases`. | Fase 1B |
| **Modelo de casos de moderación** | [`src/Database/moderation/`](file:///home/hanna/HannaeX/src/Database/moderation/) | **NO EXISTE** | Existen `warning.model.ts` y `tempModeration.model.ts`, pero no un modelo central de casos (`case.model.ts`). | Fase 1B |
| **Reglas del servidor configurables** | `src/Database/` | **NO EXISTE** | No existe almacenamiento de reglas en la base de datos. | Fase 1B |
| **Exenciones (canales y roles)** | `src/Database/guild/` | **NO EXISTE** | Solo existe `whitelistedUsers` en el modelo deprecado `GuildConfig`. | Fase 1B |
| **Canal de modlog configurable** | [`src/Database/guild/serverConfig.model.ts:24`](file:///home/hanna/HannaeX/src/Database/guild/serverConfig.model.ts#L24) | **CONECTADO** | `logChannels.modlog` configurable vía `/setup-logs`. | Reusar |
| **Planes / feature flags (gratis vs premium)** | [`src/Database/guild/PremiumManager.ts:11-28`](file:///home/hanna/HannaeX/src/Database/guild/PremiumManager.ts#L11-L28) | **CONECTADO** | `PremiumManager.isPremium(guildId)` consulta `serverconfigs.premiumUntil > Date.now()`. | Reusar para compuerta en Fase 2 |
| **Diagnóstico de permisos del bot** | `src/Commands/SlashCmds/Moderation/setup*` | **NO EXISTE** | `/setup` no inspecciona permisos faltantes (`ManageMessages`, `ModerateMembers`, etc.) ni jerarquía de roles. | Fase 1B |

---

## 2. Respuestas a Preguntas Obligatorias de Fase 0

### Pregunta 1: Valores de configuración en `serverconfigs`
En el esquema de persistencia activo [`serverConfig.model.ts:223-234`](file:///home/hanna/HannaeX/src/Database/guild/serverConfig.model.ts#L223-L234), los valores por defecto son:
* `securityModules.antiSpam`: `false`
* `securityModules.antiLinks`: `false`
* `securityModules.wordFilter`: `false`
* `securityModules.securityLevel`: `2` (umbral de estrés: 100 pts)

*Cómo consultarlo en producción para un servidor específico:*
```bash
node -e "
const mongoose = require('mongoose');
const { ServerConfig } = require('./dist/Database/guild/serverConfig.model.js');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const doc = await ServerConfig.findOne({ guildId: '<ID_DEL_SERVIDOR>' }).lean();
  console.log(doc?.securityModules);
  process.exit(0);
});
"
```

### Pregunta 2: ¿Qué detector debió actuar sobre el incidente y por qué no lo hizo?
1. **El incidente:** Una cuenta envió mensajes largos repetidos en un **único canal**.
2. **Qué detector debió actuar:**
   * Si `antiSpam` estaba activo en base de datos, debió actuar la detección de spam.
3. **Por qué NO actuó:**
   * **Razón A (Split-Brain):** Si el administrador activó el anti-spam con `/setup-automod`, se guardó en la colección `guildconfigs` ([`setup-automod.ts:95`](file:///home/hanna/HannaeX/src/Commands/SlashCmds/Moderation/setup-automod.ts#L95)), pero el evento [`messageCreate.ts:51`](file:///home/hanna/HannaeX/src/Events/Client/messageCreate.ts#L51) leyó de `serverconfigs`, donde `antiSpam` seguía siendo `false`.
   * **Razón B (Ausencia de detector mono-canal):** Aún con `antiSpam: true`, [`checkCrossChannelSpam`](file:///home/hanna/HannaeX/src/Features/automod/automodState.ts#L254) **exige explícitamente $\ge 3$ canales distintos** (`entry.channels.length >= 3`). Al ocurrir en un solo canal, fue ignorado.
   * **Razón C (Frecuencia insuficiente):** [`checkSpamForUser`](file:///home/hanna/HannaeX/src/Features/automod/automodState.ts#L198) solo dispara si se envían $\ge 4$ mensajes en menos de $5$ segundos. Si el usuario envió los mensajes repetidos con más de 1.5 segundos de separación, el contador nunca superó el umbral.
   * **Por qué SÍ actuó `antiLinks`:** [`linkProtector.ts:75`](file:///home/hanna/HannaeX/src/Features/linkProtector.ts#L75) corre incondicionalmente en cada mensaje; si contenía enlace a phishing o dominio externo, borró el mensaje de inmediato de forma síncrona.

### Pregunta 3: Defectos nuevos detectados fuera de alcance
1. **Falta de comando `/purge` o `/clear`:** Solo existe lógica de purga como botón de resolución en [`components.ts:108`](file:///home/hanna/HannaeX/src/Events/Client/handlers/components.ts#L108).
2. **`SettingsManager.updateSettings` sin sync con `guildconfigs`:** Durante meses convivieron dos colecciones divergentes con nombres casi idénticos.
3. **Manejo de errores en `AutomodManager.executeAction`:** Si Discord rechaza el timeout por jerarquía (`DiscordAPIError: Missing Permissions`), no hay catch localizado y el error sube al listener general.
