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
- **Commit:** `fix(LIF-01): orden de apagado, manejo de senales y detencion de cron jobs`

---
