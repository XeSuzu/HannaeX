---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Arquitectura — Observabilidad

## Propósito

Esta nota define cómo HannaeX debe producir señales para conocer su estado, detectar fallos, investigar incidentes y medir el comportamiento del sistema.

La observabilidad no consiste únicamente en guardar logs. Debe combinar:

- Logs.
- Métricas.
- Trazas.
- Auditoría.
- Alertas.
- Estado de dependencias.
- Indicadores de negocio.

La arquitectura descrita es planificada. Los mecanismos existentes deben verificarse en el repositorio y en el entorno de despliegue.

## Principio central

```text
Si una operación es importante, debe poder observarse sin exponer datos innecesarios.
```

HannaeX debe poder responder:

- ¿Qué ocurrió?
- ¿Cuándo ocurrió?
- ¿Dónde ocurrió?
- ¿A quién afectó?
- ¿Qué dependencia falló?
- ¿Se completó la operación?
- ¿Cuánto tardó?
- ¿Se repitió?
- ¿Qué cambió antes del fallo?

## Señales principales

### Logs

Registran eventos discretos y detalles contextuales.

### Métricas

Miden cantidades, tasas, duración y capacidad.

### Trazas

Relacionan una operación a través de varias capas o servicios.

### Auditoría

Registra acciones sensibles y cambios importantes.

### Alertas

Notifican condiciones que requieren atención.

## Correlation ID

Cada evento importante debe tener un `correlationId`.

```text
Discord interaction
        ↓
handler
        ↓
use case
        ↓
repository
        ↓
integration
        ↓
response
```

Todos esos pasos deben poder relacionarse con el mismo identificador cuando sea posible.

Ejemplo conceptual:

```ts
interface ObservabilityContext {
  correlationId: string;
  eventId?: string;
  jobId?: string;
  guildId?: string;
  userId?: string;
  feature?: string;
  operation?: string;
}
```

Los identificadores de usuario y guild deben registrarse únicamente cuando sean necesarios y bajo una política segura.

## Logging estructurado

Los logs deben utilizar campos estructurados en lugar de mensajes imposibles de consultar.

Ejemplo:

```json
{
  "level": "info",
  "event": "xp_awarded",
  "feature": "xp",
  "guildId": "...",
  "userId": "...",
  "amount": 25,
  "correlationId": "...",
  "durationMs": 42
}
```

El formato real puede variar, pero debe ser consistente.

## Niveles de log

### Debug

Para información de desarrollo o diagnóstico detallado.

No debe activarse indiscriminadamente en producción.

### Info

Para operaciones normales relevantes:

- Inicio del bot.
- Registro de comandos.
- Conexión exitosa.
- Trabajo completado.
- Configuración actualizada.

### Warn

Para situaciones anómalas que no detienen el sistema:

- Reintento.
- Configuración ausente no crítica.
- Canal no encontrado.
- Rate limit cercano.
- Proveedor degradado.

### Error

Para fallos que impiden completar una operación:

- Excepción controlada.
- Fallo de persistencia.
- Integración caída.
- Worker agotó reintentos.

### Fatal

Para fallos que impiden iniciar o mantener el proceso principal.

No debe utilizarse para cualquier error operativo.

## Datos que no deben registrarse

Nunca deben aparecer en logs:

- Tokens.
- Claves API.
- Contraseñas.
- Cookies.
- URLs firmadas.
- Datos financieros completos.
- Memoria privada completa.
- Contenido completo de conversaciones salvo una necesidad documentada.
- Payloads externos con secretos.

Debe aplicarse redacción automática cuando sea posible.

## Logs de eventos

Cada evento relevante puede registrar:

```ts
interface EventLog {
  eventId?: string;
  eventType: string;
  source: "discord" | "scheduler" | "worker" | "webhook" | "internal";
  status: "received" | "processed" | "rejected" | "failed";
  correlationId: string;
  durationMs?: number;
  errorCode?: string;
  createdAt: Date;
}
```

No todos los eventos necesitan el mismo nivel de detalle.

## Métricas de aplicación

Métricas recomendadas:

