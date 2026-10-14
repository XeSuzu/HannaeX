# TODO: Harness de vencimientos de moderación

**Estado:** Fases 1 y 2 implementadas en un harness aislado; todavía no integrado con el bot.

**Propósito:** dejar registro de lo construido, sus límites, el contexto operacional actual y el trabajo pendiente antes de conectar el processor al reconciliador de moderación temporal.

---

## Contexto del proyecto

HannaeX/Hoshiko es un bot Discord escrito en TypeScript y Node.js, con MongoDB/Mongoose como persistencia principal.

La funcionalidad existente de moderación temporal incluye `tempban` y `tempmute`. El sistema productivo actual ya persiste vencimientos en MongoDB y usa el cron existente como reconciliador. Sin embargo, la arquitectura productiva actual todavía no cuenta con un protocolo explícito y testeado de:

```text
claim atómico
→ lease con ownership
→ operación Discord
→ complete / retry / permanent failure
```

El harness de este documento prepara ese protocolo sin modificar el comportamiento actual del bot.

### Ramas y despliegue

| Área                             | Estado                                                        |
| -------------------------------- | ------------------------------------------------------------- |
| Producción                       | Rama `master`                                                 |
| Refactor arquitectónico          | Rama `refactor/arquitectura`                                  |
| Bot desplegado                   | Hoshiko/HannaeX bajo PM2 como `Hoshiko-Production`            |
| Ruta actual de producción en VPS | `/home/hanna/apps/HannaeX`                                    |
| Proceso                          | Una sola instancia PM2 en modo `fork`                         |
| Persistencia                     | MongoDB/Mongoose                                              |
| Salud local                      | Endpoint Express `/healthz` en puerto local `8080`            |
| Firewall                         | UFW expone SSH; el puerto 8080 no debe exponerse públicamente |
| Redis/BullMQ                     | No integrados; reservados para fases futuras                  |

> El harness y el trabajo de `refactor/arquitectura` no deben desplegarse en producción ni mezclarse con `master` sin una fase explícita de integración, revisión y pruebas.

### Principio de arquitectura

```text
MongoDB
→ fuente de verdad de vencimientos, estado, attempts, leases y auditoría.

Cron existente
→ único ejecutor inicial de reconciliación.

Processor aislado
→ aplica protocolo claim → gateway → complete/retry/failure.

Gateway Discord futuro
→ encapsula operaciones remotas y clasifica resultados.

Redis / BullMQ / worker
→ fuera de alcance hasta que Mongo + cron + gateway estén validados.
```

---

## Invariantes acordadas

- [x] MongoDB será la fuente de verdad; Redis, BullMQ y workers no participan en estas fases.
- [x] El cron existente seguirá siendo el único ejecutor hasta aprobar otra arquitectura.
- [x] Los documentos `completed` y `permanentFailure` se conservan; no hay purga/retención implementada.
- [x] El lease dura 2 minutos; la operación Discord futura debe tener un límite objetivo de 30 segundos.
- [x] Un claim exitoso incrementa `attempts` y `revision`, y usa un `leaseToken` nuevo.
- [x] `complete`, `releaseForRetry` y `markPermanentFailure` usan ownership mediante ID, token y revision.
- [x] Los errores persistidos son códigos allowlisted, no mensajes, stacks ni contenido de Discord.
- [x] `expectedTimeoutUntil` permite que un futuro gateway evite retirar un timeout posterior.
- [x] Un ban que ya no existe se tratará como éxito idempotente en una fase futura del gateway.
- [x] El processor no importa Discord, Mongoose, Redis, BullMQ ni modelos de producción.
- [x] El processor no crea timers, conexiones, workers ni efectos secundarios al importarse.
- [x] No se leen archivos `.env` ni se procesan secretos dentro del harness.
- [x] La semántica del lease debe ser segura frente a consumidores duplicados, ejecuciones repetidas del cron y reinicios del proceso.

---

## Flujo objetivo futuro

El flujo de integración posterior debe seguir este orden:

```text
Cron encuentra candidatos potencialmente vencidos
→ Processor solicita claim atómico a MongoDB
→ Mongo concede o rechaza el lease
→ Si no hay claim: skipped
→ Si hay claim: Gateway ejecuta operación Discord limitada en tiempo
→ Éxito idempotente: complete
→ Error transitorio: releaseForRetry con backoff
→ Error permanente: markPermanentFailure
→ Documento terminal se conserva para auditoría futura
```

### Resultados normalizados

