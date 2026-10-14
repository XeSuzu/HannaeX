# Plan de estabilización — HannaeX (rama `refactor/arquitectura`)

Objetivo: dejar la rama estable y verificable, destrabar la creación de comandos nuevos y no desplegar nada a producción sin pasar por el servidor de pruebas.

## Cómo usar este archivo (para Claude Code)

- Ejecuta las tareas en orden, **una por commit**. Marca la casilla al terminar.
- Las tareas `[HUMANO]` las hace Amy. No las simules ni las saltes: detente y pide el resultado.
- Detente en cada **Checkpoint** y espera revisión antes de seguir.
- Mensaje de commit: `fase-N/tarea-X: descripción corta`.
- Si una verificación falla dos veces seguidas, para y reporta. No sigas parchando.
- Si algo del plan contradice lo que encuentras en el código, **reporta la diferencia** en vez de adaptarte en silencio.

## Reglas duras

1. Trabaja solo en `refactor/arquitectura`. No toques `master`, no hagas merge ni push forzado.
2. No leas ni modifiques `.env*`. No ejecutes el bot con credenciales reales (`npm run dev`, `npm start`). No ejecutes comandos `pm2`, Docker ni despliegues.
3. Tras cada tarea deben pasar `npx tsc --noEmit` y `npm run build`, y desde T1.3 también `npm test`. Sin los tres en verde no hay commit.
4. Pide confirmación antes de: cambiar `dependencies` o el lockfile, cambiar el esquema de un modelo Mongoose, borrar archivos que no estén listados en una tarea.
5. Preserva el comportamiento observable salvo donde la tarea diga lo contrario. Divide por responsabilidad, nunca por número de líneas, y no crees helpers solo para acortar una función.
6. Estas reglas reemplazan el límite de `AGENTS.md` ("No modificar Commands/, Events/…"): las fases 3 y 5 los tocan a propósito. Actualiza `AGENTS.md` en T1.5.

## Contexto verificado (rama en el commit `1387d8b`, 13-oct-2026)

- **Producción corre `master` (`ea2abdc`)** y no tiene nada de esta rama: ni Redis, ni BullMQ, ni worker, ni el refactor. En `master`, `tempban` y `tempmute` usan `setTimeout` (se pierden al reiniciar). Esta rama es solo de mejora y no se ha desplegado.
- Línea base: `npm ci`, `npx tsc --noEmit` y `npm run build` pasan. Los 24 tests existentes pasan (22 del harness de moderación y 2 de `loadHandlers`), pero **no existe el script `npm test`**.
- **Redis/BullMQ es andamiaje dormido a propósito.** `bullmq` no se importa en ningún archivo, `QueueRegistry` está vacío y `worker.ts` arranca y queda en `idle`. Se conserva para uso futuro: no conectar, no borrar, flags en `false`.
- **Moderación temporal:** `src/Services/TempModerationService.ts` y `src/Models/TempModeration.ts` son nuevos en esta rama y ya están conectados a `tempban`, `tempmute` y al cron (cada minuto). El harness de `src/Services/temp-moderation/` no lo llama nadie fuera de los tests y usa otro esquema (`moderationType`, `status`, `revision`, `leaseToken`) que el modelo vivo (`tipo`).
- Defecto del servicio vivo: un registro que falla nunca se descarta. El cron toma los 100 más viejos por `expiresAt`, así que 100 registros atascados bloquean a los nuevos.
- `ecosystem.config.js` declara `hoshiko-bot` con `cwd: /root/HannaeX`. Según `docs/operations/temp-moderation-harness-todo.md`, producción real es el proceso `Hoshiko-Production` en `/home/hanna/apps/HannaeX`.
- Por mensaje, en un servidor con niveles activos, hay al menos 4 lecturas a Mongo: `SettingsManager.getLite` (ignora `CacheManager`), `LevelConfig.findOne` (sin `lean` ni caché), `LocalLevel.findOne` y `GlobalLevel.findOne`.
- `src/Events/Client/interactionCreate.ts` difiere (`deferReply`) todo comando salvo la lista fija `["sugerencia", "report", "racha"]`, y evalúa el cooldown **después** del defer.

---

## Fase 0 — Respaldo (sin cambios de código)

- [ ] **T0.1 [HUMANO]** `git tag refactor-base` en la rama y `git push origin refactor-base`.
- [ ] **T0.2 [HUMANO]** En la VM, solo lectura: `pm2 status`, `which pm2` y la ruta real de la app. Pásale los resultados a Claude Code.
- [ ] **T0.3 [HUMANO]** `mongodump` de la base de producción antes de cualquier cambio de modelo.
- [ ] **T0.4 [HUMANO]** Crear (o confirmar) un bot de pruebas con **otro token** y un servidor de prueba. Nunca dos procesos con el mismo token.

