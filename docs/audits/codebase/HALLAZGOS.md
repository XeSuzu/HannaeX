# REPORTE DETALLADO DE HALLAZGOS TÉCNICOS - HANNAEX (RONDA 2)

Catálogo único y reconciliado de **21 hallazgos técnicos** identificados y verificados en la auditoría técnica exhaustiva. Cada hallazgo cuenta con clasificación honesta de estado, evidencia exacta de código y prueba reproducible.

---

### [SEC-01] Volcados completos de base de datos de producción en texto plano sin cifrar en disco

- **Severidad:** CRÍTICA
- **Estado:** CONFIRMADO
- **Dónde:** Directorio `backups/production-KissDataBase-2026-10-17T02-05-51-440Z/` en la raíz del proyecto.
- **Evidencia:**
  ```bash
  $ ls -lh backups/production-KissDataBase-2026-10-17T02-05-51-440Z/
  total 11.8M
  -rw------- 1 hanna hanna 4.1M Oct 16 21:05 avatarhistories.json
  -rw------- 1 hanna hanna  10K Oct 16 21:06 confessions.json
  -rw------- 1 hanna hanna 623B Oct 16 21:06 conversations.json
  -rw------- 1 hanna hanna  27K Oct 16 21:06 serverconfigs.json
  -rw------- 1 hanna hanna 6.8M Oct 16 21:06 userhistories.json
  -rw------- 1 hanna hanna 8.4K Oct 16 21:06 usermemories.json
  -rw------- 1 hanna hanna  17K Oct 16 21:06 warnings.json
  ```
- **Por qué importa:** En el sistema de archivos del servidor residen 11.8 MB de datos personales y de moderación reales de producción: confesiones, historial completo de avatares, nombres de usuario, advertencias y memorias de IA. Aunque `.gitignore` evita que se commiteen a git, cualquier lectura no autorizada o respaldo comprimido de la carpeta expondría los datos personales de todos los usuarios (violación de GDPR y de las Políticas de Desarrolladores de Discord).
- **Fix mínimo sugerido:** Mover los respaldos fuera del árbol de trabajo a un almacenamiento seguro y cifrado en reposo (ej. volumen aislado con permisos `0700` restringido a root o cold storage cifrado con GPG). No almacenar volcados JSON en texto plano en la máquina de producción.
- **Esfuerzo:** BAJO (15-30 minutos).
- **Riesgo del fix:** BAJO.

---

### [SEC-02] URI con credenciales reales de MongoDB expuesta en historial de Git

- **Severidad:** CRÍTICA
- **Estado:** CONFIRMADO
- **Dónde:** Commits históricos en Git:
  - `f71c79295e8f1ca585f36ff7849fb98626f21558:migrar-meme.js:6`
  - `fa5341b7fda407f6cc9b8e13259e31376fa1b220:src/scripts/migrar-meme.js:6`
- **Evidencia:**
  Se inspeccionó la línea 6 del commit `f71c79295e8f1ca585f36ff7849fb98626f21558:migrar-meme.js`:
  - Contiene una URI `mongodb+srv://` dirigida al cluster MongoDB Atlas `kissdatabase.apzliex.mongodb.net`.
  - Se confirmó que el usuario (`AmyXs`) y la contraseña alfanumérica de 16 caracteres corresponden a **credenciales reales en producción y NO a un placeholder** (no contiene `<password>`, `your_password` ni valores plantilla).
- **Por qué importa:** Cualquier persona con acceso de lectura al historial de Git dispone del control administrativo sobre la base de datos de producción.
- **Fix mínimo sugerido:** Rotar de inmediato la contraseña del usuario de MongoDB en MongoDB Atlas. Purgar el historial de Git utilizando herramientas como `git-filter-repo` si el repositorio se comparte o publica.
- **Esfuerzo:** MEDIO (rotar contraseñas en Atlas toma 15 minutos; reescribir historial de Git requiere coordinar con el equipo).
- **Riesgo del fix:** MEDIO (requiere actualizar `.env.production` y reiniciar servicios).

