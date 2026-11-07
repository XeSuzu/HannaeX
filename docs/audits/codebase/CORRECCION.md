# REGISTRO DE CORRECCIONES - HANNAEX

Este documento registra la ejecución paso a paso de las correcciones en el repositorio HannaeX conforme al plan estructurado de lotes pequeños, verificables y reversibles.

---

## Lote 0: Protección del Repositorio (`PROTECT-00`)

- **Estado:** APLICADO
- **Rama activa:** `fix/auditoria`
- **Hash de respaldo verificado:** `2a0cf6f9b78b08d5274d33c91f30378d3b1beecb` (*Re ajuste de replys y mejoras varias*, 2026-10-22 21:59:43 -0500)
- **Verificación de estado:**
  - `git branch --show-current`: `fix/auditoria`
  - `git status --short --branch`: `## fix/auditoria` (limpio)
  - `master` preservado e intacto.
  - Ningún secreto añadido.
- **Resultados de Verificación:**
  - TypeScript (`npx tsc --noEmit`): Pre-verificado limpio en auditoría (exit 0).
  - Tests (`npm test`): Pre-verificado 146/146 PASS.
  - ESLint: No configurado en el proyecto (conforme a AGENTS.md: *Lint: no hay script ni configuración de lint*).

---

## Lote 1: Ciclo de vida y parada limpia (`LIF-01`)

- **Estado:** APLICADO
- **Archivos modificados:**
  - `ecosystem.config.js`: Agregado `kill_timeout: 10000` a las 3 aplicaciones PM2 preservando `cwd`.
  - `src/Services/TempModerationService.ts`: Almacenada referencia a la tarea programada `cronTask` y exportado `static stop()` para detener el cron de moderación temporal.
  - `src/scripts/cronJobs.ts`: Almacenada referencia a `streakCronTask` y exportado `stopCronJobs()`.
  - `src/App/bootstrap/ShutdownService.ts`: Retorno de `Promise<boolean>` (`allClean` falso si algún paso falla o excede tiempo).
  - `src/Utils/antiCrash.ts`: Hook `setFatalErrorHandler` para invocar el apagado ordenado con código 1 ante `uncaughtException`, y timeout de 3s en webhook para evitar cuelgues.
  - `src/lifecycle/shutdown.ts`:
    - Control de reentrada con flag atómico `isShuttingDown`.
    - Temporizador de seguridad de 5s con `.unref()` y `clearTimeout` en salida exitosa.
    - Llamada inmediata a `stopCronJobs()` en el inicio del apagado.
    - Manejo de señales `SIGINT` y `SIGTERM` con salida 0 si la limpieza fue completa o 1 si hubo fallo.
    - Conexión con `setFatalErrorHandler` para salir con código 1 ante excepciones fatales no capturadas.
  - `tests/unit/lifecycle-shutdown.test.cjs`: Suite de 6 pruebas unitarias aislando el ciclo de vida y señales.
- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0, sin errores de tipado).
  - `node --test tests/unit/lifecycle-shutdown.test.cjs`: 6 pruebas ejecutadas, 6 pasadas (exit 0).
  - `npm test`: 152 pruebas ejecutadas, 152 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `c8e4d1b` (`fix(LIF-01): orden de apagado, manejo de senales y detencion de cron jobs`)

---

## Lote 2: Servidor de salud seguro y retención de logs (`OPS-03`, `OPS-04`)

- **Estado:** APLICADO
- **Archivos modificados:**
  - `src/App/config/envSchema.ts`: Añadido campo `HEALTH_HOST` con valor por defecto `"127.0.0.1"`.
  - `src/http/healthServer.ts`:
    - Enlace explícito de `app.listen(port, host, ...)` a `127.0.0.1` (o variable `HEALTH_HOST`) en lugar de `0.0.0.0`.
    - Cierre seguro en `close()` que sincroniza y espera el evento `listening` si el servidor aún se encuentra inicializando, evitando puertos colgados.
  - `src/scripts/cronJobs.ts`:
    - Implementada función pura y asíncrona `cleanOldLogs({ logDir, maxAgeDays = 14 })` que audita y elimina ficheros `hoshiko-*.jsonl` con antigüedad mayor a 14 días.
    - Manejo tolerante ante directorios inexistentes o archivos con bloqueo.
    - Registro de tarea cron diaria a las 03:00 (`0 3 * * *`) y cancelación en `stopCronJobs()`.
  - `tests/unit/ops-health-logs.test.cjs`: Suite con 3 pruebas unitarias para enlace de red 127.0.0.1 y retención de logs.
- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0).
  - `node --test tests/unit/ops-health-logs.test.cjs`: 3 pruebas ejecutadas, 3 pasadas (exit 0).
  - `npm test`: 155 pruebas ejecutadas, 155 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `9c6227f` (`fix(OPS-03-04): enlace local para health server y retencion de logs rotativos`)

---

## Lote 3: Aislamiento conversacional y purga de moderación vestigial (`AI-01`, `AI-02`)

- **Estado:** APLICADO
- **Archivos modificados:**
  - `src/Database/ai/conversation.model.ts`:
    - Incorporado campo `guildId: string` (con valor por defecto `"dm"`) en `IConversation` y en el schema Mongoose.
    - Creado índice compuesto `{ userId: 1, guildId: 1 }` con restricción de unicidad (`unique: true`), eliminando la restricción global en `userId`.
    - Actualizadas las funciones `getHistory`, `addToHistory`, `clearHistory` y `getHistoryStats` para parametrizar `guildId` (con fallback transparente a `"dm"`), previniendo fugas contextuales entre servidores.
  - `src/Features/automod/aiModeration.ts`:
    - Eliminadas 180 líneas de código muerto vestigial (antiguo micro-batching nunca invocado y función `applyVerdict` con sanciones automáticas en conflicto con la política de mediación humana).
    - Preservada la constante `MAX_IMAGE_BYTES` para compuertas de imágenes y la función `evaluateWithLocalRegex`.
  - `tests/unit/ai-conversation-scope.test.cjs`: Suite con 3 pruebas unitarias para índice compuesto único, aislamiento de consultas por servidor y verificación de eliminación de símbolos vestigiales.
- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0).
  - `node --test tests/unit/ai-conversation-scope.test.cjs`: 3 pruebas ejecutadas, 3 pasadas (exit 0).
  - `npm test`: 158 pruebas ejecutadas, 158 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `4328e50` (`fix(AI-01-02): aislamiento de historial por servidor y purga de codigo muerto en aiModeration`)

---

## Lote 4: Centralización de modelos oficiales de Gemini (`AI-03`)

- **Estado:** APLICADO
- **Archivos modificados:**
  - `src/config/aiModels.ts`: Módulo central con identificadores oficiales de Google Gemini y soporte para sobreescritura limpia vía variables de entorno (`GEMINI_MODEL_FLASH`, `GEMINI_MODEL_FLASH_LITE`).
  - `src/Services/gemini.ts`: Sustituidas referencias `"gemini-2.5-flash-lite"` por `GEMINI_MODEL_FLASH_LITE`.
  - `src/Services/translationService.ts`: Sustituida referencia `"gemini-2.5-flash"` por `GEMINI_MODEL_FLASH`.
  - `src/Commands/PrefixCmds/Fun/translate.ts`: Sustituida referencia `"gemini-2.5-flash"` por `GEMINI_MODEL_FLASH`.
  - `src/Features/automod/aiJudge.ts`: Sustituida referencia `"gemini-2.5-flash-lite"` por `GEMINI_MODEL_FLASH_LITE`.
  - `src/Features/automod/raidAlertManager.ts`: Sustituida referencia `"gemini-2.5-flash-lite"` por `GEMINI_MODEL_FLASH_LITE`.
  - `src/Features/automod/aiHistorySummarizer.ts`: Sustituida referencia `"gemini-2.5-flash-lite"` por `GEMINI_MODEL_FLASH_LITE`.
  - `src/Features/automod/aiConfigAssistant.ts`: Sustituida referencia `"gemini-2.5-flash-lite"` por `GEMINI_MODEL_FLASH_LITE`.
  - `tests/unit/ai-models-centralization.test.cjs`: Pruebas unitarias para validar exportación de modelos oficiales y consumo en servicios.
- **Tabla de auditoría de modelos por punto de llamada:**

