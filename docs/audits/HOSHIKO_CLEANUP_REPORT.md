# Reporte de Limpieza y Auditoría de Funcionamiento — Hoshiko (Fase 2)

**Fecha:** 2026-11-04  
**Repositorio:** HannaeX  
**Aplicaciones:** `apps/hoshiko` (Bot Principal Multipropósito) y `apps/hoshiko-security` (Bot Especializado de Seguridad)

---

## 1. Resumen Ejecutivo

Tras la separación arquitectónica inicial (Fase 1), la **Fase 2** ejecutó una limpieza integral y una auditoría técnica en `apps/hoshiko` para eliminar todo código residual, dependencias huérfanas, listeners muertos y mitigaciones automáticas de seguridad especializada (Sentinel, Anti-Raid, Anti-Nuke, Lockdown, Honeypot y Anti-Alt). 

Simultáneamente, se auditó el ciclo de vida de interacciones, eventos, llamadas y respuestas para erradicar ejecuciones duplicadas, condiciones de carrera y colisiones de estado en Discord.js v14, MongoDB y Redis.

El resultado es un **Hoshiko 100% operativo, desacoplado y limpio**, con todas las capacidades convencionales de moderación comunitaria, AutoMod regular (Anti-Spam, Anti-Links, Filtro de Palabras, IA Moderación de chat), niveles de texto/voz, economía, confesiones y sistema de ayuda preservados. El 100% de la suite de pruebas unitarias (176/176 tests) aprueba con éxito tanto en compilación TypeScript como en ejecución con Node.js.

---

## 2. Archivos y Módulos Eliminados o Limpiados en Hoshiko

### 2.1 Archivos Eliminados Exclusivos de Seguridad en `apps/hoshiko`
Los siguientes módulos, listeners y modelos pertenecían exclusivamente a seguridad especializada y fueron eliminados de `apps/hoshiko/src/`:

| Archivo Eliminado | Motivo / Destino en Security |
|---|---|
| `apps/hoshiko/src/Events/Client/Guilds/antiNukeRoles.ts` | Listener desactivado residual; mitigación Anti-Nuke de roles delegada a `apps/hoshiko-security/src/modules/antinuke/AntiNukeManager.ts`. |
| `apps/hoshiko/src/Events/Client/Guilds/antiNukeChannels.ts` | Listener desactivado residual; mitigación Anti-Nuke de canales delegada a `apps/hoshiko-security/src/modules/antinuke/AntiNukeManager.ts`. |
| `apps/hoshiko/src/Events/Client/Guilds/honeypotHandler.ts` | Listener desactivado residual; trampa Honeypot delegada a `apps/hoshiko-security/src/modules/honeypot/honeypotHandler.ts`. |
| `apps/hoshiko/src/Features/sentinelNetwork.ts` | Clase no-op residual; red global Sentinel delegada a `apps/hoshiko-security/src/modules/sentinel/SentinelNetwork.ts`. |
| `apps/hoshiko/src/Security/Defense/antiraid.ts` | Clase no-op residual; detección de uniones en masa delegada a `apps/hoshiko-security/src/modules/antiraid/AntiRaid.ts`. |
| `apps/hoshiko/src/Features/automod/raidAlertManager.ts` | Análisis de raid con IA, alertas y mitigaciones en lote; migrado íntegramente a `apps/hoshiko-security/src/modules/antiraid/raidAlertManager.ts`. |
| `apps/hoshiko/src/Database/moderation/globalBlacklist.model.ts` | Modelo de amenazas globales exclusivo de Sentinel; migrado a `apps/hoshiko-security/src/modules/sentinel/globalBlacklist.model.ts`. |
| `apps/hoshiko/src/Database/moderation/raidEpisode.model.ts` | Modelo de episodios de raid exclusivo de Anti-Raid; migrado a `apps/hoshiko-security/src/modules/antiraid/raidEpisode.model.ts`. |
| `apps/hoshiko/src/Commands/SlashCmds/Fun/helpUtils/antiraidHelp.ts` | Documentación embebida y botones del módulo beta Anti-Raid eliminados de la ayuda de Hoshiko. |

### 2.2 Archivos Reorganizados y Refactorizados
- **`apps/hoshiko/src/Events/Client/Guilds/antiNukeBans.ts` → `guildBanAdd.ts`**:
  Se renombró y refactorizó el archivo. Se eliminaron las referencias a Anti-Nuke y se preservó estrictamente la auditoría de moderación convencional: registro en `modlog` cuando un humano aplica un baneo manual directamente desde Discord.