---

## Fase 1 — Limpieza (sin cambiar comportamiento)

- [x] **T1.1 Worker dormido y PM2 alineado.** En `ecosystem.config.js`, `autorestart: false` en `hoshiko-worker`. Con los datos de T0.2, alinear nombre, `cwd` y rutas de log de `hoshiko-bot` con producción real. *(parcial: `autorestart: false` hecho; alineación pendiente de T0.2)*
  - Aceptación: `node -e "require('./ecosystem.config.js')"` carga sin error; el worker conserva `WORKER_ENABLED: "false"` y `REDIS_ENABLED: "false"`.
  - Depende de: T0.2 (la parte de alineación).
- [x] **T1.2 Borrar duplicados huérfanos.** `src/App/bootstrap/AppBootstrap.ts` y `src/App/bootstrap/HealthServer.ts`. Antes de borrar, `grep -rn` para confirmar que nada los importa. **No borrar** `ShutdownService.ts` (lo usa `src/lifecycle/shutdown.ts`) ni `LocalCacheService.ts` (se conserva como base).
  - Aceptación: `tsc` y build pasan; el endpoint `/healthz` sigue definido solo en `src/http/healthServer.ts`.
- [x] **T1.3 Script `npm test`.** Debe: ejecutar `npm run build`; compilar a un directorio temporal en CommonJS `src/Services/temp-moderation/TempModerationProcessor.ts`, `src/Services/temp-moderation/adapters/MongoTempModerationRepository.ts` y `tests/support/*.ts`; y correr `node --test` sobre `tests/unit/*.test.cjs` con `TEMP_MODERATION_TEST_BUILD_DIR=<tmp>` y `HANDLER_TEST_BUILD_DIR=<repo>/dist`.
  - Referencia que funciona: `npx tsc --outDir <tmp> --rootDir . --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --strict <archivos>`.
  - Nota: `node --test tests/unit` (pasando el directorio) falla; pasar los archivos.
  - Aceptación: `npm test` termina con código 0 y reporta **24 pasan, 0 fallan**; sale con código distinto de 0 si un test falla.
- [x] **T1.4 Separar `Tests/` de `tests/`.** `git mv Tests scripts-manuales` y actualizar toda referencia (`grep -rn "Tests/"`). Hoy ambos directorios están versionados y colisionan en sistemas con archivos sin distinción de mayúsculas.
  - Aceptación: no existe `Tests/`; `tests/` queda solo con `unit/` y `support/`.
- [x] **T1.5 Corregir documentación.**
  - `AGENTS.md`: `npm ci` ya funciona; añadir el comando `npm test`; actualizar la sección Estructura (incluye `src/App/`, `tests/`, `scripts-manuales/`); quitar el límite sobre `Commands/` y `Events/`.
  - `docs/operations/temp-moderation-harness-todo.md`: la línea "El sistema productivo actual ya persiste vencimientos en MongoDB…" es falsa para `master`; reescribir diciendo que `TempModerationService` y el modelo son nuevos en esta rama. Corregir también "Fuera de alcance realizado" (el commit `a6d99f7` creó ambos archivos y conectó `tempban`/`tempmute`).
  - `docs/operations/deployment-processes.md`: el párrafo de Docker dice que el worker conecta a Mongo antes de comprobar `WORKER_ENABLED`; el código comprueba primero.
  - Aceptación: ningún documento contradice lo listado en "Contexto verificado".
- [x] **T1.6 Higiene del repositorio.** Añadir a `.gitignore` `Hoshiko Or Later/.obsidian/` y `tsconfig.tsbuildinfo`, y sacarlos del índice con `git rm -r --cached`. Leer `test-timeout.js` (raíz): si es un script manual, moverlo a `scripts-manuales/`; si parece un residuo, **preguntar** antes de borrarlo. Las notas `.md` del vault se conservan.
  - Aceptación: `git status` limpio tras un `npm run build`; el build no vuelve a ensuciar `tsconfig.tsbuildinfo`.
- [ ] **T1.7 [HUMANO + confirmación] Dependencias.** Amy confirma si `pm2` existe global en la VM (T0.2). Si es así, y con su aprobación: quitar `pm2` de `dependencies`, `npm install` para regenerar el lockfile y subir `axios` a una versión sin la vulnerabilidad alta. Registrar el resultado de `npm audit --omit=dev`.
  - Línea base: 22 vulnerabilidades en producción (1 crítica, 15 altas, 5 moderadas, 1 baja); `axios` y `pm2` son dependencias directas con severidad alta.
  - Aceptación: `npm ci`, `tsc`, build y tests pasan; el audit no empeora.

