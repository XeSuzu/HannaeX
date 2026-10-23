# PROGRESO DE LA AUDITORÍA TÉCNICA - HANNAEX (RONDA 2)

## 1. Identificación y Estado del Repositorio
- **Rama activa (checkout):** `master`
- **Commit HEAD:** `d02e24b9d5a57f9d61365f8a922aea5905cbab3f` (*Re ajuste de replys*)
- **Estado de paridad Master vs Refactor:**
  - `master` local **SÍ contiene** el refactor (`1f78e4c Merge pull request #2 from XeSuzu/refactor/arquitectura`), incorporando `src/Database/<dominio>/`, Redis y BullMQ.
  - El commit anterior al refactor en `master` fue `ea2abdc` (*snipe service*).
  - La rama `origin/master` se encuentra sincronizada en el mismo commit `d02e24b`.
  - Existen **7 archivos modificados sin commitear** en el árbol de trabajo y **1 archivo sin trackear** (`tests/unit/ai-deep-integration.test.cjs`).
  - Existen volcados de producción en texto plano sin trackear en el directorio ignorado `backups/`.

---

## 2. Reconciliación Exacta de Cifras por Fase

| Fase | Título | Estado | Hallazgos Registrados | IDs Asignados |
| :--- | :--- | :---: | :---: | :--- |
| **Fase 0** | Mapa del repositorio y paridad de código | **COMPLETADA** | 1 | `[SEC-01]` |
| **Fase 1** | Salud de base (compilación, dependencias, tipos) | **COMPLETADA** | 1 | `[DEP-01]` |
| **Fase 2** | Ciclo de vida y apagado (index, error handlers, PM2) | **COMPLETADA** | 4 | `[OPS-01]`, `[OPS-02]`, `[LIF-01]`, `[LIF-02]` |
| **Fase 3** | Comandos y eventos (slash, prefijo, permisos, jerarquía) | **COMPLETADA** | 2 | `[CMD-01]`, `[CMD-02]` |
| **Fase 4** | Seguridad (secretos git, invariante IA, injection, SSRF) | **COMPLETADA** | 1 | `[SEC-02]` |
| **Fase 5** | Persistencia (Mongoose, ServerConfig vs GuildConfig, atomicidad) | **COMPLETADA** | 2 | `[DB-01]`, `[DB-02]` |
| **Fase 6** | IA y Gemini (modelos, prompts, aislamiento, fuga cross-server) | **COMPLETADA** | 3 | `[AI-01]`, `[AI-02]`, `[AI-03]` |
| **Fase 7** | Rendimiento y recursos (2 CPUs / 4GB RAM, canvas, workers) | **COMPLETADA** | 2 | `[PERF-01]`, `[PERF-02]` |
| **Fase 8** | Privacidad, datos y términos legales (PRIVACY/TERMS, backups) | **COMPLETADA** | 1 | `[LEG-01]` |
| **Fase 9** | Operación y observabilidad (PM2, healthz, rotación logs) | **COMPLETADA** | 2 | `[OPS-03]`, `[OPS-04]` |
| **Fase 10** | Lo que no se ve (código muerto, IDs fijas, AGENTS.md sync) | **COMPLETADA** | 2 | `[DOC-01]`, `[CODE-01]` |
| **Fase 11** | Ejecución controlada en entorno de pruebas (npm test / bot) | **PARCIAL** | 0 | *Tests 146/146 PASS; Gateway Live NO VERIFICADO* |
| **Fase 12** | Deduplicación, verificación y veredicto final | **COMPLETADA** | 0 | *Síntesis y Libro Reconciliado* |
| **TOTAL** | **Catálogo Unificado Consolidado** | - | **21** | **Total reconciliado 1:1 con HALLAZGOS.md** |

*Nota de descarte:* `src/index.ts` fue desmarcado del conteo de defectos dado que actúa adecuadamente como coordinador de arranque; sus aspectos de ciclo de vida se agrupan en `[LIF-01]`.

---

## 3. Libro de Cobertura (Ledger) Completo de Archivos
*Total de archivos inventariados y revisados en este ledger:* **446**