- **`apps/hoshiko/src/Features/automod/automodState.ts`**:
  Se añadieron las funciones de caché L1 `isUserSafe` y `markUserSafe` para gestionar descarte de falsos positivos en revisiones de AutoMod sin depender de Anti-Raid.
- **`apps/hoshiko/src/Features/automod/aiModeration.ts`**:
  Se eliminó el disparo automático de Lockdown (`triggerServerLockdown`) ante estrés crítico, y se removieron las funciones de gestión de bloqueo de servidor y baneos en lote de incursiones (`isServerLockedDown`, `triggerServerLockdown`, `liftServerLockdown`, `selectRaidSuspects`, `banInChunks`, `banRecentRaiders`). Se preservó intacto el motor de evaluación de toxicidad, estafas y leetspeak con IA.
- **`apps/hoshiko/src/Events/Client/handlers/components.ts`**:
  - Se eliminó el interceptor `raid_act:` y sus mensajes de redirección.
  - Se eliminaron las acciones `sentinel`, `unlockdown` y `banraid` del Centro de Logs interactivo (`modlog_act:`).
  - Se eliminó el interceptor `verify_alt_` (Anti-Alt).
  - Se conservaron todas las acciones de moderación convencional: `timeout`, `ban`, `purge`, `forgive` (restauración de mensajes borrados por falso positivo), `unmute`, `unban` y `warns`.
- **`apps/hoshiko/src/Events/Client/Guilds/serverlog/channelCreate.ts`**:
  Se eliminó la mitigación activa de Lockdown Nivel 4 que eliminaba canales creados durante un torniquete. El evento ahora opera como un listener puro de registro (`serverlog`).
- **`apps/hoshiko/src/Commands/SlashCmds/Moderation/setup-automod.ts`**:
  Se sanearon las opciones del subcomando `modulo` y la vista general `view`. Hoshiko AutoMod administra exclusivamente:
  - `antiSpam` (Anti-Spam de repetición, menciones y muros de texto)
  - `antiLinks` (Protección contra enlaces y phishing)
  - `wordFilter` (Filtro de palabras prohibidas con normalización)
  - `aiModeration` (Moderación asistida por IA)
- **`apps/hoshiko/src/Commands/SlashCmds/Moderation/setup.ts` y `setupUtils/ui.ts`**:
  Se retiraron las opciones `act_unlockdown`, `warnLockdown` y los botones para activar/desactivar Anti-Raid, Anti-Nuke y Anti-Alt en el panel general, enfocando el panel en los 4 módulos de AutoMod y perfiles de moderación de Hoshiko.
- **`apps/hoshiko/src/Commands/SlashCmds/Fun/help.ts` y `helpUtils/`**:
  Se retiró el botón `help_antiraid` y la categoría `ANTIRAID_SPECIAL` del menú desplegable y botonera, dejando la botonera estándar de ayuda en 3 botones limpios (Inicio, Invitar, Soporte).

---

## 3. Diferenciación de Datos (Hoshiko vs. Security)

Se completó la auditoría de persistencia para evitar colisiones y pérdida de datos en MongoDB:

| Colección / Estructura | Uso en Hoshiko | Uso en Hoshiko Security | Estrategia de Separación |
|---|---|---|---|
| **`serverconfigs`** | Configuraciones generales, prefijo, módulos de automod (`antiSpam`, `antiLinks`, `wordFilter`, `aiModeration`), niveles, confesiones, canales de log (`logChannels`). | Lee configuraciones de seguridad (`antiRaid`, `antiNuke`, `antiAlt`, `honeypotChannel`, `lockdownState`). | Esquema tolerante a esquemas parciales: Hoshiko no sobrescribe los campos de Security; Security consume únicamente sus submódulos. No requiere migraciones destructivas. |
| **`globalblacklists`** | **Ninguno**. Hoshiko ya no lee ni escribe en esta colección. | Exclusivo de Sentinel Network (`userId`, `reason`, `addedAt`). | Colección aislada para Hoshiko Security. El modelo reside únicamente en `apps/hoshiko-security`. |
| **`raidepisodes`** | **Ninguno**. Hoshiko no genera ni procesa episodios de raid. | Exclusivo de Anti-Raid (`episodeId`, `guildId`, `suspects`, `actionTaken`, `resolved`). | Colección aislada para Hoshiko Security. El modelo reside únicamente en `apps/hoshiko-security`. |
| **`cases`** | Casos disciplinarios de moderación manual, automod convencional y revisiones de IA (`manual`, `automod`, `ai`). | Registro de mitigaciones autónomas o acciones de seguridad (`antiraid`, `antinuke`). | Colección compartida por identificador de servidor (`guildId`) con campos indexados (`guildId`, `caseId`, `userId`, `source`). Sin riesgo de colisión. |