| Archivo | Función / Contexto | Modelo Anterior | Modelo Corregido |
|---|---|---|---|
| `src/Services/gemini.ts:132` | `generateResponseStream` | `gemini-2.5-flash-lite` | `GEMINI_MODEL_FLASH_LITE` (`gemini-2.0-flash-lite`) |
| `src/Services/gemini.ts:205` | `extractFacts` | `gemini-2.5-flash-lite` | `GEMINI_MODEL_FLASH_LITE` (`gemini-2.0-flash-lite`) |
| `src/Services/translationService.ts:25` | `translateText` | `gemini-2.5-flash` | `GEMINI_MODEL_FLASH` (`gemini-2.0-flash`) |
| `src/Commands/PrefixCmds/Fun/translate.ts:62` | `detectUserLang` | `gemini-2.5-flash` | `GEMINI_MODEL_FLASH` (`gemini-2.0-flash`) |
| `src/Features/automod/aiJudge.ts:578` | `judgeMessageWithAi` | `gemini-2.5-flash-lite` | `GEMINI_MODEL_FLASH_LITE` (`gemini-2.0-flash-lite`) |
| `src/Features/automod/raidAlertManager.ts:108` | `classifyRaidSuspects` | `gemini-2.5-flash-lite` | `GEMINI_MODEL_FLASH_LITE` (`gemini-2.0-flash-lite`) |
| `src/Features/automod/aiHistorySummarizer.ts:73` | `summarizeUserHistoryWithAi` | `gemini-2.5-flash-lite` | `GEMINI_MODEL_FLASH_LITE` (`gemini-2.0-flash-lite`) |
| `src/Features/automod/aiConfigAssistant.ts:165` | `generateConfigDraft` | `gemini-2.5-flash-lite` | `GEMINI_MODEL_FLASH_LITE` (`gemini-2.0-flash-lite`) |

- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0).
  - `node --test tests/unit/ai-models-centralization.test.cjs`: 2 pruebas ejecutadas, 2 pasadas (exit 0).
  - `npm test`: 160 pruebas ejecutadas, 160 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `36c977e` (`fix(AI-03): centralizar modelos oficiales de gemini con soporte de variables de entorno`)

---

## Lote 5: Guardas de permisos y jerarquía en comandos de moderación (`CMD-02`)

- **Estado:** APLICADO
- **Archivos creados y modificados:**
  - `src/Utils/moderationGuards.ts`: Creado módulo centralizado con:
    - `checkModeratorPermissions`: Comprobación interna de permisos de ejecución en `interaction.memberPermissions` con bypass automático para el dueño del servidor (`interaction.guild.ownerId`).
    - `checkBotPermissions`: Validación de permisos requeridos del bot (`interaction.guild.members.me`) previo a cualquier intento de mutación.
    - `canModerateTarget`: Validación de objetivo (no auto-sanción, no bot, no owner, jerarquía estricta moderador vs objetivo y bot vs objetivo).
    - `canManageRole`: Validación de jerarquía para roles gestionados respecto al rol del moderador y del bot.
  - Comandos integrados con las nuevas guardas:
    - `src/Commands/SlashCmds/Moderation/ban.ts`
    - `src/Commands/SlashCmds/Moderation/kick.ts`
    - `src/Commands/SlashCmds/Moderation/softban.ts`
    - `src/Commands/SlashCmds/Moderation/tempban.ts`
    - `src/Commands/SlashCmds/Moderation/Mute.ts`
    - `src/Commands/SlashCmds/Moderation/tempmute.ts`
    - `src/Commands/SlashCmds/Moderation/mass-ban.ts`
    - `src/Commands/SlashCmds/Moderation/purge.ts`
    - `src/Commands/SlashCmds/Moderation/mass-role-add.ts`
    - `src/Commands/SlashCmds/Moderation/mass-role-remove.ts`
  - `tests/unit/moderation-guards.test.cjs`: Suite unitaria con 4 pruebas verificando permisos internos, privilegios de dueño y jerarquía de roles.
- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0).
  - `node --test tests/unit/moderation-guards.test.cjs`: 4 pruebas ejecutadas, 4 pasadas (exit 0).
  - `npm test`: 164 pruebas ejecutadas, 164 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `e46bd9a` (`fix(CMD-02): guardas de permisos internos y jerarquia de roles en comandos de moderacion`)