---

### [DEP-01] Dependencias de producción vulnerables reportadas por auditoría de seguridad

- **Severidad:** ALTA
- **Estado:** CONFIRMADO
- **Dónde:** `package.json:29-45`, `package-lock.json`
- **Evidencia:**
  ```bash
  $ npm audit --omit=dev
  19 vulnerabilities (1 low, 4 moderate, 13 high, 1 critical)
  - CRITICAL: proxy-addr (1.1.0 - 2.0.7): IP spoofing via IPv4-mapped IPv6 trust subnet (GHSA-jqcg-44mw-7w3h)
  - HIGH: basic-ftp, braces, ip-address, js-yaml, lodash, path-to-regexp, picomatch, undici (múltiples GHSA en discord.js / @discordjs/rest)
  - MODERATE: mongoose (8.0.0 - 8.24.0): Prototype pollution via __proto__ (GHSA-664h-wqgq-64gw)
  ```
- **Por qué importa:** `proxy-addr` permite suplantación de IP en subredes IPv6; `undici` contiene fallos de DoS y desincronización HTTP; `mongoose` 8.17.1 contiene un vector de Prototype Pollution.
- **Fix mínimo sugerido:** Ejecutar `npm audit fix --omit=dev` para parches menores y evaluar actualización controlada de `mongoose` a versión parcheada `8.24.1+`.
- **Esfuerzo:** BAJO (1 hora de verificación tras actualizar).
- **Riesgo del fix:** BAJO a MEDIO (requiere correr suite de pruebas `npm test`).

---

### [OPS-01] Configuración PM2 errónea con directorio de trabajo inválido (`/root/HannaeX`) y ausencia de `kill_timeout`

- **Severidad:** ALTA
- **Estado:** CONFIRMADO (Ruta inválida en configuración) / PROBABLE (Matanza abrupta por SIGKILL bajo carga)
- **Dónde:** `ecosystem.config.js:11,23,39`
- **Evidencia:**
  ```javascript
  // ecosystem.config.js:11,23,39
  module.exports = {
    apps: [
      { name: "Hoshiko-Staging", cwd: "/root/HannaeX", ... },
      { name: "hoshiko-bot", cwd: "/root/HannaeX", ... },
      { name: "hoshiko-worker", cwd: "/root/HannaeX", ... },
    ]
  };
  ```
- **Por qué importa:**
  1. En esta VM el usuario es `hanna` y el directorio de trabajo es `/home/hanna/HannaeX`. Si PM2 se inicia bajo el usuario `hanna`, fallará al intentar acceder a `/root/HannaeX`.
  2. No se define `kill_timeout`. El valor predeterminado de PM2 es `1600ms` (1.6s). Si las operaciones de cierre de Mongo, Redis y Discord demoran más de 1.6s, PM2 mata el proceso con `SIGKILL`, corrompiendo buffers en tránsito.
- **Fix mínimo sugerido:** Cambiar `cwd` a `__dirname` o eliminar la propiedad `cwd` para usar la carpeta actual, y añadir `kill_timeout: 10000` en los perfiles.
- **Esfuerzo:** BAJO (5 minutos).
- **Riesgo del fix:** BAJO.

---

### [OPS-02] Proceso `hoshiko-worker` deshabilitado por configuración con `autorestart: false`

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO
- **Dónde:** `ecosystem.config.js:43,50-51`, `src/worker.ts:6-12`
- **Evidencia:**
  ```javascript
  // ecosystem.config.js:43,50-51
  {
    name: "hoshiko-worker",
    autorestart: false,
    env: {
      NODE_ENV: "production",
      WORKER_ENABLED: "false",
      REDIS_ENABLED: "false",
    },
  }
  ```
  ```typescript
  // src/worker.ts:6-12
  if (!config.WORKER_ENABLED) {
    console.log("[Worker] Worker disabled by configuration; no infrastructure connections were started.");
    process.exitCode = 0;
    return;
  }
  ```