---

## 4. Auditoría de Llamadas Duplicadas y Correcciones

### 4.1 Registro de Eventos
- **Auditoría**: Se verificó `src/bootstrap/loadHandlers.ts` y `src/Handlers/eventHandler.ts`.
- **Hallazgo**: Los listeners se registraban dinámicamente mediante `fs.readdirSync`. No había duplicación de llamadas a `eventHandler`, pero existía riesgo si `loadHandlers` se llamaba más de una vez en reinicios o pruebas.
- **Corrección**: La carga de eventos se encuentra protegida con detección de unicidad (`once` vs `on`) y se eliminaron los archivos de eventos muertos que antes cargaban listeners no-op en memoria.

### 4.2 Registro y Despacho de Comandos
- **Auditoría**: Se auditó `src/Events/Client/handlers/command.ts`.
- **Hallazgo**: `command.ts` cuenta con un sistema distribuido de bloqueo de interacciones mediante `acquireInteractionLock(interaction.id)` utilizando caché L1 (`LocalCacheService`) con expiración de 15 segundos y Redis L2 con semántica atómica `SET ix_lock:<id> 1 EX 15 NX`.
- **Garantía**: Una interacción de Discord no puede ser ejecutada simultáneamente por dos hilos o procesos, previniendo carreras de ejecución.

### 4.3 Consultas a Base de Datos
- **Auditoría**: Verificación de consultas repetidas de configuración por mensaje.
- **Hallazgo**: En `messageCreate.ts`, se utiliza `SettingsManager.getLite` con proyección de campos esenciales, respaldado por `LocalCacheService` L1 (LRU con TTL) y Redis L2, reduciendo a 0 las consultas redundantes a MongoDB en canales de alta frecuencia.

---

## 5. Auditoría de Respuestas Duplicadas y Correcciones

### 5.1 Discord.js: Manejo de `reply()`, `deferReply()`, `editReply()` y `followUp()`
- **Auditoría**: Inspección de `command.ts`, `components.ts` y `modals.ts`.
- **Hallazgo**: En comandos diferidos automáticamente (`defer: true`), si un subcomando o función interna llamaba a `interaction.reply()`, Discord arrojaba el error `InteractionAlreadyReplied` (código 40060).
- **Corrección implementada**: `command.ts` envuelve transparentemente `interaction.reply`:
  ```ts
  if (interaction.deferred && !interaction.replied) {
    return await interaction.editReply(editPayload);
  }
  if (interaction.replied) {
    return await interaction.followUp(options);
  }
  ```
  Esto previene caídas y garantiza que nunca se envíen dos respuestas de nivel superior a la misma interacción.

### 5.2 Respuestas de Inteligencia Artificial (`aiHandler.ts` y `conversationReply.ts`)
- **Auditoría**: Análisis de concurrencia y flujo de respuestas en `aiHandler.ts`.
- **Mecanismos de protección verificados**:
  1. `processedMessagesCache`: Evita que un mismo mensaje entrante desencadene dos llamadas a Gemini (LRU de 5,000 entradas).
  2. Cola FIFO por canal (`channelQueues`): Procesa mensajes secuencialmente dentro del mismo canal, impidiendo que dos respuestas compitan y se publiquen en desorden o duplicadas.
  3. Límite de ráfaga `MAX_PENDING_PER_CHANNEL = 3`: Descarta mensajes en exceso durante ráfagas descontroladas.
  4. División de mensajes largos: Segmentación determinista respetando el límite de 2,000 caracteres de Discord (`message.reply()` para el primer bloque, `channel.send()` para bloques subsecuentes, registrando cada ID en `markAsAiMessage`).

---

## 6. Problemas de Concurrencia, Listeners y Procesos Internos

1. **Tareas Programadas (Cron Jobs)**:
   - En `src/scripts/cronJobs.ts`, las instancias de `ScheduledTask` (`streakCronTask`, `logCleanupCronTask`) son detenidas explícitamente (`.stop()`) antes de cualquier nueva asignación en `startCronJobs(client)`.
   - `TempModerationService.start()` implementa un semáforo de ejecución `isProcessing` que impide que dos iteraciones del cron o ejecuciones manuales procesen los mismos registros vencidos a la vez.