---

## Lote 6: Operaciones atómicas de array en tracking de usuarios y avatares (`DB-02`)

- **Estado:** APLICADO
- **Archivos modificados:**
  - `src/Database/tracking/UserHistoryManager.ts`:
    - Reemplazada la secuencia propensa a colisiones concurrentes (`findOne` $\rightarrow$ `unshift` en memoria $\rightarrow$ `save()`, que desencadenaba `VersionError` por control de versión `__v`) por una verificación ligera con `exists` y una mutación atómica `updateOne` con `$push: { records: { $each: [rec], $position: 0, $slice: 40 } }` y `upsert: true`.
  - `src/Database/tracking/AvatarHistoryManager.ts`:
    - Reemplazada la secuencia de lectura y guardado por actualización atómica `updateOne` con `$push: { avatars: { $each: [rec], $position: 0, $slice: 30 } }` y `upsert: true`.
  - `tests/unit/history-atomic-ops.test.cjs`: Suite con 2 pruebas unitarias verificando la emisión de `$push`, `$position: 0`, `$slice` y la erradicación de llamadas a `save()`.
- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0).
  - `node --test tests/unit/history-atomic-ops.test.cjs`: 2 pruebas ejecutadas, 2 pasadas (exit 0).
  - `npm test`: 166 pruebas ejecutadas, 166 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `e706396` (`fix(DB-02): operaciones atomicas de array en historial de usuarios y avatares`)

---

## Lote 7: Migración de Canvas a encode asíncrono no bloqueante (`PERF-01`)

- **Estado:** APLICADO
- **Archivos modificados:**
  - `src/Services/CardService.ts`: Migrado `canvas.toBuffer("image/png")` a `await canvas.encode("png")`.
  - `src/Commands/SlashCmds/Canvas/post-twitter.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Commands/SlashCmds/Canvas/instaRenderer.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Commands/SlashCmds/Information/avatars.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Renderers/spotifyRenderer.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Renderers/robloxRenderer.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Utils/levelBanners/serverRank.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Utils/levelBanners/globalRank.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Utils/levelBanners/vcRank.ts`: Migrado a `await canvas.encode("png")`.
  - `src/Utils/confessionCard.ts`: Migrado a `await canvas.encode("png")`.
  - `tests/unit/canvas-async-encode.test.cjs`: Suite con 3 pruebas unitarias verificando la cabecera mágica PNG (`89 50 4E 47 0D 0A 1A 0A`), generación asíncrona y erradicación total de llamadas síncronas bloqueantes en `src/`.
- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0).
  - `node --test tests/unit/canvas-async-encode.test.cjs`: 3 pruebas ejecutadas, 3 pasadas (exit 0).
  - `npm test`: 169 pruebas ejecutadas, 169 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `fix(PERF-01): migracion de renderizadores canvas a encode asincrono`

---

## Lote 8: Auditoría y actualización de dependencias (`DEP-01`)

- **Estado:** NO APLICADO / REQUIERE ACCIÓN MANUAL CONTROLADA
- **Análisis y justificación técnica:**
  - Se ejecutó `npm audit --omit=dev` identificando 19 vulnerabilidades en dependencias transitivas (Undici vía discord.js, lodash, mongoose, etc.).
  - Se ejecutó una prueba en modo seco (`npm audit fix --omit=dev --dry-run`). El gestor de paquetes de npm intentó purgar del árbol de dependencias herramientas críticas de compilación y desarrollo (`typescript`, `ts-node`, `nodemon`, `rimraf`).
  - Siguiendo estrictamente las reglas obligatorias del plan de corrección y los límites de `AGENTS.md` (*"Pregunta antes de cambiar dependencias o lockfiles para resolver la instalación"* y *"Si un lote falla y no puedes solucionarlo dentro de su alcance sin riesgos, no descartes ni rompas cambios ajenos"*), no se aplicaron mutaciones al archivo `package-lock.json` para evitar la desinstalación de TypeScript.
- **Acción recomendada para el equipo humano:** Actualizar selectivamente dependencias mayores en una ventana de mantenimiento específica mediante overrides específicos o subiendo a las versiones menores parcheadas de discord.js y mongoose.

---

