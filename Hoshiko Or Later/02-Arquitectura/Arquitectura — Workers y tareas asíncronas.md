---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Arquitectura — Workers y tareas asíncronas

## Propósito

Esta nota define cómo HannaeX debe ejecutar tareas que no necesitan bloquear el evento principal de Discord.

El objetivo es mantener respuestas rápidas, evitar timeouts y separar el procesamiento inmediato de trabajos largos, repetitivos o reintentables.

La arquitectura descrita es objetivo. Los workers, colas y schedulers reales deben verificarse en el repositorio antes de marcarse como implementados.

## Principio central

```text
El evento recibe y confirma rápido.
El worker procesa lo que puede esperar.
```

No todo debe ir a una cola. Las tareas pequeñas y deterministas pueden ejecutarse directamente cuando no comprometan el tiempo de respuesta.

## Cuándo utilizar procesamiento asíncrono

Una tarea debería considerar worker o cola cuando:

- Puede tardar más que el tiempo permitido por Discord.
- Consulta un proveedor externo lento.
- Procesa muchos registros.
- Puede reintentarse de forma segura.
- No necesita completar antes de responder.
- Debe ejecutarse periódicamente.
- Puede agruparse con otras tareas.
- Requiere aislamiento del proceso principal.
- Consume recursos elevados.
- Puede fallar sin invalidar toda la interacción.

## Cuándo no utilizarlo

No es necesario añadir una cola para:

- Validar un argumento sencillo.
- Leer una configuración pequeña.
- Responder un comando de baja latencia.
- Ejecutar una operación atómica rápida.
- Renderizar una respuesta simple.

La asincronía también añade complejidad. Debe justificarse por rendimiento, confiabilidad o separación de responsabilidades.

## Flujo básico

```text
Evento de Discord
        ↓
Validación mínima
        ↓
Encolar trabajo
        ↓
Confirmar recepción
        ↓
Worker toma el trabajo
        ↓
Procesa la tarea
        ↓
Guarda resultado
        ↓
Notifica o actualiza estado
```

## Componentes

### Producer

El producer crea y publica el trabajo.

Ejemplos:

- Event handler.
- Servicio de aplicación.
- Scheduler.
- Webhook handler.
- Otro worker.

### Queue

La cola conserva los trabajos pendientes y coordina su entrega.

Debe definir:

- Nombre de la cola.
- Formato del mensaje.
- Prioridad.
- Retención.
- Número máximo de reintentos.
- Política de backoff.
- Dead-letter queue.
- Límite de concurrencia.

### Worker

El worker consume trabajos y ejecuta la lógica necesaria.

Debe:

- Validar el mensaje.
- Registrar un `jobId`.
- Verificar idempotencia.
- Ejecutar la tarea.
- Guardar el resultado.
- Marcar éxito o fallo.
- Liberar recursos.
- Respetar cancelación cuando sea posible.

### Scheduler

El scheduler crea trabajos programados.

Ejemplos:

- Limpieza de cooldowns.
- Resúmenes diarios.
- Mantenimiento de índices.
- Revisión de sesiones de voz abiertas.
- Expiración de memoria.
- Sincronización de configuraciones.
- Notificaciones programadas.

## Tipos de trabajos

### Trabajos rápidos

- Actualizar una estadística.
- Invalidar caché.
- Enviar una notificación.
- Registrar una métrica.

### Trabajos medianos

- Procesar un lote de eventos.
- Actualizar un ranking.
- Sincronizar roles.
- Generar un resumen corto.

### Trabajos largos

- Analizar historial.
- Generar embeddings.
- Crear resúmenes extensos.
- Procesar archivos.
- Sincronizar muchas comunidades.
- Ejecutar migraciones de datos.

## Contrato de un trabajo

```ts
interface JobEnvelope<TPayload = unknown> {
  jobId: string;
  type: string;
  version: number;
  payload: TPayload;
  createdAt: Date;
  availableAt?: Date;
  attempts: number;
  maxAttempts: number;
  priority?: number;
  correlationId?: string;
  idempotencyKey?: string;
}
```

El payload debe ser suficiente para procesar el trabajo sin depender de estado frágil en memoria.

## Versionado de trabajos

Los mensajes de cola pueden sobrevivir a una actualización del bot.

Por eso deben incluir una versión:

```text
Job v1
    ↓
Worker compatible
    ↓
Migración o rechazo controlado
```

Un worker no debe interpretar silenciosamente un payload con formato incompatible.

## Idempotencia

Un trabajo puede ejecutarse más de una vez debido a:

- Reintentos.
- Reinicio del worker.
- Timeout después de completar una acción.
- Entrega duplicada.
- Error al confirmar el mensaje.

Las operaciones idempotentes deben utilizar una clave estable.