- Eventos recibidos.
- Interacciones procesadas.
- Respuestas exitosas.
- Respuestas fallidas.
- Respuestas diferidas.
- Tiempo de respuesta.
- Errores por categoría.
- Rate limits.
- Reintentos.
- Jobs en cola.
- Jobs fallidos.
- Tamaño de caché.
- Consultas lentas.
- Conexiones activas.

## Métricas de plataforma

- Estado del Gateway.
- Latencia de Discord.
- Reconexiones.
- Eventos descartados.
- Errores REST.
- Límites de API.
- Tiempo de respuesta de interacciones.
- Disponibilidad del proceso.

## Métricas de persistencia

- Latencia de consultas.
- Errores de conexión.
- Pool de conexiones.
- Operaciones por segundo.
- Bloqueos.
- Reintentos.
- Tiempo de transacción.
- Fallos de índices.
- Tamaño de colecciones o tablas.
- Edad del backup más reciente.

## Métricas de workers

- Jobs creados.
- Jobs completados.
- Jobs fallidos.
- Jobs reintentados.
- Edad del job más antiguo.
- Tiempo de procesamiento.
- Concurrencia actual.
- Dead-letter count.
- Tasa de cancelación.
- Capacidad disponible.

## Métricas de integraciones

Por cada proveedor:

- Latencia.
- Éxito.
- Error.
- Timeout.
- Rate limit.
- Reintento.
- Circuit breaker.
- Coste o consumo cuando sea posible.
- Uso por feature.

Para IA, puede ser útil registrar:

- Solicitudes.
- Tokens aproximados.
- Tiempo de generación.
- Modelo utilizado.
- Respuestas rechazadas por validación.
- Fallos de seguridad.

No se debe registrar el prompt completo si contiene datos privados.

## Métricas de negocio

Las métricas técnicas no bastan para comprender HannaeX.

Puede ser útil medir:

- Guilds activos.
- Usuarios activos.
- Comandos utilizados.
- Features activas.
- Sesiones de voz procesadas.
- Recompensas otorgadas.
- Transacciones válidas.
- Casos de moderación.
- Solicitudes de IA.
- Memorias guardadas o eliminadas.
- Errores por feature.

Estas métricas deben minimizar datos personales y respetar las políticas de privacidad.

## Trazas

Las trazas pueden representar una operación completa:

```text
Trace: interaction
  ├── receive_event
  ├── validate_permissions
  ├── load_config
  ├── execute_use_case
  ├── query_database
  ├── call_provider
  ├── render_response
  └── send_discord_response
```

Una traza debe contener suficiente contexto para diagnosticar latencia sin registrar contenido sensible.

## Límites de trazas

No todo debe trazarse con el mismo detalle.

Debe evitarse:

- Capturar mensajes privados completos.
- Capturar prompts completos.
- Capturar documentos completos.
- Registrar respuestas financieras completas.
- Generar demasiadas trazas en operaciones de alta frecuencia.

Puede utilizarse muestreo para reducir coste.

## Auditoría

La auditoría es distinta del log operativo.

Debe conservar acciones como:

- Cambio de configuración.
- Activación de una feature.
- Modificación de un saldo.
- Asignación de una recompensa sensible.
- Sanción administrativa.
- Eliminación de datos.
- Cambio de permisos internos.
- Exportación de información.
- Cambio de plan.

Ejemplo:

```ts
interface AuditEvent {
  auditId: string;
  action: string;
  actorId?: string;
  guildId?: string;
  targetId?: string;
  result: "success" | "denied" | "failed";
  reasonCode?: string;
  correlationId?: string;
  createdAt: Date;
}
```

## Alertas

Una alerta debe representar una condición accionable.

### Alertas de disponibilidad

- Bot desconectado.
- Gateway sin conexión.
- Proceso reiniciándose repetidamente.
- Worker detenido.

### Alertas de rendimiento

- Latencia elevada.
- Cola creciendo.
- Consultas lentas.
- Timeout elevado.
- Memoria cercana al límite.

### Alertas de seguridad

- Intentos repetidos de permisos.
- Uso anómalo de comandos.
- Fallos de firma de webhook.
- Credencial rechazada.
- Exposición potencial de secretos.
- Actividad entre guilds inconsistente.

### Alertas de negocio

- Duplicación de transacciones.
- Diferencias de saldo.
- Recompensas repetidas.
- Caída anómala de una feature.

