---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Arquitectura — Recuperación ante fallos

## Propósito

Esta nota define cómo HannaeX debe detectar, contener, recuperarse y aprender de fallos técnicos, errores de dependencias, pérdida de procesos, corrupción de datos o interrupciones externas.

El objetivo no es asumir que nunca habrá fallos. El objetivo es limitar su impacto y recuperar el servicio de forma controlada.

## Principio central

```text
Un fallo debe ser detectable, aislable, recuperable y documentable.
```

## Tipos de fallo

### Fallos de proceso

- Crash.
- OOM.
- Loop bloqueado.
- Reinicio inesperado.
- Error no tratado.

### Fallos de red

- Timeout.
- Desconexión.
- DNS.
- Paquetes perdidos.
- Latencia elevada.

### Fallos de Discord

- Gateway no disponible.
- Rate limit.
- Error REST.
- Guild no disponible.
- Canal eliminado.
- Permiso retirado.

### Fallos de persistencia

- Base caída.
- Conexiones agotadas.
- Consulta lenta.
- Índice incorrecto.
- Migración incompleta.
- Corrupción o inconsistencia.

### Fallos de workers

- Job atascado.
- Reintentos agotados.
- Dead-letter creciente.
- Worker incompatible.
- Scheduler duplicado.

### Fallos de integraciones

- Proveedor de IA caído.
- API de música no disponible.
- Webhook inválido.
- Cuota agotada.
- Credencial revocada.

### Fallos de seguridad

- Token expuesto.
- Acceso no autorizado.
- Mezcla de datos.
- Manipulación de payload.
- Abuso masivo.

## Estados del servicio

HannaeX puede representar estados operativos como:

```text
healthy
        ↓
degraded
        ↓
partially_unavailable
        ↓
unavailable
        ↓
recovering
        ↓
healthy
```

El estado debe reflejar la capacidad real de procesar funciones, no solo que el proceso esté vivo.

## Detección

Los fallos pueden detectarse mediante:

- Excepciones.
- Health checks.
- Timeouts.
- Métricas.
- Alertas.
- Jobs fallidos.
- Reportes de usuarios.
- Diferencias de integridad.
- Logs de Discord.
- Fallos de auditoría.

La detección debe producir suficiente contexto para investigar sin registrar datos privados innecesarios.

## Clasificación por impacto

### Bajo

Afecta una operación aislada y tiene alternativa sencilla.

### Medio

Afecta una feature o un grupo reducido de guilds.

### Alto

Afecta datos críticos, economía, moderación, seguridad o muchas comunidades.

### Crítico

Afecta disponibilidad general, credenciales, integridad de datos o privacidad de múltiples usuarios.

## Flujo de respuesta

```text
Detectar
   ↓
Clasificar
   ↓
Contener
   ↓
Mantener o restaurar funciones seguras
   ↓
Investigar causa
   ↓
Corregir
   ↓
Verificar recuperación
   ↓
Documentar
```

## Contención

La contención puede incluir:

- Desactivar una feature.
- Abrir un circuit breaker.
- Pausar workers.
- Bloquear una integración.
- Reducir concurrencia.
- Activar modo mantenimiento.
- Revocar una credencial.
- Detener acciones destructivas.
- Aislar un guild o flujo afectado.

La contención debe ser proporcional y reversible cuando sea posible.

## Modo degradado

Cuando falla una dependencia, HannaeX debe mantener funciones independientes.

Ejemplos:

| Dependencia caída | Funciones que pueden continuar |
|---|---|
| IA | Comandos deterministas y utilidades |
| Música | Comunidad, XP y economía |
| Caché | Persistencia con límites |
| Worker de resúmenes | Interacciones inmediatas |
| Proveedor secundario | Funciones locales |
| Discord REST parcial | Procesamiento interno y reintentos controlados |

No debe presentarse como completada una acción que quedó pendiente.

## Reinicio de procesos

Después de un reinicio, HannaeX debe:

- Cargar configuración validada.
- Verificar migraciones.
- Reconectar dependencias.
- Recuperar jobs pendientes.
- Detectar sesiones incompletas.
- Revalidar estado de schedulers.
- Evitar duplicar eventos o notificaciones.
- Emitir un health check.

## Reconexión a Discord

La reconexión debe:

- Utilizar backoff.
- Respetar límites.
- Registrar la causa.
- Evitar múltiples conexiones duplicadas.
- Confirmar que el cliente está listo antes de procesar operaciones dependientes.

Los eventos recibidos durante una interrupción deben manejarse según las garantías reales de la plataforma.

## Recuperación de jobs

Los jobs pendientes deben tener estados persistentes o una cola durable cuando sean importantes.

Después de un reinicio:

```text
Cargar jobs no finalizados
        ↓
Detectar lease expirado
        ↓
Verificar idempotencia
        ↓
Reanudar o enviar a retry
        ↓
Marcar resultado
```

Un job no debe reanudarse si el estado actual ya muestra que la operación se completó.

## Recuperación de sesiones de voz

Las sesiones de voz pueden quedar abiertas si el proceso se cae.

Debe definirse:

- Cómo detectar sesiones antiguas.
- Cuándo cerrarlas automáticamente.
- Cómo evitar XP duplicada.
- Cómo marcar el cierre como estimado.
- Cómo informar diferencias si son relevantes.

## Recuperación de economía

La economía requiere una estrategia de reconciliación.

Debe poder compararse:

- Saldo actual.
- Historial de transacciones.
- Recompensas asignadas.
- Claves idempotentes.
- Operaciones incompletas.

Si existe una diferencia:

- Detener operaciones de alto riesgo.
- Registrar incidente.
- Recalcular cuando sea seguro.
- Requerir revisión administrativa para correcciones sensibles.

## Recuperación de persistencia

Debe existir un plan para:

- Error de conexión.
- Base temporalmente caída.
- Índice faltante.
- Migración incompleta.
- Datos parcialmente escritos.
- Restauración desde backup.

La aplicación no debe continuar escribiendo datos críticos si no puede garantizar consistencia.

## Backups

Los backups deben tener:

- Frecuencia definida.
- Retención definida.
- Control de acceso.
- Cifrado.
- Verificación de integridad.
- Pruebas de restauración.
- Registro de resultado.

Un backup no verificado no debe considerarse suficiente para recuperación.

## Objetivos de recuperación

Deben definirse dos objetivos:

### RPO

Cuánta pérdida de datos es aceptable después de un incidente.

### RTO

Cuánto tiempo puede tardar la recuperación del servicio.

Los objetivos pueden variar por tipo de dato:

| Dato | RPO | RTO |
|---|---|---|
| Configuración | Bajo | Bajo |
| Economía | Muy bajo | Bajo o medio |
| XP | Bajo o medio | Medio |
| Memoria | Según política | Medio |
| Logs | Medio | Bajo o medio |
| Caché | Alto | Bajo |

Los valores finales deben decidirse según el producto y la infraestructura.

## Rollback y compensación

No todos los cambios pueden deshacerse.

### Rollback

Revertir a una versión o estado anterior.

### Compensación

Aplicar una nueva operación que corrija el efecto de la anterior.

Ejemplos:

- Devolver un saldo mediante una transacción inversa.
- Reprocesar una recompensa faltante.
- Marcar una sanción incorrecta para revisión.
- Restaurar una configuración anterior.

Las compensaciones deben quedar auditadas.

## Integridad

Los datos críticos deben tener comprobaciones de integridad.

Ejemplos:

- Saldo no negativo cuando la policy lo exige.
- Transacciones coherentes.
- Una recompensa no duplicada.
- Datos pertenecientes al guild correcto.
- Versión de esquema compatible.
- Jobs con payload válido.

## Incident response

Un incidente debe registrar:

```ts
interface IncidentRecord {
  incidentId: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "contained" | "recovering" | "resolved";
  summary: string;
  detectedAt: Date;
  resolvedAt?: Date;
  affectedFeatures?: string[];
  affectedGuilds?: string[];
  rootCause?: string;
  correctiveActions?: string[];
}
```

No debe almacenarse información personal más allá de la necesaria para operar el incidente.

## Comunicación

La comunicación depende del impacto.

Debe informarse a usuarios cuando:

- Una función que estaban usando falló.
- Una operación quedó pendiente.
- Existe riesgo de duplicación o retraso.
- Se requiere que repitan una acción.

Debe informarse a administradores cuando:

- Se cambió una configuración.
- Una feature quedó deshabilitada.
- Se requiere revisar permisos.
- Existe un impacto local en el guild.

La comunicación debe ser clara y no especulativa.

## Seguridad durante la recuperación

Durante un incidente:

- Reducir permisos temporales si es necesario.
- Rotar credenciales comprometidas.
- No copiar secretos a canales de soporte.
- Evitar desactivar controles sin registrar el motivo.
- Verificar restauraciones antes de exponer el servicio.
- Revisar jobs y webhooks para evitar replay.

## Postmortem

Después de un incidente importante debe realizarse una revisión:

- Qué ocurrió.
- Cómo se detectó.
- Qué impacto tuvo.
- Qué controles funcionaron.
- Qué controles fallaron.
- Cuál fue la causa raíz.
- Qué acciones evitarán repetición.
- Qué documentación debe actualizarse.

El objetivo es mejorar el sistema, no asignar culpa.

## Pruebas de recuperación

Debe probarse periódicamente:

- Reinicio del bot.
- Reconexión a Discord.
- Caída de base de datos.
- Caída de caché.
- Caída de proveedor de IA.
- Worker detenido.
- Job duplicado.
- Webhook repetido.
- Restauración de backup.
- Rollback de aplicación.
- Activación de modo degradado.
- Rotación de secretos.

## Estado actual

Esta nota define una estrategia planificada de recuperación ante fallos.

Debe verificarse en el repositorio y la infraestructura real:

- Cómo se reinicia el proceso.
- Si existe health check.
- Cómo se recuperan jobs.
- Qué backups existen.
- Cómo se ejecutan migraciones.
- Si existe modo degradado.
- Cómo se manejan reconexiones.
- Qué logs y alertas están disponibles.
- Cómo se registran incidentes.

## Ruta de implementación

1. Inventariar dependencias críticas.
2. Definir estados degradados.
3. Clasificar fallos por impacto.
4. Añadir health checks.
5. Proteger jobs con idempotencia.
6. Documentar reinicios y reconexiones.
7. Verificar backups y restauración.
8. Crear procedimientos de rollback y compensación.
9. Definir objetivos RPO y RTO.
10. Probar escenarios de fallo.
11. Crear plantilla de incidentes y postmortems.

## Decisiones pendientes

- ¿Qué funciones deben continuar en modo degradado?
- ¿Cuáles son los RPO y RTO por área?
- ¿Dónde se almacenan backups?
- ¿Cómo se ejecutan restauraciones?
- ¿Qué incidentes requieren comunicación externa?
- ¿Quién puede activar modo mantenimiento?
- ¿Cómo se compensan errores de economía?
- ¿Qué pruebas de recuperación se automatizarán?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[Arquitectura — Escalabilidad]]
- [[06-Registro]]