Ejemplos:

```text
reward:guildId:userId:eventId
notification:guildId:userId:achievementId
voice-close:sessionId
summary:guildId:periodStart
```

La clave debe proteger únicamente la operación correspondiente.

## Estados del trabajo

```ts
type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "retrying"
  | "failed"
  | "dead_lettered"
  | "cancelled";
```

Cada transición debe registrarse cuando la tarea sea importante.

## Reintentos

Los reintentos deben depender del tipo de error.

### Reintentable

- Timeout temporal.
- Rate limit.
- Error de red.
- Servicio externo no disponible.
- Fallo transitorio de base de datos.

### No reintentable

- Payload inválido.
- Permiso insuficiente.
- Recurso eliminado.
- Configuración inválida.
- Operación duplicada ya completada.
- Violación de una policy.

## Backoff

Se recomienda aumentar el tiempo entre intentos.

```text
Intento 1 → espera corta
Intento 2 → espera mayor
Intento 3 → espera mayor
Intento final → dead-letter o fallo definitivo
```

El backoff debe incluir límites para evitar esperas indefinidas.

## Dead-letter queue

Los trabajos que no pueden completarse deben enviarse a una cola de revisión o almacenamiento de fallos.

Debe conservarse:

- `jobId`.
- Tipo.
- Error clasificado.
- Último intento.
- Número de intentos.
- `correlationId`.
- Datos mínimos para diagnóstico.

No deben almacenarse secretos ni contenido privado innecesario.

## Concurrencia

El número de workers y trabajos simultáneos debe limitarse.

Riesgos:

- Golpear rate limits.
- Duplicar recompensas.
- Saturar la base de datos.
- Procesar dos veces la misma sesión.
- Generar demasiadas solicitudes de IA.
- Consumir toda la memoria.

La concurrencia puede limitarse por:

- Tipo de cola.
- Guild.
- Usuario.
- Proveedor externo.
- Tipo de operación.
- Capacidad del proceso.

## Particiones lógicas

Cuando el orden importe, los trabajos pueden agruparse por clave.

Ejemplos:

```text
guild:guildId
user:guildId:userId
session:sessionId
account:guildId:userId
```

Esto permite procesar en paralelo distintas claves, pero serializar operaciones sobre la misma entidad.

## Rate limits externos

Cada integración debe tener sus propios límites.

Ejemplos:

- Discord REST.
- Gemini.
- APIs de música.
- Servicios de pagos.
- Servicios de imágenes.

La cola no debe eliminar el rate limit; debe ayudar a respetarlo.

Estrategias:

- Rate limiter por proveedor.
- Backoff.
- Agrupación de solicitudes.
- Priorización.
- Cache.
- Degradación controlada.

## Prioridades

No todos los trabajos tienen la misma urgencia.

### Alta prioridad

- Respuesta diferida pendiente.
- Acción de seguridad confirmada.
- Actualización crítica de estado.
- Confirmación de una transacción.

### Media prioridad

- Notificación de nivel.
- Actualización de ranking.
- Sincronización de roles.

### Baja prioridad

- Embeddings.
- Limpieza.
- Agregaciones históricas.
- Estadísticas no urgentes.
- Resúmenes antiguos.

La prioridad no debe permitir saltarse permisos o validaciones.

## Cancelación

Un trabajo puede cancelarse cuando:

- Expiró.
- El usuario lo canceló.
- El recurso dejó de existir.
- La configuración cambió.
- La operación ya no es válida.
- Se detectó duplicación.

La cancelación debe ser segura y dejar el estado consistente.

## Timeouts

Cada trabajo debe tener un timeout razonable.

Si no termina dentro del límite:

- Cancelar la operación cuando sea posible.
- Liberar recursos.
- Clasificar el error.
- Reintentar solo si corresponde.
- Evitar trabajos huérfanos.

Las llamadas externas deben tener timeouts propios, no depender únicamente del timeout global del worker.

## Persistencia de trabajos

Los trabajos críticos no deben existir únicamente en memoria.

La cola o el sistema de persistencia debe permitir:

- Recuperación después de reinicio.
- Reentrega controlada.
- Identificación de trabajos activos.
- Inspección de fallos.
- Limpieza de trabajos antiguos.

## Trabajos periódicos

Los schedulers deben ser idempotentes porque pueden dispararse dos veces.

Ejemplos:

```text
Cada minuto:
  revisar sesiones vencidas

Cada hora:
  limpiar datos temporales

Cada día:
  generar agregados

Cada semana:
  revisar retención y mantenimiento
```

Un scheduler no debe asumir que una ejecución anterior terminó correctamente.

## Ejemplo: sesión de voz