### Checkpoint A
- [ ] `npm ci`, `npx tsc --noEmit`, `npm run build` y `npm test` en verde.
- [ ] **Revisión de Amy antes de seguir.**

---

## Fase 2 — Caché en RAM (sin Redis)

- [x] **T2.1 `getLite` usa el caché.** En `src/Database/SettingsManager.ts`, que `getLite` lea de `CacheManager` (`src/Database/CacheManager.ts`, TTL de 5 minutos) en vez de ir a Mongo cada vez. Antes, verificar qué devuelve `CacheManager.get` (¿documento Mongoose o `lean`?): los consumidores de `getLite` (`messageCreate` e `interactionCreate`) esperan un objeto plano con los campos pedidos.
  - Buscar con `grep` escrituras a `ServerConfig` que no pasen por `SettingsManager`/`CacheManager`; enrutarlas por la invalidación o reportarlas.
  - Aceptación: mismo formato de retorno para los consumidores; después de `updateSettings`, la siguiente lectura ve el cambio.
- [ ] **T2.2 Caché de `LevelConfig`.** En `src/Features/leveling/textXp.ts`, leer `LevelConfig` con `.lean()` a través de un `LRUCache` (`lru-cache` ya es dependencia) con TTL corto (propuesto: 60 s). Invalidar la entrada en **cada** sitio que escribe `LevelConfig` (`grep -rn "LevelConfig" src`; los flujos de `src/Commands/SlashCmds/Levels/setup-levels/` y `level-roles.ts` son candidatos, verificar).
  - Aceptación: un cambio hecho con `/setup-levels` se refleja en el siguiente mensaje sin esperar el TTL; la lógica de XP no cambia.
- [ ] **T2.3 [HUMANO] Medición.** En el bot de pruebas, con `mongoose.set('debug', true)` solo en desarrollo, contar las consultas a Mongo por mensaje antes y después de T2.1/T2.2. Anotar el resultado en `docs/operations/medicion-cache.md`.

### Checkpoint
- [ ] Gates en verde y prueba manual en el servidor de pruebas: cambiar la config de niveles y comprobar que se aplica.

---

## Fase 3 — Router de interacciones

- [ ] **T3.1 Defer por propiedad y cooldown antes del defer.** En `src/Events/Client/interactionCreate.ts`:
  - Si `cmd.defer === false` (o `cmd.options?.defer === false`), no diferir. Añadir la propiedad opcional a la interfaz en `src/Interfaces/Command.ts`. Mantener la lista fija como respaldo mientras se migra.
  - Mover la comprobación de cooldown **antes** de `deferReply`; al disparar, responder con `reply` efímero (hoy el mensaje se edita sobre un defer público y lo ve todo el canal).
  - Mantener el `InteractionLock` donde está (protege contra procesos duplicados).
  - Aceptación: `timestamps.set` solo ocurre si el comando procede; el resto del flujo no cambia.
- [ ] **T3.2 Migrar y borrar la lista.** Añadir `defer: false` a los comandos `sugerencia`, `report` y `racha` (localizarlos por `setName`), y borrar el array `commandsWithModals`.
  - Aceptación: `grep -rn commandsWithModals src` no devuelve nada.
  - **[HUMANO]** En el bot de pruebas: abrir los tres modales y provocar un cooldown en un comando público (el aviso debe ser efímero).

### Checkpoint B — listo para crear comandos nuevos
- [ ] Gates en verde y pruebas manuales de T3.2 hechas.
- [ ] A partir de aquí se pueden crear comandos nuevos en paralelo con las fases siguientes. Un comando que toque `tempban` o `tempmute` espera a la Fase 4. Un comando con modal declara `defer: false` en su propio archivo.

---

## Fase 4 — Moderación temporal (único cambio de comportamiento real)

Prerrequisitos: T0.3 hecho (respaldo). Probar en el servidor de pruebas antes de producción.

- [ ] **T4.1 Campos en el modelo.** En `src/Models/TempModeration.ts` añadir `attempts` (número, default 0), `nextAttemptAt` (fecha, opcional), `status` (`pending` | `permanentFailure`, default `pending`) y `failureCode` (string de una lista cerrada). **Pedir confirmación antes** (cambio de esquema). Los registros sin los campos nuevos se tratan como `pending` con 0 intentos.
- [ ] **T4.2 Reintentos con tope.** En `src/Services/TempModerationService.ts`:
  - Constantes: máximo 5 intentos; backoff 30 s, 60 s, 120 s, 300 s.
  - Consulta de candidatos: `status` pendiente (o ausente), `expiresAt <= now` y `nextAttemptAt` ausente o `<= now`; orden `expiresAt` ascendente; límite 100.
  - Error transitorio: incrementar `attempts`; si llega a 5, `status = permanentFailure` y `failureCode`; si no, `nextAttemptAt = now + backoff`. Nunca persistir `error.message`, stack ni contenido de Discord.
  - Éxito: se mantiene el comportamiento actual (borrar el registro).
  - `schedule` (upsert) debe reiniciar `attempts`, `status` y `nextAttemptAt` al reprogramar.
  - Aceptación: un registro que falla no bloquea a los demás; tras 5 fallos deja de ser candidato y se conserva para revisión; `tempban`/`tempmute` no cambian de cara al usuario.