| Resultado          | Significado                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `completed`        | La acción remota fue exitosa o idempotentemente ya estaba aplicada; el vencimiento queda completado |
| `skipped`          | El documento no era reclamable: futuro, terminal, retry pendiente, lease vigente o revisión stale   |
| `retryScheduled`   | Hubo un error transitorio; se liberó el lease y se programó un siguiente intento                    |
| `permanentFailure` | El procesamiento no debe reintentarse; se conserva el documento con código allowlisted              |

---

## Fase 1: harness unitario

### Hecho

- [x] Se eligió `node:test`, sin añadir dependencias ni script npm.
- [x] Se separó `tests/` en minúsculas; la carpeta manual `Tests/` se mantuvo intacta.
- [x] Se definieron contratos sin imports de Mongoose, Discord, Redis o BullMQ en `src/Services/temp-moderation/contracts/index.ts`.
- [x] Se creó `src/Services/temp-moderation/TempModerationProcessor.ts` como harness aislado, sin callers de producción ni side effects al importar.
- [x] Se añadieron `InMemoryTempModerationRepository`, `FakeModerationGateway`, `FakeClock` y `FakeModerationLogger` en `tests/support/`.
- [x] Se cubrieron claim, consumidores concurrentes sobre el fake, lease ajeno, fallo transitorio, retry, fallo permanente, acción gateway diferida y expiraciones no-op.
- [x] Se restringieron códigos persistibles/logueables a una unión allowlist.
- [x] Se verificó que el lease de dos minutos se calcula usando el reloj inyectado.
- [x] Se verificó que un fallo permanente no llama `releaseForRetry`.
- [x] Se reemplazó una comprobación frágil basada en `require.cache` por una prueba aislada en proceso hijo que bloquea clientes reales antes de cargar el harness.

### Verificación registrada

- [x] Typecheck limitado de los módulos TypeScript del harness.
- [x] Compilación CommonJS temporal fuera del repo y ejecución de `node:test`.
- [x] El resultado original de Fase 1 fue 12 tests, 12 pasados. Fase 2 volvió a ejecutar ambas suites; ver “Verificación de Fase 2”.

---

## Fase 2: adaptador Mongo aislado

### Hecho

- [x] Se añadió `src/Services/temp-moderation/adapters/MongoTempModerationRepository.ts`, que recibe una abstracción de colección Mongo y no crea conexiones, importa modelos de producción ni consulta configuración.
- [x] `claim` expresa elegibilidad, revisión esperada, límite de intentos y lease/retry vencidos en una única `findOneAndUpdate`; genera token, fija lease de 2 minutos e incrementa intentos/revisión.
- [x] `complete` aplica CAS por `_id`, estado pending, `leaseToken` y `revision`; marca completion y limpia el lease sin borrar el documento.
- [x] `releaseForRetry` aplica el mismo ownership; programa backoff para intentos 1–4 y marca fallo permanente al alcanzar el intento 5.
- [x] `markPermanentFailure` conserva el documento, marca fecha/código allowlisted y limpia lease/retry.
- [x] La conversión de ID es inyectable mediante `toMongoId`; el adaptador no asume ni importa un tipo Mongo concreto.
- [x] Se añadió `tests/support/FakeMongoCollection.ts`, que registra y evalúa el subconjunto de filtros/updates utilizado por el adaptador.
- [x] Se añadieron pruebas de adapter en `tests/unit/mongo-temp-moderation-repository.test.cjs`; las pruebas previas del processor continúan en `tests/unit/temp-moderation-processor.test.cjs`.
- [x] El adaptador no crea clientes MongoDB, conexiones, índices ni efectos colaterales al importarse.

### Casos cubiertos

- [x] Filtro de claim con ID, estado, revision, expiración esperada, `expectedTimeoutUntil`, intentos y condiciones de `nextAttemptAt`/`leaseUntil`.
- [x] Un solo `findOneAndUpdate`, incremento de campos y lease calculado desde `now`.
- [x] Segundo claim bloqueado mientras el lease vive y nuevo token tras expirar.
- [x] Claims bloqueados al alcanzar cinco intentos.
- [x] Complete, release y fallo permanente rechazan lease/revision stale.
- [x] Backoff de 30, 60, 120 y 300 segundos para intentos 1–4; quinto fallo transitorio permanente.
- [x] Registro terminal conservado y campos de persistencia sin mensajes arbitrarios.
- [x] Import isolation con imports de clientes reales bloqueados en proceso hijo.

### Verificación de Fase 2