```text
VoiceStateUpdate
        ↓
VoiceTrackingService
        ↓
Abrir o actualizar sesión
        ↓
VoiceSessionCompleted
        ↓
Encolar CalculateVoiceXpJob
        ↓
Worker valida idempotencia
        ↓
Calcular XP
        ↓
Actualizar perfil
        ↓
Evaluar nivel y recompensa
        ↓
Encolar notificación
```

El mensaje de celebración puede ser asíncrono. La integridad del registro de la sesión debe tener prioridad.

## Ejemplo: resumen con IA

```text
Solicitud del usuario
        ↓
Validar permisos y alcance
        ↓
Responder de forma diferida
        ↓
Encolar GenerateSummaryJob
        ↓
Worker carga solo mensajes autorizados
        ↓
Construir contexto limitado
        ↓
Consultar proveedor de IA
        ↓
Validar respuesta
        ↓
Guardar o entregar resumen
        ↓
Eliminar contexto temporal cuando corresponda
```

El worker no debe enviar al modelo todo el historial por defecto.

## Ejemplo: notificación

```text
LevelUpEvent
        ↓
Encolar LevelUpNotificationJob
        ↓
Verificar que la notificación no fue enviada
        ↓
Cargar configuración del guild
        ↓
Validar canal y permisos
        ↓
Renderizar mensaje
        ↓
Enviar a Discord
        ↓
Registrar resultado
```

Si el canal ya no existe, el trabajo debe fallar de forma controlada y no reintentarse indefinidamente.

## Degradación controlada

Si un worker o proveedor no está disponible:

- Mantener las funciones críticas independientes cuando sea posible.
- Marcar el trabajo como pendiente o fallido.
- Informar al usuario si esperaba un resultado.
- No inventar que el trabajo terminó.
- Permitir reintento manual o automático seguro.

## Observabilidad

Cada trabajo debería producir métricas como:

- Trabajos creados.
- Trabajos completados.
- Trabajos fallidos.
- Duración.
- Reintentos.
- Tamaño de cola.
- Edad del trabajo más antiguo.
- Dead-letter count.
- Rate-limit count.
- Tasa de cancelación.

Logs recomendados:

```text
jobId
jobType
attempt
status
correlationId
guildId, si es necesario
provider
errorCode
durationMs
```

No deben incluirse payloads completos si contienen datos privados.

## Seguridad

Los workers deben:

- Validar el payload.
- No confiar en permisos guardados sin verificar cuando la acción sea sensible.
- Limitar acceso por tipo de trabajo.
- Evitar ejecutar contenido generado por IA como comando.
- No registrar secretos.
- Respetar separación por guild.
- Limitar el alcance de los datos cargados.

## Pruebas

Debe probarse:

- Publicación de trabajos.
- Consumo.
- Reintentos.
- Backoff.
- Idempotencia.
- Dead-letter.
- Timeouts.
- Cancelación.
- Concurrencia.
- Reinicio del worker.
- Payloads inválidos.
- Pérdida de proveedor externo.
- Aislamiento por guild.

## Operación y despliegue

Debe definirse si los workers:

- Corren en el mismo proceso que el bot.
- Corren en un proceso separado.
- Se escalan horizontalmente.
- Comparten la misma cola.
- Tienen límites propios de memoria.
- Utilizan una base de datos común.

Para una primera etapa, un proceso compartido puede ser suficiente si las tareas son pocas y están bien limitadas. La separación se vuelve más importante cuando el procesamiento puede bloquear el bot.

## Estado actual

Esta nota describe una arquitectura planificada.

Debe verificarse en el repositorio real:

- Si existe un sistema de colas.
- Si hay workers separados.
- Qué tareas usan timers.
- Qué operaciones bloquean listeners.
- Cómo se reintentan fallos.
- Si existe dead-letter storage.
- Si hay métricas de trabajos.
- Cómo se recuperan trabajos tras reinicios.

## Ruta de implementación

1. Inventariar tareas lentas y periódicas.
2. Medir duración y frecuencia.
3. Separar tareas críticas de tareas secundarias.
4. Definir contratos de trabajo.
5. Añadir idempotencia.
6. Implementar una cola para el caso de mayor valor.
7. Añadir reintentos y backoff.
8. Añadir dead-letter handling.
9. Incorporar métricas.
10. Separar workers del proceso principal cuando sea necesario.

## Decisiones pendientes

- ¿Qué sistema de colas se utilizará?
- ¿Qué tareas deben salir primero del proceso principal?
- ¿Se utilizará Redis u otra infraestructura?
- ¿Cómo se desplegarán los workers?
- ¿Qué trabajos requieren orden por guild o usuario?
- ¿Qué payloads deben versionarse?
- ¿Cuál será el límite de reintentos por tipo de tarea?
- ¿Qué trabajos pueden cancelarse?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[Arquitectura — Escalabilidad]]
 