- **Por qué importa:** Al arrancar con PM2, `hoshiko-worker` lee `WORKER_ENABLED: "false"`, termina con código 0 y queda en estado detenido. Toda la infraestructura BullMQ está inactiva. Si se activa `WORKER_ENABLED="true"` sin cambiar `autorestart: false`, PM2 nunca recuperará el proceso ante una caída.
- **Fix mínimo sugerido:** Si no se usan colas en producción, eliminar temporalmente `hoshiko-worker` de PM2. Si se activará, configurar `WORKER_ENABLED: "true"`, `REDIS_ENABLED: "true"` y `autorestart: true`.
- **Esfuerzo:** BAJO (10 minutos).
- **Riesgo del fix:** BAJO.

---

### [OPS-03] Servidor HTTP de salud escuchando en todas las interfaces públicas (`0.0.0.0`)

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO
- **Dónde:** `src/http/healthServer.ts:64`
- **Evidencia:**
  ```typescript
  // src/http/healthServer.ts:64
  server = app.listen(port, () => {
    console.log(`[Health] health server active on port ${port}`);
  });
  ```
- **Por qué importa:** Al no especificar host, Express se enlaza a `0.0.0.0`. Si el puerto 8080 está abierto en el cortafuegos, cualquier atacante externo puede consultar `/healthz/ready` y conocer el estado interno de conectividad a MongoDB y Redis.
- **Fix mínimo sugerido:** Enlazar a localhost: `app.listen(port, "127.0.0.1", ...)`.
- **Esfuerzo:** BAJO (5 minutos).
- **Riesgo del fix:** BAJO.

---

### [OPS-04] Almacenamiento local de logs en `.jsonl` sin política de retención ni purga automática

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Security/Logger/LocalStorage.ts:21-36`
- **Evidencia:**
  ```typescript
  // src/Security/Logger/LocalStorage.ts:21-36
  const today = new Date().toISOString().slice(0, 10);
  const filePath = path.join(LOG_DIR, `hoshiko-${today}.jsonl`);
  this.stream = fs.createWriteStream(filePath, { flags: "a", encoding: "utf8" });
  ```
- **Por qué importa:** `LocalStorage` crea un nuevo archivo de log por cada día transcurrido pero carece de rutina de limpieza. Con el tiempo, acumulará registros hasta saturar el almacenamiento de la VM de 4GB.
- **Fix mínimo sugerido:** Agregar una rutina semanal en `cronJobs.ts` que elimine archivos en `logs/` con más de 14 o 30 días de antigüedad.
- **Esfuerzo:** BAJO (20 minutos).
- **Riesgo del fix:** BAJO.

---

### [LIF-01] Apagado bloqueado por 5s artificiales tras finalizar la limpieza por timer no limpiado

- **Severidad:** ALTA
- **Estado:** CONFIRMADO (Reproducido empíricamente)
- **Dónde:** `src/lifecycle/shutdown.ts:12-28`, `src/App/bootstrap/ShutdownService.ts:5-84`
- **Evidencia:**
  Se ejecutó un subproceso instalando `installShutdownHandlers` y enviándole `SIGINT`.
  ```bash
  READY
  [TEST] Sending SIGINT now...
  [2026-10-23T02:42:07.830Z] [WARN] [System/Shutdown]: Signal SIGINT received...
  [MOCK] client destroyed
  [MOCK] health closed
  [2026-10-23T02:42:07.875Z] [INFO] [System/Shutdown]: Shutdown sequence complete.
  [KillSwitch] Forzando cierre tras 5s.
  SIGINT_to_exit: 5.026s
  ```
  La limpieza terminó en **45 milisegundos**, pero el proceso quedó colgado durante **5.026 segundos** esperando a que disparase el `setTimeout(..., 5000)` del killswitch.
- **Por qué importa:**
  1. `ShutdownService.shutdown` no invoca `process.exit(0)` al terminar exitosamente.
  2. Como `cronJobs.ts` tiene timers activos de `node-cron`, el bucle de eventos no se vacía y el proceso se queda congelado exactamente 5 segundos.
  3. En PM2, cuyo `kill_timeout` por defecto es 1.6s, PM2 envía `SIGKILL` antes de que el proceso termine de salir por sí mismo.
- **Fix mínimo sugerido:** Limpiar los cron jobs al apagar, y al resolverse `ShutdownService.shutdown(...)`, llamar a `process.exit(0)` de inmediato y limpiar el temporizador del killswitch con `clearTimeout()`.
- **Esfuerzo:** BAJO (20 minutos).
- **Riesgo del fix:** BAJO.

---

### [LIF-02] Manejador `uncaughtException` silencia excepciones fatales sin reiniciar el proceso

- **Severidad:** ALTA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Utils/antiCrash.ts:148-150`
- **Evidencia:**
  ```typescript
  // src/Utils/antiCrash.ts:148-150
  process.on("uncaughtException", (error: Error, _origin: unknown) => {
    sendErrorLog("Uncaught Exception", error);
  });
  ```