- [x] Typecheck limitado a contratos, processor, adaptador y soporte TypeScript.
- [x] Compilación CommonJS temporal a `/tmp`, sin regenerar `dist`.
- [x] `node:test`: resultado registrado de 22 tests, 22 pasados, 0 fallidos.
- [ ] No se ejecutó prueba contra Mongo real o efímero; no se añadió `mongodb-memory-server` ni otra dependencia.
- [ ] `FakeMongoCollection` prueba la construcción de filtros y updates, no la atomicidad o semántica completa del motor MongoDB.

---

## Estado de garantías

| Propiedad                                          | Estado actual          | Evidencia                                 |
| -------------------------------------------------- | ---------------------- | ----------------------------------------- |
| Contratos sin dependencias externas                | Verificado             | Tests de aislamiento de import            |
| Processor sin side effects                         | Verificado             | Imports aislados; sin timers o conexiones |
| Orden claim → gateway → complete                   | Verificado en harness  | Tests unitarios                           |
| Retry solo tras error transitorio                  | Verificado en harness  | Tests unitarios                           |
| Fallo permanente no completa ni reintenta          | Verificado en harness  | Tests unitarios                           |
| CAS por token y revision                           | Verificado contra fake | Tests del adaptador                       |
| Filtro Mongo atómico expresado                     | Verificado contra fake | Tests de query/update                     |
| Atomicidad real del servidor Mongo                 | Pendiente              | Requiere Mongo aislado                    |
| Integración con cron productivo                    | Pendiente              | Fuera de alcance                          |
| Operación Discord idempotente real                 | Pendiente              | Gateway futuro                            |
| Recuperación ante update Mongo posterior a Discord | Pendiente              | Diseño e integración futura               |

---

## TODO antes de integrar con producción

### 1. Aprobar forma de documentos e inicialización

- [ ] Definir la representación persistida definitiva de `_id`, `status`, `revision`, `attempts`, `leaseToken`, `leaseUntil`, `nextAttemptAt`, `completedAt`, `permanentFailureAt`, `failureCode` y `expectedTimeoutUntil`.
- [ ] Definir defaults/backfill para documentos existentes, que hoy provienen del modelo `TempModeration` anterior y pueden no tener campos nuevos como `revision` o `attempts`.
- [ ] Confirmar el conversor `toMongoId` adecuado para el tipo real de `_id`; el default del adaptador usa el string de entrada.
- [ ] Diseñar/verificar índices para candidatos vencidos y unicidad existente sin ejecutar indexación en producción desde el harness.
- [ ] Definir si `status` usará exactamente `pending`, `completed` y `permanentFailure`, o si se requerirá un estado adicional explícito para cancelación/reprogramación.
- [ ] Definir cómo se representa una expiración sustituida/cancelada sin borrar auditoría histórica.
- [ ] Establecer una versión de esquema o estrategia de migración para documentos anteriores.

### 2. Probar atomicidad del motor

- [ ] Solicitar aprobación antes de añadir cualquier dependencia de Mongo de prueba.
- [ ] Elegir Mongo local/efímero compatible con las operaciones y operadores usados; no usar Atlas.
- [ ] Añadir una prueba de integración que lance claims realmente concurrentes contra Mongo y demuestre que solo uno obtiene el lease.
- [ ] Probar CAS con token incorrecto, revision incorrecta, reprogramación con revision incrementada y lease expirado.
- [ ] Probar que un `complete` stale no puede completar una revisión reprogramada.
- [ ] Probar que un `releaseForRetry` stale no puede borrar o alterar un lease nuevo.
- [ ] Mantener `FakeMongoCollection` como prueba de construcción del query; no considerarla prueba del motor Mongo.
- [ ] Verificar los índices planeados mediante `explain()` o revisión controlada fuera de producción antes de aplicarlos.

### 3. Resolver contrato de retry y leases

- [ ] Decidir si `attempts` cuenta claims exitosos o intentos gateway; la implementación actual cuenta cada claim exitoso.
- [ ] El array aprobado incluye backoff de 600 segundos, pero el límite de cinco claims convierte el quinto fallo inmediatamente en permanente; por ello el escalón de 600 segundos no se usa. Confirmar que esta es la intención o cambiar ambas decisiones juntas.
- [ ] Definir política para claims expirados durante una llamada Discord de hasta 30 segundos y posible desfase de reloj entre procesos.
- [ ] Definir si `leaseUntil` necesita renovación; por ahora no existe heartbeat ni timer.
- [ ] Confirmar que todas las rutas de reprogramación futuras incrementen `revision` para invalidar leases viejos.
- [ ] Definir el identificador de consumidor futuro para observabilidad; no debe contener hostname, IP, token ni información sensible.
- [ ] Definir la política de reintentos después de un resultado ambiguo de red: Discord pudo aplicar la acción aunque el bot no recibiera respuesta.
- [ ] Establecer métricas seguras: claims, completions, retries, permanent failures y leases expirados, sin IDs de usuario o contenido sensible en logs de alto volumen.