- [ ] **T4.3 Pruebas.** Extraer el cálculo de transición (intentos, backoff, permanente) a una función pura y cubrirla en `tests/unit/` (sin Mongo ni Discord). Entra en `npm test`.
- [ ] **T4.4 [DECISIÓN de Amy] Harness aislado.** Con T4.2 resuelto, `src/Services/temp-moderation/` y su doc quedan sin uso. Opciones: dejarlo intacto sin conectar, o borrarlo (queda en el historial de git). Si se conserva, quitar el escalón `600_000` de `MODERATION_RETRY_BACKOFF_MS` en `contracts/index.ts` (con 5 intentos nunca se usa) y ajustar los tests.

### Checkpoint
- [ ] Gates en verde.
- [ ] **[HUMANO]** En el servidor de pruebas: un `tempmute` y un `tempban` cortos expiran solos; reiniciar el bot con un vencimiento pendiente y comprobar que se procesa; forzar un fallo (quitar el permiso de banear) y comprobar los reintentos y el estado `permanentFailure`.

---

## Fase 5 — Cerrar el refactor (un archivo por commit)

Cada archivo: sin cambio de comportamiento, divido por responsabilidad, el original queda como coordinador delgado.

- [ ] **T5.1** `src/Events/Client/interactionCreate.ts` (624 líneas): separar por tipo de interacción (autocompletado, comandos, botones, menús, modales) y dejar el evento como coordinador.
- [ ] **T5.2** `src/Events/Client/voiceStateUpdate.ts` (322).
- [ ] **T5.3** `src/Utils/SystemLogger.ts` (561).
- [ ] **T5.4** `src/Commands/SlashCmds/Love/shipRenderer.ts` (652): los splits anteriores solo movieron código; dividir por trabajo real.
- [ ] **T5.5 en adelante**, de mayor a menor: `Fun/help.ts` (493), `Information/activity.ts` (381), `Information/serverinfo.ts` (374), `Information/avatars.ts` (369), `Moderation/setup.ts` (365), `Canvas/post-instagram.ts` (358), `Information/users.ts` (341), `Fun/Racha/racha.ts` (334).

### Checkpoint
- [ ] Gates en verde y revisión de Amy tras cada 2-3 archivos.

---

## Fase 6 — Medir antes de añadir infraestructura

- [ ] **T6.1** Registrar el lag del event loop con `monitorEventLoopDelay` (`perf_hooks`, sin dependencias) y el tiempo de respuesta por comando. Un log periódico es suficiente.
- [ ] **T6.2 [HUMANO]** Revisar los números tras un par de semanas con tráfico real. **Redis y BullMQ quedan fuera de alcance** hasta que alguno de estos disparadores se cumpla: lag sostenido del event loop, cercanía al límite de sharding de Discord (2.500 servidores) o necesidad de un segundo proceso que comparta estado.

---

## Fase 7 — Producción [HUMANO]

- [ ] **T7.1** Tres PRs separados hacia `master`: (1) splits de módulos, (2) limpieza y configuración, (3) moderación temporal.
- [ ] **T7.2** Desplegar de a uno. Antes de cada despliegue, guardar el `dist` anterior para volver atrás con `pm2 restart`.
- [ ] **T7.3** Confirmar que el nombre del proceso PM2 y las rutas coinciden con producción real (`Hoshiko-Production`). Nunca usar `pm2 delete all`.
- [ ] **T7.4** Tras desplegar la fase de moderación, revisar `/healthz` y los logs durante las primeras horas.

---

## Preguntas abiertas

- **Servidor no encontrado en caché** (T4.2): hoy el servicio lanza un error por cada registro cuyo servidor no está en caché. Propuesta por defecto: contarlo como intento para que un servidor del que el bot salió no reintente para siempre. ¿Se mantiene?
- **TTL de `LevelConfig`** (T2.2): 60 s es una propuesta, no una medición.
- **Destino del harness** (T4.4): conservar o borrar.
- **`test-timeout.js`** (T1.6): su propósito no se verificó.