## Lote 9: Limpieza de modelo huérfano y sincronización de documentación técnica (`DB-01`, `DOC-01`)

- **Estado:** APLICADO
- **Archivos modificados y eliminados:**
  - `src/Database/guild/guildConfig.model.ts`: Eliminado modelo huérfano y redundante (sin ninguna importación en el proyecto), consolidando `ServerConfig` como el único modelo canónico de configuración por servidor.
  - `AGENTS.md`: Corregidas las rutas desincronizadas en la sección de estructura arquitectónica (`loadEnvironment.ts`, `aiModels.ts`, `shutdown.ts`, `spotifyRenderer.worker.ts`), purgando referencias a archivos inexistentes (`env.ts`, `registerGracefulShutdown.ts`, `canvasWorker.ts`, `guildConfig.model.ts`).
  - `tests/unit/docs-db-cleanup.test.cjs`: Suite con 2 pruebas unitarias que verifican la ausencia de `guildConfig.model.ts` y la sincronización estricta de rutas en `AGENTS.md`.
- **Comandos ejecutados y resultados:**
  - `npx tsc --noEmit`: Exitoso (exit 0).
  - `node --test tests/unit/docs-db-cleanup.test.cjs`: 2 pruebas ejecutadas, 2 pasadas (exit 0).
  - `npm test`: 171 pruebas ejecutadas, 171 pasadas, 0 fallidas (exit 0).
  - ESLint: No configurado en el proyecto.
- **Commit:** `fix(DB-01-DOC-01): eliminacion de guildConfig huerfano y sincronizacion de rutas en AGENTS.md`

---

## Resumen Ejecutivo de la Fase de Corrección

| Lote | Defectos | Estado | Commit | Pruebas Unitarias |
|---|---|---|---|---|
| **Lote 0** | `PROTECT-00` (Protección del repositorio) | **APLICADO** | Rama `fix/auditoria` creada sobre `2a0cf6f` | Verificado limpio |
| **Lote 1** | `LIF-01` (Apagado ordenado, cron stop y señales) | **APLICADO** | `c8e4d1b` | 6/6 tests PASS (`lifecycle-shutdown.test.cjs`) |
| **Lote 2** | `OPS-03`, `OPS-04` (Health en 127.0.0.1 y purga de logs) | **APLICADO** | `9c6227f` | 3/3 tests PASS (`ops-health-logs.test.cjs`) |
| **Lote 3** | `AI-01`, `AI-02` (Historial aislado por guild y purga de aiModeration) | **APLICADO** | `4328e50` | 3/3 tests PASS (`ai-conversation-scope.test.cjs`) |
| **Lote 4** | `AI-03` (Modelos oficiales Gemini con env override) | **APLICADO** | `36c977e` | 2/2 tests PASS (`ai-models-centralization.test.cjs`) |
| **Lote 5** | `CMD-02` (Guardas de permisos y jerarquía en moderación) | **APLICADO** | `e46bd9a` | 4/4 tests PASS (`moderation-guards.test.cjs`) |
| **Lote 6** | `DB-02` (Operaciones atómicas de array en tracking) | **APLICADO** | `e706396` | 2/2 tests PASS (`history-atomic-ops.test.cjs`) |
| **Lote 7** | `PERF-01` (Canvas migrado a encode asíncrono no bloqueante) | **APLICADO** | `892760d` | 3/3 tests PASS (`canvas-async-encode.test.cjs`) |
| **Lote 8** | `DEP-01` (Auditoría de vulnerabilidades en dependencias) | **NO APLICADO** | N/A (Preserva herramientas de compilación dev) | Requiere intervención manual controlada |
| **Lote 9** | `DB-01`, `DOC-01` (Eliminación guildConfig y rutas AGENTS.md) | **APLICADO** | `beb4dac` | 2/2 tests PASS (`docs-db-cleanup.test.cjs`) |

### Estado Final del Proyecto:
- **TypeScript (`npx tsc --noEmit`):** 0 errores (Clean).
- **Suite de Pruebas Global (`npm test`):** 171 pruebas ejecutadas, 171 pasadas, 0 fallidas (100% PASS).
- **Rama `master`:** Intacta y preservada.
- **Historial de commits en `fix/auditoria`:** 8 commits estructurados y reversibles individualmente.