### 4. Implementar gateway con invariantes Discord

- [ ] Crear gateway real separado, sin exponer tipos Discord al processor.
- [ ] Tratar ban inexistente como éxito idempotente.
- [ ] Para mute, comprobar `expectedTimeoutUntil` contra el timeout actual antes de limpiarlo; no retirar un timeout posterior.
- [ ] Definir errores Discord retryable/permanent y mapearlos a `ModerationErrorCode`; nunca persistir `Error.message`, stack o raw payload.
- [ ] Fijar timeout de operación menor que el lease de 2 minutos y probar rate limits, permisos y resultado ambiguo después de timeout.
- [ ] Validar que el gateway solo opere sobre `guildId`, `userId`, tipo de moderación y la huella de la sanción esperada.
- [ ] Diseñar una capa de normalización de errores que permita observabilidad sin filtrar contenido sensible.
- [ ] Probar los casos de recurso ausente, permiso faltante, canal/guild inexistente y rate-limit sin conectar el harness a producción.

### 5. Integrar solo después de aprobación

- [ ] Mantener Mongo como source of truth y el cron como único ejecutor inicial.
- [ ] Extraer el processor productivo y adaptar el reconciliador existente a un lote limitado de candidatos que invoque la misma operación segura.
- [ ] No conectar Redis, BullMQ o worker en esta etapa.
- [ ] Confirmar qué respuesta observable conservan tempban/tempmute y qué ocurre si falla el upsert inicial del vencimiento.
- [ ] Validar rollback/recovery cuando la acción Discord sucede pero el update Mongo falla o el lease se pierde.
- [ ] Definir límite de lote por tick del cron, orden de procesamiento y comportamiento cuando hay muchos vencimientos pendientes.
- [ ] Definir el manejo de documentos antiguos que no cumplen el nuevo contrato sin bloquear vencimientos nuevos.
- [ ] Añadir logs allowlisted y métricas de ciclo del reconciliador antes de activar el flujo.
- [ ] Activar primero en entorno de staging con un guild de pruebas y revisar los documentos resultantes antes de producción.
- [ ] Mantener una estrategia de rollback que pueda desactivar la nueva ruta sin perder los documentos de vencimiento existentes.

### 6. Verificaciones futuras

- [ ] Mantener tests unitarios sin conexiones reales.
- [ ] Ejecutar pruebas de integración únicamente contra la instancia Mongo local aprobada.
- [ ] Typecheck/build conforme a `AGENTS.md` cuando una fase de integración esté aprobada; `npm run build` limpia y regenera `dist`.
- [ ] Revisar diff y alcance antes de cada commit; separar cambios de schema, gateway y cron en commits distintos.
- [ ] No ejecutar scripts manuales bajo `Tests/` como tests del procesador.
- [ ] Revisar que el bundle compilado no introduzca imports accidentales de Redis, BullMQ o clientes no autorizados.
- [ ] Verificar con tests de reinicio que los vencimientos pendientes siguen reclamables después de reiniciar el proceso.
- [ ] Ejecutar una revisión de seguridad de logs antes de habilitar el processor productivo.

---

## Roadmap de mejoras futuras

### Fase 3: semántica Mongo real

**Objetivo:** validar que el servidor MongoDB aplica realmente el protocolo atómico diseñado por el adaptador.

```text
Mongo local/efímero aprobado
→ pruebas de concurrencia real
→ validación de filtros CAS
→ prueba de leases stale
→ prueba de reprogramación y revision
```

Criterio de salida:

- Un solo consumidor reclama un documento concurrentemente.
- Un consumer stale no puede completar, liberar ni marcar fallido un documento reprogramado.
- Los documentos terminales se conservan.
- Las pruebas no usan Atlas ni credenciales reales.

### Fase 4: gateway Discord aislado

**Objetivo:** encapsular la reversión de tempban/tempmute y normalizar sus errores.

```text
Processor
→ ModerationGateway
→ Discord adapter
```

Criterio de salida:

- Ban inexistente es éxito idempotente.
- Timeout posterior no se retira accidentalmente.
- Errores se convierten a códigos allowlisted.
- Cada operación tiene timeout inferior a 2 minutos.
- No se filtran tokens, mensajes, razones, payloads ni stacks en persistencia o logs.

### Fase 5: integración limitada con cron

**Objetivo:** conectar el protocolo seguro al reconciliador existente, sin Redis ni colas.

```text
Cron existente
→ consulta lote limitado de candidatos
→ processor
→ Mongo adapter + gateway
```