- **Por qué importa:** En Node.js, `uncaughtException` deja la aplicación en un estado no determinista. Silenciar el error enviando un log sin terminar con `process.exit(1)` provoca que la aplicación siga operando en un estado potencialmente corrupto.
- **Fix mínimo sugerido:** Despachar el webhook y terminar inmediatamente con `process.exit(1)` para que PM2 reinicie una instancia limpia.
- **Esfuerzo:** BAJO (15 minutos).
- **Riesgo del fix:** BAJO a MEDIO.

---

### [CMD-01] Comandos de prefijo registrados en `client.commands` nunca son despachados en `messageCreate`

- **Severidad:** ALTA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Events/Client/messageCreate.ts:346-375`, `src/Handlers/cmdHandler.ts:15-40`
- **Evidencia:**
  ```typescript
  // src/Events/Client/messageCreate.ts:356-375
  if (commandName === "snipe") { await handleTextMessageSnipe(message, args); return; }
  if (commandName === "afk") { await handleTextMessageAfk(message, args); return; }
  if (commandName === "ximg" || isCommandPassthrough(commandName)) { isHoshiCall = true; }
  else if (prefixIsHoshi) { ... isHoshiCall = true; }
  // NUNCA se busca en client.commands.get(commandName)
  ```
- **Por qué importa:** Comandos de prefijo clásicos como `ping`, `say`, `translate`, `userinfo` y `prefix` cargados en `client.commands` están 100% inoperativos y muertos.
- **Fix mínimo sugerido:** En `messageCreate.ts`, despachar `const cmd = client.commands.get(commandName); if (cmd) { await cmd.execute(message, args, client); return; }`.
- **Esfuerzo:** BAJO (15 minutos).
- **Riesgo del fix:** BAJO.

---

### [CMD-02] Comandos de moderación sin validación interna de permisos ni jerarquía de roles

- **Severidad:** ALTA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Commands/SlashCmds/Moderation/*` (`ban.ts`, `kick.ts`, `tempmute.ts`, `Mute.ts`, `softban.ts`, `tempban.ts`, `mass-ban.ts`, `purge.ts`)
- **Evidencia:**
  La inspección exhaustiva de todos los comandos de moderación demuestra que:
  1. Ningún comando slash utiliza la propiedad `adminOnly`.
  2. Todos los comandos disciplinarios delegan su seguridad **exclusivamente a Discord Gateway** mediante `.setDefaultMemberPermissions(...)`.
  3. En la ejecución del comando (`execute`), los checks `member.permissions.has(...)` comprueban al usuario objetivo (`target`), pero **NUNCA verifican los permisos internos del moderador invocador**.
  4. Ningún comando (excepto mass-role para el bot) valida la jerarquía de roles entre el moderador y el objetivo (`interaction.member.roles.highest.position > target.roles.highest.position`).