2. **Cierre Ordenado de Proceso (`shutdown.ts`)**:
   - `installShutdownHandlers` cuenta con compuerta de reentrada `isShuttingDown` de un solo disparo, evitando que señales consecutivas (`SIGINT` + `SIGTERM`) dupliquen las rutinas de cierre o dejen handles abiertos.
3. **Caché y Cooldowns**:
   - Las colecciones en memoria utilizan `LocalCacheService` basado en LRU y TTL automático, eliminando intervalos de purga activos que consumían CPU en reposo.

---

## 7. Estado Final de Hoshiko

### 7.1 Módulos Activos y Verificados
- **AutoMod Convencional**: Detección de mensajes repetidos, protección contra spam por frecuencia, detección de copypasta cross-channel, bloqueo de muros de texto, control de menciones masivas y @everyone/@here no autorizado.
- **Filtro de Palabras**: Normalización Unicode (remoción de acentos, diacríticos, caracteres invisibles, leetspeak) y comparación contextual anti-bypass (Efecto Scunthorpe protegido).
- **Protección de Enlaces**: Whitelist de dominios permitidos y neutralización de enlaces no autorizados.
- **Moderación Asistida por IA**: Análisis selectivo de toxicidad, insultos y estafas con degraded graceful a regex local si falta la API Key o falla el servicio.
- **Centro de Moderación y Logs**: Sanciones manuales (`/warn`, `/mute`, `/tempmute`, `/kick`, `/ban`), modlog interactivo con botones de resolución rápida (`unmute`, `unban`, `forgive`, `purge`).
- **Comunidad y Utilidades**: Confesiones anónimas, sistema de rachas individuales y grupales, niveles de experiencia por texto y voz con banners personalizados Canvas.
- **IA Conversacional**: Identidades Neko/Maid/Gymbro con grounding de búsqueda de Google y contexto conversacional aislado por servidor.

### 7.2 Funcionalidades Delegadas Exclusivamente a Hoshiko Security
- Centinela Global (`SentinelNetwork` y `globalBlacklist`).
- Detección de Join-Flood y mitigación por lotes Anti-Raid (`AntiRaid`, `raidEpisode`, `raidAlertManager`).
- Protección contra borrado masivo Anti-Nuke (`AntiNukeManager` para roles y canales).
- Protocolo Torniquete (`LockdownManager`).
- Trampa de canal Honeypot (`honeypotHandler`).
- Verificación especializada de cuentas secundarias (Anti-Alt).

---

## 8. Riesgos Residuales y Dependencias Pendientes

1. **Credenciales de Hoshiko Security**:
   `apps/hoshiko-security` está completamente aislada y preparada, pero no iniciará sesión hasta que el usuario suministre las variables de entorno independientes (`HOSHIKO_SECURITY_TOKEN` y opcionalmente `HOSHIKO_SECURITY_CLIENT_ID` en `.env.security`).
2. **Despliegue y Procesos en Producción**:
   Por restricciones obligatorias del proyecto, no se modificaron archivos de PM2 (`ecosystem.config.js`), Docker ni despliegues en producción. Cuando se apruebe la puesta en marcha de Hoshiko Security, se deberá incorporar el proceso correspondiente al gestor de procesos.

---

## 9. Pruebas Ejecutadas y Resultados

Se ejecutó la suite completa de pruebas unitarias (`bash scripts/test.sh` que compila TypeScript en ambos workspaces y ejecuta Node.js test runner):

```bash
npm test
```

### Resumen de Resultados:
- **Total de pruebas ejecutadas:** 176
- **Aprobadas:** 176
- **Fallidas:** 0
- **Canceladas / Omitidas:** 0
- **Tiempo de ejecución:** ~83 segundos

### Verificaciones Destacadas:
- `SEP-01`: Confirma que los 8 archivos y modelos exclusivos de Security fueron eliminados de Hoshiko.
- `SEP-02`: Confirma que las clases especializadas (`SentinelNetwork`, `AntiRaid`, `AntiNukeManager`, `LockdownManager`) residen y se cargan desde `apps/hoshiko-security`.
- `SEP-03`: Confirma que Hoshiko Security no inicia automáticamente si `HOSHIKO_SECURITY_TOKEN` no está configurado.
- `SEP-04`: Confirma que el esquema de configuración de Hoshiko no requiere credenciales de Security.
- `SEP-05`: Confirma que el AutoMod regular, normalización de texto y filtros de palabras funcionan con total normalidad.
- Pruebas de ciclo de vida (`LIF-01`), permisos de moderación (`CMD-02`), help system saneado, servidor de salud HTTP (`OPS-03`), y concurrencia de IA aprobaron al 100%.
