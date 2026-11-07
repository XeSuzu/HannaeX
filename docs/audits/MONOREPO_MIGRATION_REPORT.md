# Informe de Migración de Estructura Monorepo (Fase 2.1)

**Fecha:** 2026-11-04  
**Estado:** ✅ Completado y verificado (176/176 tests passing)

---

## 1. Resumen Ejecutivo

En la Fase 2.1 se ha consolidado definitivamente la arquitectura del repositorio en un monorepo estricto compuesto por dos aplicaciones independientes bajo el directorio `apps/`:

- [`apps/hoshiko`](file:///home/hanna/HannaeX/apps/hoshiko): Bot principal de Discord que conserva moderación comunitaria, AutoMod convencional, filtros de palabras, economía, niveles/XP, interacciones y asistentes de IA.
- [`apps/hoshiko-security`](file:///home/hanna/HannaeX/apps/hoshiko-security): Bot especializado e independiente para la suite de seguridad (Sentinel, Anti-Raid, Anti-Nuke, Lockdown y Honeypot).

Se eliminó por completo el enlace simbólico y directorio residual `src/` en la raíz del repositorio, garantizando que no existe una tercera fuente activa y que todo el código fuente vive de forma canónica dentro de su respectivo espacio en `apps/`.

---

## 2. Auditoría e Integración del Código

1. **Inspección de `src/` raíz y `apps/hoshiko/src/`:**
   - Se verificó que `src/` a nivel de raíz era un enlace simbólico (`src -> apps/hoshiko/src`). En el índice de Git, los archivos originales de `src/` ya habían sido migrados limpiamente a `apps/hoshiko/src/`.
   - Se verificaron y mantuvieron intactas todas las mejoras y correcciones realizadas en la Fase 2:
     - Mutex distribuido y bloqueo anti-duplicación para `interactionCreate`.
     - Decorador idempotente para respuestas de Discord (`wrapInteractionResponse`).
     - Cola FIFO por canal (`MAX_PENDING_PER_CHANNEL = 3`) y serialización para evitar colisiones de IA.
     - Depuración total de módulos residuales de seguridad en Hoshiko (`antiNukeRoles`, `antiNukeChannels`, `honeypotHandler`, `sentinelNetwork`, `antiraid`, `raidEpisode.model`, etc.).
     - Conversión de `antiNukeBans` a [`guildBanAdd.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/Guilds/guildBanAdd.ts) para registrar bans manuales en el canal de auditoría sin dependencias de Anti-Nuke.

2. **Resolución de Assets y Fuentes:**
   - Se detectó que [`spotifyRenderer.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Renderers/spotifyRenderer.ts), [`robloxRenderer.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Renderers/robloxRenderer.ts) y [`canvas.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Utils/levelBanners/canvas.ts) utilizaban rutas relativas fijadas a `join(process.cwd(), "src/assets/...")`.
   - Se implementó en los tres renderizadores la función `resolveAssetPath` determinista que busca primero en `__dirname/../assets/`, y como respaldo en `apps/hoshiko/src/assets/` y `apps/hoshiko/dist/assets/`, desacoplándolos del directorio de trabajo raíz.
   - En [`robloxRenderer.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Renderers/robloxRenderer.ts) se añadió fallback hacia `3944-roblox.png` corrigiendo la discrepancia de nombres en entornos Linux case-sensitive.
   - Se actualizó el script `copy:assets` en [`apps/hoshiko/package.json`](file:///home/hanna/HannaeX/apps/hoshiko/package.json) para incluir la extensión `ttf` (`copyfiles -u 1 "src/**/*.{...,ttf}" dist`).

---

## 3. Configuración de Scripts y Monorepo

1. **[`package.json`](file:///home/hanna/HannaeX/package.json) (Raíz):**
   - Configurado con npm workspaces: `["apps/hoshiko", "apps/hoshiko-security"]`.
   - Script `"dev"`: actualizó la ruta a `nodemon --exec "ts-node --transpile-only" apps/hoshiko/src/index.ts`.
   - Script `"copy:assets"`: delega en `npm run --prefix apps/hoshiko copy:assets`.
   - Script `"check:reply"`: apunta a `apps/hoshiko/src/scripts/checkReply.ts`.
   - Script `"build"`: ejecuta `npm run build:hoshiko && npm run build:security && rm -rf dist && ln -s apps/hoshiko/dist dist`. Esto preserva el enlace `./dist/index.js` esperado por [`ecosystem.config.js`](file:///home/hanna/HannaeX/ecosystem.config.js) para PM2 sin requerir cambios en la configuración de producción.

2. **[`tsconfig.json`](file:///home/hanna/HannaeX/tsconfig.json) (Raíz):**
   - Se actualizó para abarcar `"apps/hoshiko/src/**/*"` y `"apps/hoshiko-security/src/**/*"` con `"noEmit": true`.
   - Permite que `npx tsc --noEmit` desde la raíz valide el tipado estricto de ambos proyectos simultáneamente.

3. **[`nodemon.json`](file:///home/hanna/HannaeX/nodemon.json):**
   - Se actualizaron las rutas de `"watch"`, `"ignore"` y `"exec"` apuntando a `apps/hoshiko/src/`.

4. **[`scripts/test.sh`](file:///home/hanna/HannaeX/scripts/test.sh):**
   - Configurado con `HANDLER_TEST_BUILD_DIR="${HANDLER_TEST_BUILD_DIR:-$PWD/apps/hoshiko/dist}"`.

5. **Ajustes en Pruebas Unitarias:**
   - [`tests/unit/docs-db-cleanup.test.cjs`](file:///home/hanna/HannaeX/tests/unit/docs-db-cleanup.test.cjs): Actualizado para validar la ruta física `apps/hoshiko/src/Database/guild/serverConfig.model.ts`.
   - [`tests/unit/canvas-async-encode.test.cjs`](file:///home/hanna/HannaeX/tests/unit/canvas-async-encode.test.cjs): Actualizado para inspeccionar `apps/hoshiko/src/`.

6. **[`AGENTS.md`](file:///home/hanna/HannaeX/AGENTS.md):**
   - Documentación actualizada detallando la estructura de dos aplicaciones bajo `apps/` y sus responsabilidades.

---

## 4. Eliminación de `src/` Raíz

- Se eliminó el enlace residual `src` de la raíz del proyecto.
- Se verificó que el directorio `src/` ya no existe en la raíz:
  ```bash
  $ ls -ld src
  ls: cannot access 'src': No such file or directory
  ```

---

## 5. Matriz de Verificación y Pruebas

| Verificación | Comando | Resultado |
| :--- | :--- | :--- |
| **Typecheck global** | `npx tsc --noEmit` | ✅ 0 errores de tipado |
| **Build independiente Hoshiko** | `npm run --prefix apps/hoshiko build` | ✅ Generó `apps/hoshiko/dist` con assets y fuentes |
| **Build independiente Security** | `npm run --prefix apps/hoshiko-security build` | ✅ Generó `apps/hoshiko-security/dist` |
| **Build raíz monorepo** | `npm run build` | ✅ Compilación y enlace `dist -> apps/hoshiko/dist` |
| **Suite completa de pruebas** | `npm test` | ✅ **176 pasadas, 0 fallidas** (106.9s) |
| **Pruebas de Aislamiento de Seguridad** | `node --test tests/unit/security-separation.test.cjs` | ✅ 5 pruebas pasadas |
| **Cero referencias huérfanas a `src/`** | `git grep '"src/'` | ✅ Ninguna referencia huérfana en código activo |

---

## 6. Estado de los Procesos y Restricciones Cumplidas

- **Producción:** No se modificaron configuraciones de despliegue, PM2 (`ecosystem.config.js`) ni variables de entorno.
- **Procesos en ejecución:** No se reiniciaron procesos productivos.
- **Bases de datos:** No se realizaron modificaciones en datos ni esquemas de MongoDB o Redis.
- **Credenciales:** `Hoshiko Security` permanece debidamente desacoplado sin tokens falsificados ni compartición de credenciales de Hoshiko.