- **Por qué importa:** Si un administrador del servidor configura una anulación de comando en Ajustes del Servidor $\rightarrow$ Integraciones, usuarios sin permisos reales de baneo pueden ejecutar el comando, y moderadores de menor rango pueden sancionar a roles superiores.
- **Fix mínimo sugerido:** Validar explícitamente `interaction.memberPermissions.has(...)` y comprobar la jerarquía relativa de roles antes de ejecutar la acción disciplinaria.
- **Esfuerzo:** MEDIO (1-2 horas en los comandos de moderación).
- **Riesgo del fix:** BAJO.

---

### [DB-01] Modelo `GuildConfig` huérfano y duplicado sin importación en `src/`

- **Severidad:** BAJA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Database/guild/guildConfig.model.ts:1-48`
- **Evidencia:** `grep -rn "guildConfig" src/` arrojó 0 importaciones en el resto del proyecto (`ServerConfig` tiene 29 importaciones).
- **Por qué importa:** Genera confusión sobre cuál es el modelo canónico.
- **Fix mínimo sugerido:** Eliminar `src/Database/guild/guildConfig.model.ts`.
- **Esfuerzo:** BAJO (5 minutos).
- **Riesgo del fix:** BAJO.

---

### [DB-02] Operaciones de array no atómicas con riesgo de `VersionError` bajo concurrencia

- **Severidad:** MEDIA
- **Estado:** PROBABLE (Bajo concurrencia de eventos)
- **Dónde:** `src/Database/tracking/UserHistoryManager.ts:12-39`, `src/Database/tracking/AvatarHistoryManager.ts:17-46`
- **Evidencia:**
  1. `UserHistoryManager` y `AvatarHistoryManager` leen con `findOne`, hacen `unshift` en JavaScript y guardan con `save()`.
  2. Mongoose mantiene activo el control de versiones por defecto (`__v`). Si dos eventos simultáneos (`userUpdate`, `guildMemberUpdate`) modifican el mismo usuario concurrentemente, el segundo `save()` no sobreescribe silenciosamente: **arroja una excepción `VersionError: No matching document found`**.
  3. Medición empírica en `backups/`: El documento máximo en `userhistories.json` pesa **19,245 bytes (18.79 KB)** (promedio: 4.51 KB). En `avatarhistories.json` el documento máximo pesa **10,240 bytes (10.00 KB)** (promedio: 3.15 KB).
- **Por qué importa:** Las colisiones concurrentes provocan excepciones no capturadas (`VersionError`) que abortan el evento de actualización de historial.
- **Fix mínimo sugerido:** Migrar a `UserHistory.updateOne({ userId }, { $push: { records: { $each: [rec], $position: 0, $slice: 40 } } }, { upsert: true })`.
- **Esfuerzo:** MEDIO (1 hora).
- **Riesgo del fix:** BAJO.

---

### [AI-01] Historial conversacional de IA indexado solo por `userId` sin aislamiento por servidor

- **Severidad:** ALTA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Database/ai/conversation.model.ts:30-36`
- **Evidencia:**
  ```typescript
  // src/Database/ai/conversation.model.ts:29-35
  const conversationSchema = new Schema<IConversation>({
    userId: { type: String, required: true, unique: true, index: true },
    history: [...],
  ```
- **Por qué importa:** El historial de Gemini se almacena únicamente por `userId`. Si un usuario habla en un servidor privado y luego interactúa en un servidor público, Hoshiko conserva y puede hacer referencia al contexto del servidor privado, provocando fugas de privacidad entre servidores.
- **Fix mínimo sugerido:** Cambiar el índice a compuesto `{ userId: 1, guildId: 1 }` aislando los turnos por servidor.
- **Esfuerzo:** MEDIO (2 horas).
- **Riesgo del fix:** MEDIO.