Criterio de salida:

- Solo cron ejecuta la tarea.
- Hay límite por lote y métricas allowlisted.
- Staging valida el ciclo completo.
- El rollback puede desactivar la integración sin borrar vencimientos.

### Fase 6: operación y observabilidad

**Objetivo:** estabilizar comportamiento real antes de añadir infraestructura adicional.

- Métricas de claims, completions, retries y permanent failures.
- Alertas de acumulación de vencimientos pendientes.
- Revisión de índices y consumo Mongo.
- Pruebas de reinicio de proceso.
- Estrategia de auditoría y retención aprobada.
- Corrección de documentos legacy/migraciones si resultan necesarias.

### Fase 7: evaluación de Redis y BullMQ

Redis/BullMQ solo deben evaluarse cuando la integración con Mongo + cron sea estable y exista una necesidad demostrable, por ejemplo:

- Alto volumen de vencimientos que el cron con lotes no puede procesar dentro del intervalo objetivo.
- Necesidad de distribución real entre múltiples procesos o VPS.
- Reintentos más complejos, prioridades, delayed jobs o métricas de cola.
- Separación operacional deseada entre gateway Discord y proceso principal del bot.

Principios si se aprueba esta evolución:

```text
MongoDB sigue siendo fuente de verdad.
Redis/BullMQ no reemplazan el estado durable de moderación.
La cola es una proyección/reconciliable de documentos Mongo.
El cron o reconciliador puede reinsertar trabajos perdidos.
Los workers siguen usando leaseToken + revision + CAS.
```

---

## Operación actual de producción

La producción actual no usa este harness.

```text
Rama activa desplegada: master
Proceso: Hoshiko-Production
Gestor: PM2
Modo: fork, una instancia
Usuario del proceso: hanna
Ubicación: /home/hanna/apps/HannaeX
Entorno: production
Archivo de entorno: .env.production con permisos restrictivos
Healthcheck local: http://127.0.0.1:8080/healthz
```

Comandos operativos actuales:

```bash
pm2 status
pm2 logs Hoshiko-Production --lines 100
curl -i http://127.0.0.1:8080/healthz
```

Reglas operativas:

- No ejecutar `npm start` mientras PM2 gestiona el bot.
- No abrir el puerto 8080 públicamente sin reverse proxy, TLS y controles de acceso.
- No usar `pm2 delete all`.
- No compartir `.env.production`, tokens Discord, URI MongoDB, API keys ni claves privadas SSH.
- No desplegar `refactor/arquitectura` sobre `master` sin revisión explícita, pruebas y plan de rollback.
- No usar Redis, BullMQ o workers como atajo antes de completar las fases de Mongo, gateway y cron.

---

## Fuera de alcance realizado

- [x] No se modificaron Commands, Events, cron existente, `TempModerationService`, modelo `TempModeration` ni conexión Mongo productiva.
- [x] No se integró el adaptador con producción ni se inició un servicio.
- [x] No se añadieron dependencias, scripts npm, queues, processors Discord, timers de negocio, Redis, BullMQ o workers.
- [x] No se leyó `.env`, no se contactó Atlas y no se hizo commit.

---

## Criterio para retomar

Al retomar el trabajo, no saltar directamente a producción.

Orden recomendado:

```text
1. Revisar git status y conservar cambios locales.
2. Revisar este documento y confirmar decisiones pendientes.
3. Aprobar Fase 3: pruebas reales contra Mongo local/efímero.
4. Aprobar Fase 4: gateway Discord aislado.
5. Aprobar Fase 5: integración limitada con cron en staging.
6. Evaluar Redis/BullMQ solo después de datos operativos reales.
```

---

## Decisión pendiente: backoff y máximo de intentos

Hay una inconsistencia a resolver antes de Fase 3:

```text
El plan menciona backoff de 600 segundos,
pero el límite de cinco claims convierte el quinto fallo en permanentFailure.
Por tanto, el escalón de 600 segundos nunca se utiliza.
```

Opciones coherentes:

```text
Opción A:
Máximo 5 claims.
Backoff efectivo: 30, 60, 120, 300 segundos.
El quinto fallo pasa a permanentFailure.
Eliminar 600 segundos de la especificación.

Opción B:
Máximo 6 claims.
Backoff efectivo: 30, 60, 120, 300, 600 segundos.
El sexto fallo pasa a permanentFailure.
```

**Recomendación:** Opción A. Mantener cinco claims máximos, usar cuatro escalones reales de backoff y eliminar los 600 segundos de la especificación. Así el contrato, tests y comportamiento productivo futuro permanecen alineados.