## Calidad de alertas

Una alerta debe definir:

- Condición.
- Severidad.
- Ventana de evaluación.
- Propietario.
- Acción recomendada.
- Enlace a diagnóstico.
- Condición de recuperación.

Evitar alertas que se activen por cualquier error aislado sin impacto real.

## Severidad

```text
Info
  ↓
Warning
  ↓
High
  ↓
Critical
```

La severidad debe depender del impacto, no de la emoción del mensaje.

## Health checks

HannaeX puede exponer o registrar comprobaciones para:

- Proceso activo.
- Conexión a base de datos.
- Caché.
- Colas.
- Discord.
- Proveedores externos críticos.
- Espacio disponible.
- Estado de migraciones.

Debe distinguirse entre:

```text
Liveness  = el proceso sigue vivo.
Readiness = puede aceptar trabajo.
```

Un proceso vivo pero sin base de datos puede no estar listo para procesar operaciones.

## Diagnóstico de una interacción

Cuando un usuario reporta un fallo, el sistema debería poder buscar por:

- `correlationId`.
- Momento aproximado.
- Tipo de comando.
- Guild.
- Código de error.
- Job ID.

La respuesta al usuario puede incluir un identificador seguro de soporte, sin revelar logs internos.

Ejemplo:

```text
No pude completar la operación. Código de referencia: HNX-7F3K.
```

## Diagnóstico de workers

Debe poder conocerse:

- Qué jobs están pendientes.
- Cuáles se están procesando.
- Cuáles agotaron reintentos.
- Qué proveedor los bloquea.
- Qué guild o feature concentra el problema.
- Cuánto tiempo llevan esperando.

## Diagnóstico de dependencias

Cada integración crítica debe exponer estado operativo sin revelar secretos.

Ejemplo:

```ts
interface DependencyStatus {
  name: string;
  status: "healthy" | "degraded" | "unavailable" | "unknown";
  latencyMs?: number;
  checkedAt: Date;
  reasonCode?: string;
}
```

## Retención de observabilidad

Debe definirse cuánto tiempo conservar:

- Logs operativos.
- Auditoría.
- Métricas.
- Trazas.
- Dead-letter jobs.
- Incidentes.

La retención debe equilibrar:

- Diagnóstico.
- Coste.
- Privacidad.
- Obligaciones operativas.

No debe conservarse contenido personal solo porque esté disponible en un log.

## Pruebas

Debe probarse:

- Generación de logs.
- Correlation IDs.
- Redacción de secretos.
- Métricas de éxito y fallo.
- Trazas de operaciones críticas.
- Auditoría de acciones sensibles.
- Health checks.
- Alertas sin falsos positivos excesivos.
- Diagnóstico de jobs.
- Retención y limpieza.

## Estado actual

Esta nota define una estrategia planificada de observabilidad.

Debe verificarse en el repositorio real:

- Qué logger existe.
- Si los logs son estructurados.
- Si se utilizan correlation IDs.
- Qué métricas se recopilan.
- Si hay health checks.
- Cómo se registran errores externos.
- Si existe auditoría.
- Cómo se almacenan logs y métricas.
- Qué alertas están configuradas.

## Ruta de implementación

1. Centralizar el logger.
2. Añadir `correlationId` al flujo de eventos.
3. Clasificar errores.
4. Añadir métricas básicas de latencia y éxito.
5. Redactar secretos y datos privados.
6. Instrumentar workers y proveedores.
7. Añadir auditoría a operaciones sensibles.
8. Implementar health checks.
9. Definir alertas accionables.
10. Revisar retención y costes.

## Decisiones pendientes

- ¿Qué sistema almacenará logs?
- ¿Se utilizarán métricas externas?
- ¿Se requiere tracing distribuido?
- ¿Qué acciones tendrán auditoría obligatoria?
- ¿Cuál será la retención por tipo de señal?
- ¿Qué alertas deben existir desde el primer despliegue?
- ¿Cómo se entregarán alertas al equipo?
- ¿Qué datos podrán incluirse en los reportes de soporte?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Despliegue]]
- [[Arquitectura — Recuperación ante fallos]]
- [[06-Registro]]