---

### [AI-02] 180 líneas de código muerto vestigial de moderación con IA en `aiModeration.ts`

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Features/automod/aiModeration.ts:90-271`
- **Evidencia:** `grep -rn "flushGuildModBatch" src/` demuestra que la función no es invocada en ninguna parte.
- **Por qué importa:** Contiene un mute automático vestigial (`applyVerdict`) que entra en conflicto con la regla "La IA nunca debe sancionar sola" e induce a error sobre el flujo real que opera en `aiJudge.ts`.
- **Fix mínimo sugerido:** Eliminar las líneas 90 a 271 de `src/Features/automod/aiModeration.ts`.
- **Esfuerzo:** BAJO (10 minutos).
- **Riesgo del fix:** BAJO.

---

### [AI-03] Nombres de modelo `gemini-2.5-flash-lite` y `gemini-2.5-flash` no estándar en API de Google

- **Severidad:** MEDIA
- **Estado:** PROBABLE (Fallo en llamadas reales si la API rechaza el modelo)
- **Dónde:** `src/Services/gemini.ts:132,205`, `src/Services/translationService.ts:25`, `src/Features/automod/aiJudge.ts:578`
- **Evidencia:**
  En todo el código de IA se utiliza como identificador del modelo `"gemini-2.5-flash-lite"` o `"gemini-2.5-flash"`. En la documentación pública de Google Gemini los modelos oficiales son `gemini-2.0-flash` y `gemini-2.0-flash-lite`.
- **Por qué importa:** Si la API de Google Gemini no reconoce la denominación `2.5`, arrojará un error `404 models/gemini-2.5-flash-lite is not found`.
- **Fix mínimo sugerido:** Cambiar la referencia al modelo oficial `gemini-2.0-flash` o `gemini-2.0-flash-lite` en `gemini.ts` y `aiJudge.ts`.
- **Esfuerzo:** BAJO (10 minutos).
- **Riesgo del fix:** BAJO.

---

### [PERF-01] Renderizado masivo de Canvas síncrono (`toBuffer`) en hilo principal sin `loadShedding`

- **Severidad:** ALTA
- **Estado:** PROBABLE (Bajo ráfagas de comandos visuales concurrentes)
- **Dónde:** `src/Services/CardService.ts:162`, `src/Commands/SlashCmds/Canvas/post-twitter.ts:153`, `src/Commands/SlashCmds/Canvas/instaRenderer.ts:143`, `src/Commands/SlashCmds/Information/avatars.ts:241`, `src/Renderers/spotifyRenderer.ts:287`, `src/Renderers/robloxRenderer.ts:194`, `src/Utils/levelBanners/*.ts`, `src/Utils/confessionCard.ts:155`
- **Evidencia:**
  1. De los 10 módulos de renderizado Canvas en el proyecto, **8 exportan con `.toBuffer("image/png")` síncrono** directamente en el hilo principal del Event Loop. Solo `match.ts` y `ship.ts` usan `await canvas.encode("png")` asíncrono.
  2. **Ninguno de los 10 renderers pasa por `isOverloaded()` (loadShedding)**.
  3. Medición empírica en la VM: Cargar `@napi-rs/canvas` incrementa el RSS de **51.18 MB a 171.61 MB (+120.43 MB)**. Renderizar 5 canvas incrementa el RSS a **187.41 MB**.
- **Por qué importa:** En una máquina virtual de 2 CPUs, ráfagas simultáneas de comandos visuales bloquearán el Event Loop de Node por cientos de milisegundos, provocando timeouts de Gateway y error `10062 Unknown interaction`.
- **Fix mínimo sugerido:** Migrar los renderers síncronos a `.encode("png")` o delegarlos a un pool de workers, y aplicar `isOverloaded()` antes de iniciar el dibujo.
- **Esfuerzo:** ALTO (1 a 2 días).
- **Riesgo del fix:** MEDIO.

---

### [PERF-02] Spawn incondicional de nuevo Worker Thread por cada petición sin pool en `/activity`

- **Severidad:** ALTA
- **Estado:** PROBABLE (Bajo ráfagas concurrentes de `/activity`)
- **Dónde:** `src/Commands/SlashCmds/Information/activity.ts:41-57`
- **Evidencia:**
  1. `renderInWorker` instancia `new Worker(join(__dirname, "../../../workers/spotifyRenderer.worker.js"))` en cada llamada.
  2. Medición empírica en la VM: Un Worker recién instanciado consume **180.06 MB de RSS**.
  3. En modo desarrollo (`ts-node`), `spotifyRenderer.worker.js` no existe (solo existe `.ts`), arrojando `MODULE_NOT_FOUND`.
- **Por qué importa:** Instanciar un Worker V8 por cada invocación destruye la ventaja de rendimiento y genera picos masivos de CPU y memoria que amenazan con disparar el OOM Killer en una máquina de 4 GB.
- **Fix mínimo sugerido:** Implementar un worker pool estático de 1 hilo persistente para renderizado.
- **Esfuerzo:** MEDIO (3 horas).
- **Riesgo del fix:** BAJO.

---

### [LEG-01] Términos de Servicio y Política de Privacidad no publicados (plantillas con TODOs)

- **Severidad:** ALTA
- **Estado:** CONFIRMADO
- **Dónde:** `Licenses/PRIVACY.md:1-48`, `Licenses/TERMS.md:1-61`
- **Evidencia:** Ambos archivos consisten en borradores repletos de etiquetas `[TODO: VALIDAR fecha...]`, `[TODO: VALIDAR responsable...]`.
- **Por qué importa:** Discord Developer Policy exige términos y política de privacidad públicos y vigentes para bots que retienen datos de usuario. Operar sin ellos pone en riesgo la verificación del bot.
- **Fix mínimo sugerido:** Reemplazar los placeholders por las prácticas reales verificadas y enlazarlos en el portal de Discord.
- **Esfuerzo:** MEDIO (2 horas).
- **Riesgo del fix:** BAJO.

---

### [DOC-01] Desincronización crítica de documentación técnica (`AGENTS.md`) con la estructura real del proyecto

- **Severidad:** BAJA
- **Estado:** CONFIRMADO
- **Dónde:** `AGENTS.md:14,21`
- **Evidencia:**
  - `AGENTS.md` lista `src/config/env.ts` (en disco es `loadEnvironment.ts`).
  - `AGENTS.md` lista `canvasWorker.ts` y `statCardWorker.ts` en `src/workers/` (no existen).
- **Por qué importa:** Induce a error y alucinaciones en agentes automáticos y nuevos desarrolladores.
- **Fix mínimo sugerido:** Actualizar `AGENTS.md` con las rutas y archivos reales.
- **Esfuerzo:** BAJO (10 minutos).
- **Riesgo del fix:** BAJO.

---

### [CODE-01] Identificadores de usuarios y URL externa de imagen frágil hardcodeados en `info-creator.ts`

- **Severidad:** BAJA
- **Estado:** CONFIRMADO
- **Dónde:** `src/Commands/SlashCmds/Information/info-creator.ts:29-44,149`
- **Evidencia:**
  - IDs de usuarios hardcodeadas en array `CONTRIBUTORS`: `"1031006071411724308"`, `"798965856204750898"`.
  - URL de imagen en Pinterest fija en código: `https://i.pinimg.com/originals/2f/43/76/2f437614d7fa7239696a8b34d5e41769.gif`.
- **Por qué importa:** Si Pinterest cambia o bloquea el CDN, la imagen se rompe en Discord. Las IDs deben residir en configuración o base de datos.
- **Fix mínimo sugerido:** Parametrizar la URL por variable de entorno o asset local en `src/assets/`.
- **Esfuerzo:** BAJO (10 minutos).
- **Riesgo del fix:** BAJO.