| Ruta | Estado Git | Fase | Revisado | Nº Hallazgos | Notas / ID de Hallazgo |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Definici\303\263n oficial.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Estados.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Influencia neko.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Lenguaje y voz.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Memoria.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Origen.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Personalidad base.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Principios inmutables.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/01-Identidad/Hoshiko \342\200\224 Relaciones.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Capas del sistema.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Configuraci\303\263n y entorno.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Despliegue.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Escalabilidad.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Flujo de eventos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Integraciones externas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Observabilidad.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Persistencia.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Recuperaci\303\263n ante fallos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Seguridad.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Arquitectura \342\200\224 Workers y tareas as\303\255ncronas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Hoshiko \342\200\224 Identidad y configuraci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Hoshiko \342\200\224 Personalidad t\303\251cnica.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/02-Arquitectura/Hoshiko \342\200\224 Relaci\303\263n con HannaeX.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Comunidad/Comunidad \342\200\224 Eventos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Comunidad/Comunidad \342\200\224 Rachas y misiones.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Comunidad/Comunidad \342\200\224 Rankings.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Comunidad/Comunidad \342\200\224 Recompensas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Comunidad/Comunidad \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Comunidad/Comunidad \342\200\224 XP y niveles.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Economia/Econom\303\255a \342\200\224 Cuentas y saldos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Economia/Econom\303\255a \342\200\224 Recompensas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Economia/Econom\303\255a \342\200\224 Tienda.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Economia/Econom\303\255a \342\200\224 Transacciones.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Economia/Econom\303\255a \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Features \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/IA/IA \342\200\224 Contexto y memoria.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/IA/IA \342\200\224 Conversaci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/IA/IA \342\200\224 Herramientas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/IA/IA \342\200\224 Res\303\272menes.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/IA/IA \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Moderacion/Moderaci\303\263n \342\200\224 Auditor\303\255a.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Moderacion/Moderaci\303\263n \342\200\224 Automatizaciones.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Moderacion/Moderaci\303\263n \342\200\224 Casos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Moderacion/Moderaci\303\263n \342\200\224 Comandos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Moderacion/Moderaci\303\263n \342\200\224 Roles y permisos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Moderacion/Moderaci\303\263n \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Multimedia/Multimedia \342\200\224 Integraciones.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Multimedia/Multimedia \342\200\224 Letras y metadatos.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Multimedia/Multimedia \342\200\224 M\303\272sica.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Multimedia/Multimedia \342\200\224 Reproducci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Multimedia/Multimedia \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Seguridad/Seguridad \342\200\224 Alertas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Seguridad/Seguridad \342\200\224 Detecci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Seguridad/Seguridad \342\200\224 Incidentes.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Seguridad/Seguridad \342\200\224 Protecci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Seguridad/Seguridad \342\200\224 Respuesta.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Seguridad/Seguridad \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Utilidades/Utilidades \342\200\224 Administraci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Utilidades/Utilidades \342\200\224 Configuraci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Utilidades/Utilidades \342\200\224 Herramientas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Utilidades/Utilidades \342\200\224 Informaci\303\263n.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Utilidades/Utilidades \342\200\224 Recordatorios.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Utilidades/Utilidades \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Voz/Voz \342\200\224 Estad\303\255sticas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Voz/Voz \342\200\224 Recompensas.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Voz/Voz \342\200\224 Tracking de sesiones.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Voz/Voz \342\200\224 Visi\303\263n general.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/03-Features/Voz/Voz \342\200\224 XP de voz.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"Hoshiko Or Later/04-Guias/Gu\303\255as \342\200\224 \303\215ndice.md"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `"src/assets/images/banners/ship-banners/follow \304\221iiiii.jpg"` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `.dockerignore` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `.gitignore` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `AGENTS.md` | trackeado limpio | Fase 1 / 10 | Sí | 1 | [DOC-01] Fase 10: Documentación desincronizada con archivos reales (env.ts, canvasWorker.ts) |
| `Dockerfile` | trackeado limpio | Fase 9 | Sí | 0 |  |
| `Hoshiko Or Later/Hoshiko.md` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `Licenses/ATTRIBUTIONS.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `Licenses/LICENSE.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `Licenses/PRIVACY.md` | trackeado limpio | Fase 8 | Sí | 1 | [LEG-01] Fase 8: Términos de Servicio y Privacidad no publicados (plantillas con TODOs) |
| `Licenses/README.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `Licenses/TERMS.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `README.md` | trackeado limpio | Fase 1 / 10 | Sí | 0 |  |
| `auditoria/HALLAZGOS.md` | sin trackear | Fase 0 | Sí | 0 |  |
| `auditoria/HUMANO.md` | sin trackear | Fase 0 | Sí | 0 |  |
| `auditoria/PROGRESO.md` | sin trackear | Fase 0 | Sí | 0 |  |
| `auditoria/RESUMEN.md` | sin trackear | Fase 0 | Sí | 0 |  |
| `docs/Hoshiko_Dev.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `docs/PRIVACY-AUDIT.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `docs/defensa-inventario.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `docs/operations/deployment-processes.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `docs/operations/medicion-cache.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `docs/operations/redis-ubuntu-oracle-vm.md` | trackeado limpio | Fase 8 | Sí | 0 |  |
| `ecosystem.config.js` | trackeado limpio | Fase 9 | Sí | 1 | [OPS-01] Fase 2 / 9: Hardcoded cwd /root/HannaeX y ausencia de kill_timeout |
| `nodemon.json` | trackeado limpio | Fase 9 | Sí | 0 |  |
| `package-lock.json` | trackeado limpio | Fase 1 / 10 | Sí | 0 |  |
| `package.json` | trackeado limpio | Fase 1 / 10 | Sí | 1 | [DEP-01] Fase 1: Dependencias vulnerables reportadas por npm audit (proxy-addr, undici, mongoose) |
| `plan_antiraid.md` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `plan_de_arquitectura_y_seguridad.md` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `plan_ia.md` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `scripts/test.sh` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/App/bootstrap/ShutdownService.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/App/config/AppConfig.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/App/config/envSchema.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/App/health/HealthService.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/App/infrastructure/cache/LocalCacheService.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/App/infrastructure/queue/QueueRegistry.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/App/infrastructure/queue/QueueService.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/App/infrastructure/queue/QueueTypes.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/App/infrastructure/queue/WorkerBootstrap.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/App/infrastructure/redis/RedisClient.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/App/infrastructure/redis/RedisHealthService.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/App/infrastructure/redis/RedisKeys.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Commands/PrefixCmds/Fun/ping.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/PrefixCmds/Fun/say.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/PrefixCmds/Fun/translate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/PrefixCmds/Information/userinfo.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/PrefixCmds/Setups/prefix.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Afk/afk.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Canvas/canvasPrimitives.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Canvas/instaRenderer.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Canvas/post-instagram.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Canvas/post-twitter.ts` | trackeado limpio | Fase 3 | Sí | 1 | [PERF-01] Fase 7: Renderizado Canvas síncrono (toBuffer) en hilo principal sin loadShedding |
| `src/Commands/SlashCmds/Confessions/confess.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Confessions/confession-ban.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Confessions/confession-check.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Confessions/confession-delete.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Confessions/confession-status.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Confessions/confession-unban.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Confessions/setup-confessions.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/Racha/crear-racha.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/Racha/racha.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/asignar-rol-aleatorio.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/curiosidades.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/help.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/helpUtils/antiraidHelp.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/helpUtils/commandDetails.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/helpUtils/config.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/helpUtils/embeds.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/helpUtils/moderationHelp.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/helpUtils/ui.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/img.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/ping.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/say.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/snipe.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Fun/translate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/activity.ts` | trackeado limpio | Fase 3 | Sí | 1 | [PERF-02] Fase 7: Creación de nuevo Worker Thread por petición sin pool reutilizable |
| `src/Commands/SlashCmds/Information/avatar.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/avatars.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/info-creator.ts` | trackeado limpio | Fase 3 | Sí | 1 | [CODE-01] Fase 10: IDs de usuarios y URL de Pinterest hardcodeadas |
| `src/Commands/SlashCmds/Information/report.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/serverinfo.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/sugerencia.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/userinfo.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/userinfoViews.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Information/users.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/Personals/blush.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/Personals/cry.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/Personals/dance.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/Personals/happy.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/Personals/sad.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/Personals/wave.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/bite.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/cuddle.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/highfive.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/hug.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/kiss.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/pat.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/poke.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Interactions/slap.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/achievements.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/global-leaderboard.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/global-rank.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/leaderboard.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/level-roles.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/rank.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/server-stats.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/setup-levels.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/setup-levels/channelsFlow.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/setup-levels/messageXpFlow.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/setup-levels/systemFlow.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/setup-levels/viewFlow.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/setup-levels/voiceXpFlow.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/tiers.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/top.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/vcrank.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/weekly-leaderboard.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Levels/xp-reset.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Love/match.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Love/renderer/config.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Love/renderer/effects.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Love/renderer/ui.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Love/renderer/utils.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Love/ship.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Love/shipRenderer.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/Mute.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/automod-history.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/ban.ts` | trackeado limpio | Fase 3 | Sí | 1 | [CMD-02] Fase 3: Comandos de moderación sin validación interna de permisos ni jerarquía de roles |
| `src/Commands/SlashCmds/Moderation/cases.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/clearmemory.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/clearmemoryall.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/clearwarnings.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/historial.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/kick.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/mass-ban.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/mass-role-add.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/mass-role-remove.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/purge.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/reglas.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/role-add.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/setup-automod.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/setup-logs.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/setup.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/setupUtils/snipe.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/setupUtils/ui.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/softban.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/tempban.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/tempmute.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/unban.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/unmute.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/unwarn.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/warn.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/warnings.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/whitelist.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Moderation/wordfilter.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Owner/dev-servers.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Owner/give-premium.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Owner/manage-testers.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Performance/stats.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Privado/listar-servers.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Privado/racha-admin.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Privado/ver-sugerencias.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Setups/setprefix.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Setups/setup-autojoin.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Setups/setup-status.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Utility/invite.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Commands/SlashCmds/Utility/memory.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Database/ai/IAConfigManager.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/ai/UserMemoryManager.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/ai/conversation.model.ts` | trackeado limpio | Fase 5 | Sí | 1 | [AI-01] Fase 6 / 8: Historial de chat de IA indexado solo por userId sin aislamiento por servidor |
| `src/Database/ai/userMemory.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/community/confession.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/community/couple.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/community/reactionRoles.models.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/community/suggestion.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/guild/CacheManager.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/guild/PremiumManager.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/guild/SettingsManager.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/guild/guildConfig.model.ts` | trackeado limpio | Fase 5 | Sí | 1 | [DB-01] Fase 5 / 10: Modelo GuildConfig huérfano y duplicado sin importación en src/ |
| `src/Database/guild/serverConfig.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/guild/statusConfig.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/leveling/LevelConfigCache.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/leveling/activeVoiceSession.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/leveling/globalConfig.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/leveling/globalLevel.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/leveling/levelConfig.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/leveling/localLevel.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/moderation/case.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/moderation/globalBlacklist.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/moderation/globalProfile.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/moderation/raidEpisode.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/moderation/snipe.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/moderation/tempModeration.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/moderation/warning.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/streaks/streakGroup.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/streaks/streakMember.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/system/BulkWriteBuffer.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/system/system.models.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/tracking/AvatarHistoryManager.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/tracking/PresenceHistoryManager.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/tracking/UserHistoryManager.ts` | trackeado limpio | Fase 5 | Sí | 1 | [DB-02] Fase 5: Operaciones de array no atómicas con riesgo de VersionError bajo concurrencia |
| `src/Database/tracking/afk.model.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Database/tracking/userTracking.models.ts` | trackeado limpio | Fase 5 | Sí | 0 |  |
| `src/Events/Client/Guilds/antiNukeBans.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/antiNukeChannels.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/antiNukeRoles.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/avatarHistoryGuildMemberUpdate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/boostLog.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/channelDelete.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/guildCreate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/guildMemberAdd.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/guildMemberRemove.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/honeypotHandler.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/messageDelete.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/messageDeleteBulk.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/messageUpdate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/serverlog/channelCreate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/serverlog/channelUpdate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/serverlog/guildLog.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/serverlog/memberUpdateLog.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/serverlog/roleCreate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/serverlog/roleDelete.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/serverlog/roleUpdate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/Guilds/voicelog.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/autocomplete.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/command.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/components.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/modals.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/utils.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/voice/voiceLifecycle.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/voice/voiceManager.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/handlers/voice/voiceUtils.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/interactionCreate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/messageCreate.ts` | trackeado limpio | Fase 3 | Sí | 1 | [CMD-01] Fase 3: Comandos con prefijo de client.commands nunca son despachados |
| `src/Events/Client/presenceUpdate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/reactionAdd.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/reactionRemove.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/ready.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/userUpdate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Events/Client/voiceStateUpdate.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Features/AutomodManager.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/ConfessionManager.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/afkHandler.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/ai/adminMessageTracker.ts` | trackeado limpio | Fase 6 | Sí | 0 |  |
| `src/Features/ai/contentPolicy.ts` | trackeado limpio | Fase 6 | Sí | 0 |  |
| `src/Features/ai/conversationContext.ts` | modificado | Fase 6 | Sí | 0 |  |
| `src/Features/ai/conversationReply.ts` | modificado | Fase 6 | Sí | 0 |  |
| `src/Features/ai/imageSearch.ts` | trackeado limpio | Fase 6 | Sí | 0 |  |
| `src/Features/ai/lyricsResponse.ts` | trackeado limpio | Fase 6 | Sí | 0 |  |
| `src/Features/aiHandler.ts` | modificado | Fase 6 | Sí | 0 |  |
| `src/Features/automod/aiConfigAssistant.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/aiFeatureGating.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/aiHistorySummarizer.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/aiJudge.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/aiModeration.ts` | trackeado limpio | Fase 3 / 4 | Sí | 1 | [AI-02] Fase 4 / 10: 180 líneas de código muerto vestigial (flushGuildModBatch) |
| `src/Features/automod/automodActionExecutor.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/automodDiagnostics.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/automodPersistence.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/automodPresets.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/automodState.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/raidAlertManager.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/automod/wordFilter.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/cultureHandler.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/levelHandler.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/leveling/announcements.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/leveling/globalTextXp.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/leveling/textXp.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/leveling/voiceXp.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/leveling/xpRules.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/linkAllowlist.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/linkProtector.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/messageTextCommands.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Features/sentinelNetwork.ts` | trackeado limpio | Fase 3 / 4 | Sí | 0 |  |
| `src/Handlers/Buttons/racha.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Handlers/Buttons/racha/claims.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Handlers/Buttons/racha/groupManagement.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Handlers/Buttons/racha/views.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Handlers/cmdHandler.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Handlers/commandLoader.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Handlers/eventHandler.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Handlers/eventModuleLoader.ts` | trackeado limpio | Fase 3 | Sí | 0 |  |
| `src/Interfaces/Command.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/Renderers/robloxRenderer.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `src/Renderers/spotifyRenderer.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `src/Security/Backup/BackupManager.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Security/Defense/Blacklist.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Security/Defense/RateLimiter.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Security/Defense/Sanitizer.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Security/Defense/antiraid.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Security/Logger/HoshikoLogger.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Security/Logger/LocalStorage.ts` | trackeado limpio | Fase 4 | Sí | 1 | [OPS-04] Fase 9: Archivos .jsonl sin política de retención ni purga automática |
| `src/Security/Performance/PerformanceMonitor.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Security/index.ts` | trackeado limpio | Fase 4 | Sí | 0 |  |
| `src/Services/CardService.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/index.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/lyricsFormatter.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/lyricsNormalizer.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/lyricsParser.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/lyricsService.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/providers/geniusProvider.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/providers/lrclibProvider.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/providers/lyricsOvhProvider.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/Lyrics/types.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/SnipeConsentService.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/SnipeService.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/StreakService.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/TempModerationService.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/TempModerationTransition.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/gemini.ts` | modificado | Fase 6 | Sí | 1 | [AI-03] Fase 6: Nombre de modelo no estándar (gemini-2.5-flash-lite / gemini-2.5-flash) |
| `src/Services/mongo.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/search.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/streak/cycleActions.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/streak/groupManagement.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/streak/missedCycleService.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/streak/transactions.ts` | trackeado limpio | Fase 5 / 7 | Sí | 0 |  |
| `src/Services/translationService.ts` | trackeado limpio | Fase 6 | Sí | 0 |  |
| `src/Utils/AI/SystemPrompts.ts` | modificado | Fase 6 | Sí | 0 |  |
| `src/Utils/LevelBanners.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/SystemLogger.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/SystemLogger/CommandLogger.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/SystemLogger/SayLogger.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/SystemLogger/SecurityLogger.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/SystemLogger/SystemEventLogger.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/SystemLogger/WebhookManager.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/animeGif.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/antiCrash.ts` | trackeado limpio | Fase 2 | Sí | 1 | [LIF-02] Fase 2: uncaughtException silencia excepciones fatales sin reiniciar proceso |
| `src/Utils/confessionCard.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/discordSafety.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/inviteUtils.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/levelBanners/canvas.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `src/Utils/levelBanners/globalRank.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `src/Utils/levelBanners/serverRank.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `src/Utils/levelBanners/types.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `src/Utils/levelBanners/vcRank.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `src/Utils/loadShedding.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/snipe.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/streakTier.ts` | trackeado limpio | Fase 3 / 7 | Sí | 0 |  |
| `src/Utils/triggerConditions.ts` | modificado | Fase 3 / 7 | Sí | 0 |  |
| `src/assets/fonts/NotoColorEmoji.ttf` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/fonts/Nunito-Bold.ttf` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/fonts/Nunito-Regular.ttf` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/images/banners/level-banners/bg-banner-1.jpg` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/images/banners/ship-banners/jpg` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/images/banners/ship-banners/jpg(1)` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/images/banners/ship-banners/jpg(2)` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/images/icons/3944-roblox.png` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/assets/images/icons/SpotifyLogo.png` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/bootstrap/loadHandlers.ts` | trackeado limpio | Fase 2 | Sí | 0 |  |
| `src/client/HoshikoClient.ts` | trackeado limpio | Fase 2 | Sí | 0 |  |
| `src/config/loadEnvironment.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/http/healthServer.ts` | trackeado limpio | Fase 9 | Sí | 1 | [OPS-03] Fase 9: Servidor HTTP de salud escuchando en 0.0.0.0 sin restricción de host |
| `src/index.ts` | trackeado limpio | Fase 2 | Sí | 0 | (Descartado como defecto: coordinador de arranque estandar) |
| `src/lifecycle/shutdown.ts` | trackeado limpio | Fase 2 | Sí | 1 | [LIF-01] Fase 2: Bloqueo de 5s artificiales en SIGINT/SIGTERM por timer killswitch no limpiado |
| `src/scripts/checkReply.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/scripts/cronJobs.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/scripts/deploy-commands.ts` | trackeado limpio | Fase 0 | Sí | 0 |  |
| `src/worker.ts` | trackeado limpio | Fase 2 | Sí | 1 | [OPS-02] Fase 2 / 9: Proceso hoshiko-worker deshabilitado con WORKER_ENABLED=false y autorestart=false |
| `src/workers/spotifyRenderer.worker.ts` | trackeado limpio | Fase 7 | Sí | 0 |  |
| `tests/unit/TempModerationTransition.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-behavioral-fixes.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-deep-integration.test.cjs` | sin trackear | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-phase1-memory-commands.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-phase2-prompt-isolation.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-phase3-cache-and-culture.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-phase4-multimodal.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-phase5-tools-degradation.test.cjs` | modificado | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/ai-phase6-memory-gating.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/automod-entropy.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/automod-phase1b.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/automod-phase2.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/automod-phase3.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/automod-phase4.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/automod-phase5.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/automod-rules.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/discord-safety.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/help-system.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/interaction-lifecycle.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/invite-system.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/leveling-system.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/load-handlers.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tests/unit/wordFilter.test.cjs` | trackeado limpio | Fase 1 / 11 | Sí | 0 |  |
| `tsconfig.json` | trackeado limpio | Fase 1 / 10 | Sí | 0 |  |
