# AGENTS.md

## Comandos
- Instalar: TODO: preguntar. `npm ci` falla porque `package.json` y `package-lock.json` discrepan sobre PM2 y dependencias transitivas.
- Dev: `npm run dev` ejecuta `src/index.ts` con `nodemon` y `ts-node`; inicia el bot. No lo uses para verificaciones aisladas.
- Build: `npm run build` (verificado; limpia y regenera `dist/`).
- Test: no hay script `test` ni runner configurado. `Tests/` contiene scripts independientes; inspecciónalos antes de ejecutarlos.
- Test de archivo: TODO: preguntar qué convención de pruebas aisladas adoptar; no existe comando por archivo.
- Typecheck: `npx tsc --noEmit` (verificado).
- Lint: no hay script ni configuración de lint.

## Estructura
- `src/bootstrap/`: carga los handlers de nivel superior.
- `src/client/`: clase y fábrica del cliente de Discord.
- `src/config/`: carga configuración del entorno.
- `src/http/`: servidor de salud.
- `src/lifecycle/`: apagado ordenado.
- `src/workers/`: entradas para worker threads.
- `Tests/`: scripts manuales; no asumir que son pruebas aisladas o seguras.

## Convenciones
- Mantén `index.ts`, handlers y eventos como coordinadores; ubica la implementación en módulos con responsabilidades acotadas.
- Conserva el orden observable, filtros, rutas y límites de manejo de errores al refactorizar.
- Reutiliza utilidades y contratos existentes antes de introducir alternativas.
- No leas `.env` para inspeccionar configuración o credenciales.
- CI: no se encontró `.github/`; TODO: preguntar si existe otro sistema de CI.

## Límites
- No modificar `Commands/`, `Events/` salvo `messageCreate.ts`, despliegue, configuración de PM2, Docker ni `.env`.
- Preserva el comportamiento observable de cada fase aprobada.
- Pregunta antes de cambiar dependencias o lockfiles para resolver la instalación.

## Antes de terminar
- Ejecuta `npm run build`.
- Verifica cambios de comportamiento con pruebas aisladas, sin login ni llamadas a Discord.
- Informa comandos inexistentes, fallos y comportamientos que no pudieron verificarse.

## Gotchas
TODO: agregar con el tiempo
