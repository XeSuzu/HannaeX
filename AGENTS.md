# AGENTS.md

## Comandos
- Instalar: `npm ci` (verificado).
- Dev: `npm run dev` ejecuta `src/index.ts` con `nodemon` y `ts-node`; inicia el bot. No lo uses para verificaciones aisladas.
- Build: `npm run build` (verificado; limpia `dist/`, compila TypeScript y copia assets de `src/Commands` y `src/Events`).
- Test: `npm test` ejecuta `bash scripts/test.sh` (`npm run build` + `node --test` sobre `tests/unit/*.test.cjs`).
- Test de archivo: `HANDLER_TEST_BUILD_DIR="$PWD/dist" node --test tests/unit/<archivo>.test.cjs` (requiere `npm run build` previo si hubo cambios en `src/`).
- Typecheck: `npx tsc --noEmit` (verificado).
- Lint: no hay script ni configuración de lint.
- `scripts-manuales/` contiene scripts independientes; inspecciónalos antes de ejecutarlos.

## Estructura
- `src/index.ts`: punto de entrada coordinador del bot.
- `src/worker.ts`: entrada principal de workers de cola/eventos.
- `src/bootstrap/`: carga los handlers de nivel superior (`loadHandlers.ts`).
- `src/client/`: clase (`HoshikoClient`) y fábrica del cliente de Discord.
- `src/config/`: validación y carga de configuración del entorno (`env.ts`).
- `src/http/`: servidor HTTP de salud (`healthServer.ts`).
- `src/lifecycle/`: apagado ordenado (`registerGracefulShutdown.ts`).
- `src/workers/`: entradas para worker threads de renderizado (`canvasWorker.ts`, `statCardWorker.ts`).
- `src/App/`: infraestructura de Redis, caché local y colas (`infrastructure/`).
- `src/Database/`: capa de persistencia Mongoose organizada por dominio (sin barriles globales):
  - `connect.ts`: conexión única y configuración de Mongoose.
  - `ai/`: memorias y perfiles de usuario para IA (`userMemory.model.ts`, `conversation.model.ts`).
  - `community/`: confesiones, sugerencias y niveles de patrocinio (`confession.model.ts`, `suggestion.model.ts`, `sponsor.models.ts`).
  - `guild/`: configuración por servidor y triggers (`guildConfig.model.ts`, `serverConfig.model.ts`, `trigger.model.ts`).
  - `leveling/`: niveles, XP, actividad diaria y logros (`userLevel.model.ts`, `dailyActivity.model.ts`, `achievement.models.ts`, `globalConfig.model.ts`).
  - `moderation/`: advertencias, contadores de automod y silencios temporales (`warning.model.ts`, `automodCount.model.ts`, `tempMute.model.ts`).
  - `streaks/`: rachas individuales y grupales (`streak.model.ts`, `streakGroup.model.ts`).
  - `system/`: telemetría y métricas del sistema (`systemMetric.model.ts`).
  - `tracking/`: historial de avatares, usuarios, presencias y voz (`userTracking.models.ts`, `voiceSession.model.ts`).
- `src/Commands/`: comandos `SlashCmds/` y `PrefixCmd/`.
- `src/Events/`: listeners de eventos de Discord.
- `src/Features/`: gestores de lógica de negocio e integraciones (IA, rachas, niveles, música, etc.).
- `src/Handlers/`: cargadores de comandos, eventos, crons y manejadores globales.
- `src/Interfaces/`, `src/Renderers/`, `src/Security/`, `src/Services/`, `src/Utils/`: contratos, renderizadores Canvas, seguridad, servicios externos y utilidades.
- `scripts-manuales/`: scripts manuales; no asumir que son pruebas aisladas o seguras.

## Convenciones
- Mantén `index.ts`, handlers y eventos como coordinadores; ubica la implementación en módulos con responsabilidades acotadas.
- Importa los modelos de Mongoose directamente desde su dominio en `src/Database/<dominio>/<archivo>.model` (no crear barriles `src/Database/index.ts`).
- Conserva el orden observable, filtros, rutas y límites de manejo de errores al refactorizar.
- Reutiliza utilidades y contratos existentes antes de introducir alternativas.
- No leas `.env` para inspeccionar configuración o credenciales.

## Límites
- No modificar despliegue, configuración de PM2, Docker ni `.env` sin aviso.
- Preserva el comportamiento observable de cada fase aprobada.
- Pregunta antes de cambiar dependencias o lockfiles para resolver la instalación.

## Skills y Flujo Automático (`.agents/`)
- **Modo `ponytail` activo por defecto**: En toda tarea de código, refactorización, corrección o revisión, aplica automáticamente `ponytail` (nivel `full`: el cambio más simple y pequeño que resuelva la tarea de raíz, sin sobre-ingeniería).
- **Skills específicos de HannaeX (`.agents/skills/`)**:
  - `hannaex-commands-events`: usar siempre al crear o editar `src/Commands/` o `src/Events/`.
  - `hannaex-persistence`: usar siempre al crear o editar modelos/consultas en `src/Database/<dominio>/`.
  - `hannaex-workers-infra`: usar siempre al tocar `src/Renderers/`, `src/workers/`, `src/App/infrastructure/` o `src/worker.ts`.
  - `hannaex-visual-design`: usar siempre al diseñar o mejorar tarjetas `@napi-rs/canvas` (`src/Renderers/`) o Embeds/componentes interactivos de Discord.
- **Skills de catálogo (`.agents/skills/`)**:
  - `typescript-pro`, `nodejs-backend-patterns`, `architecture-patterns`, `database-optimizer`, `llm-application-dev-ai-assistant`, `backend-security-coder`, `ui-ux-designer`, `kpi-dashboard-design`, `javascript-testing-patterns`.
- **Regla permanente**: `.agents/rules/skills-and-workflow.md` (`trigger: always_on`).

## Antes de terminar
- Ejecuta `npm run build` y `npm test`.
- Verifica cambios de comportamiento con pruebas aisladas, sin login ni llamadas a Discord.
- Informa comandos inexistentes, fallos y comportamientos que no pudieron verificarse.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
