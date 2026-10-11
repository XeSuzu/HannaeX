---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Arquitectura — Flujo de eventos

## Propósito

Esta nota define el flujo general mediante el cual HannaeX recibe eventos de Discord, los procesa, ejecuta la lógica correspondiente y produce una respuesta o acción.

El objetivo es separar claramente:

- Entrada de eventos.
- Identificación de contexto.
- Validación.
- Enrutamiento.
- Lógica de negocio.
- Persistencia.
- Respuesta.
- Registro y manejo de errores.

Esta nota describe la arquitectura objetivo. La implementación real debe verificarse en el repositorio antes de marcar cualquier componente como terminado.

## Flujo general

```text
Discord Gateway / Interaction
          ↓
Cliente de Discord
          ↓
Event Handler
          ↓
Normalización del evento
          ↓
Construcción de contexto
          ↓
Validación inicial
          ↓
Router
          ↓
Feature Handler
          ↓
Servicio de dominio
          ↓
Persistencia o integración externa
          ↓
Resultado estructurado
          ↓
Response Renderer
          ↓
Discord API
```

## Principios

El flujo de eventos debe cumplir estas reglas:

- Cada evento tiene un punto de entrada identificable.
- La lógica de negocio no debe vivir directamente en el listener.
- Los comandos deben delegarse a handlers especializados.
- Los servicios deben ser reutilizables fuera de Discord cuando sea posible.
- Las validaciones deben ocurrir antes de acciones irreversibles.
- Los errores deben tener un camino controlado.
- Las respuestas deben diferenciar éxito, rechazo y fallo.
- Las tareas lentas no deben bloquear el evento principal.
- Las funciones deben respetar el aislamiento por servidor.
- El contexto debe limitarse a los datos necesarios.

## Tipos de eventos

HannaeX puede recibir varios tipos de eventos.

### Eventos de interacción

- Slash commands.
- User context commands.
- Message context commands.
- Buttons.
- Select menus.
- Modals.
- Autocomplete.

### Eventos de mensajes

- Mensaje creado.
- Mensaje eliminado.
- Mensaje editado.
- Reacción añadida o eliminada.
- Thread creado.
- Thread actualizado.

### Eventos de miembros

- Miembro incorporado.
- Miembro abandonó el servidor.
- Cambio de roles.
- Cambio de nickname.
- Actualización de usuario.

### Eventos de voz

- Entrada a canal de voz.
- Salida de canal de voz.
- Cambio de canal.
- Cambio de estado de voz.
- Inicio o final de una sesión registrada.

### Eventos de servidor

- Guild disponible.
- Guild no disponible.
- Canal creado, actualizado o eliminado.
- Rol creado, actualizado o eliminado.
- Configuración modificada.

### Eventos internos

- Tarea programada.
- Worker completó un trabajo.
- Integración externa respondió.
- Cooldown expiró.
- Nivel actualizado.
- Recompensa otorgada.
- Incidente creado.
- Memoria actualizada.

## Capas del flujo

### 1. Entrada

La entrada recibe el evento desde Discord o desde un sistema interno.

Responsabilidades:

- Recibir el payload.
- Detectar el tipo de evento.
- Responder dentro de los límites de la plataforma cuando sea necesario.
- Evitar lógica de negocio compleja.

No debe:

- Consultar múltiples modelos directamente.
- Ejecutar toda la lógica de una feature.
- Construir respuestas complejas en línea.
- Ocultar errores.

### 2. Normalización

La normalización convierte los eventos externos en una representación interna consistente.

Ejemplo conceptual:

```ts
interface NormalizedEvent {
  id: string;
  type: string;
  source: "discord" | "internal" | "scheduler";
  guildId?: string;
  channelId?: string;
  userId?: string;
  receivedAt: Date;
  payload: unknown;
}
```

La normalización permite que los servicios no dependan innecesariamente de detalles específicos del SDK.

### 3. Contexto

El contexto reúne los datos necesarios para procesar el evento.

```ts
interface EventContext {
  eventId: string;
  guildId?: string;
  channelId?: string;
  userId?: string;
  memberId?: string;
  permissions: string[];
  locale?: string;
  feature?: string;
  correlationId: string;
}
```

El contexto debe ser explícito. No se debe depender de variables globales mutables para identificar el servidor o usuario actual.

### 4. Validación

Antes de ejecutar una acción, HannaeX debe validar:

- Tipo de evento.
- Usuario disponible.
- Servidor disponible cuando aplique.
- Permisos.
- Configuración del servidor.
- Argumentos.
- Cooldowns.
- Límites del plan.
- Estado de la integración.
- Riesgo de duplicación.
- Idempotencia cuando sea necesario.

Una validación fallida debe producir un resultado controlado, no una excepción sin tratar.

### 5. Enrutamiento

El router determina qué handler debe procesar el evento.

Ejemplo conceptual:

```ts
interface EventRouter {
  route(event: NormalizedEvent): Promise<EventHandlerResult>;
}
```

Una tabla de rutas puede verse así:

```text
interactionCreate → InteractionRouter
messageCreate     → MessageRouter
voiceStateUpdate  → VoiceRouter
guildMemberAdd    → CommunityRouter
scheduledTask     → SchedulerRouter
```

El router debe mantener una responsabilidad pequeña: decidir el destino, no ejecutar toda la lógica.

## Handlers

Un handler adapta el evento al servicio correspondiente.

Ejemplo conceptual:

```ts
class InteractionHandler {
  async handle(event: NormalizedEvent): Promise<HandlerResult> {
    const context = await buildContext(event);
    const validation = await validate(context);

    if (!validation.ok) {
      return createFailureResult(validation.reason);
    }

    return commandService.execute(context);
  }
}
```

El handler debe:

- Recibir el evento.
- Crear o recibir el contexto.
- Validar lo básico.
- Delegar en un servicio.
- Convertir el resultado a una salida común.

## Servicios de dominio

Los servicios contienen la lógica de negocio.

Ejemplos:

```text
XpService
LevelService
VoiceTrackingService
EconomyService
ModerationService
SecurityService
MemoryService
AiService
MusicService
```

Un servicio debe poder probarse sin levantar todo el cliente de Discord cuando sea posible.

### Ejemplo

```ts
interface XpService {
  awardXp(input: AwardXpInput): Promise<AwardXpResult>;
  getProfile(input: GetProfileInput): Promise<XpProfile>;
  getLeaderboard(input: LeaderboardInput): Promise<LeaderboardResult>;
}
```

## Resultados estructurados

Los servicios no deberían devolver directamente mensajes finales de Discord.

Se recomienda usar resultados estructurados:

```ts
interface ServiceResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: {
    correlationId?: string;
    durationMs?: number;
    retryable?: boolean;
  };
}
```

Esto permite que distintos canales presenten el mismo resultado:

- Discord.
- Dashboard.
- Logs.
- API futura.
- Tests.

## Response Renderer

El renderer transforma el resultado estructurado en una respuesta adecuada.

```text
Resultado del servicio
        ↓
Respuesta pública o privada
        ↓
Embed, mensaje, modal o actualización
        ↓
Discord API
```

El renderer debe considerar:

- Tipo de interacción.
- Límite de longitud.
- Visibilidad.
- Idioma.
- Configuración del servidor.
- Estado de Hoshiko cuando corresponda.
- Sensibilidad del resultado.

La identidad de Hoshiko puede participar en el texto, pero el renderer debe conservar la información funcional.

## Respuestas inmediatas y diferidas

Algunas interacciones requieren una respuesta inicial rápida.

### Respuesta inmediata

Adecuada cuando el resultado está disponible rápidamente:

```text
Recibir interacción
        ↓
Procesar
        ↓
Responder
```

### Respuesta diferida

Adecuada para tareas lentas:

```text
Recibir interacción
        ↓
Responder que se está procesando
        ↓
Ejecutar tarea
        ↓
Editar o completar respuesta
```

La respuesta diferida debe evitar que el usuario reciba una interacción expirada.

## Tareas asíncronas

Las tareas que no necesitan bloquear la respuesta deben delegarse a workers o colas.

Ejemplos:

- Generación de embeddings.
- Resúmenes largos.
- Procesamiento de historial.
- Recalcular rankings grandes.
- Sincronización con servicios externos.
- Generación de imágenes.
- Limpieza de datos.
- Envío de notificaciones no urgentes.

```text
Evento
  ↓
Respuesta rápida
  ↓
Encolar trabajo
  ↓
Worker
  ↓
Persistencia
  ↓
Notificación opcional
```

## Idempotencia

Los eventos pueden repetirse o procesarse más de una vez.

Las operaciones sensibles deben utilizar una clave idempotente cuando corresponda.

Ejemplos:

- Otorgar una recompensa.
- Registrar un evento de voz.
- Procesar un pago.
- Aplicar una sanción.
- Crear una memoria.
- Emitir una notificación.

Ejemplo conceptual:

```ts
interface IdempotencyRecord {
  key: string;
  eventId: string;
  operation: string;
  createdAt: Date;
  resultHash?: string;
}
```

## Correlation ID

Cada evento debe tener un identificador de correlación para seguirlo a través de las capas.

```text
correlationId
      ↓
handler
      ↓
service
      ↓
database
      ↓
integration
      ↓
response
      ↓
log
```

Esto permite diagnosticar errores sin depender únicamente del contenido del mensaje.

## Manejo de errores

Los errores deben clasificarse.

### Error de usuario

Ejemplos:

- Argumento inválido.
- Falta de selección.
- Acción no permitida.

Respuesta: explicar cómo corregir la solicitud.

### Error de permisos

Ejemplos:

- Usuario sin permiso.
- Bot sin permiso.
- Canal no accesible.

Respuesta: indicar el permiso relevante sin revelar información innecesaria.

### Error de configuración

Ejemplos:

- Canal eliminado.
- Rol configurado inválido.
- Feature sin configuración.

Respuesta: informar que el administrador debe revisar la configuración.

### Error externo

Ejemplos:

- API no disponible.
- Timeout.
- Rate limit.
- Error de Gemini.

Respuesta: indicar que la dependencia falló y si se puede reintentar.

### Error interno

Ejemplos:

- Excepción inesperada.
- Estado imposible.
- Fallo de persistencia.

Respuesta pública breve. Detalle completo únicamente en logs autorizados.

## Resultado de error

```ts
interface ServiceError {
  code: string;
  category: "user" | "permission" | "configuration" | "external" | "internal";
  messageKey: string;
  retryable: boolean;
  details?: unknown;
}
```

Los mensajes públicos deben utilizar claves o plantillas controladas, no errores crudos provenientes de librerías.

## Reintentos

Los reintentos deben aplicarse solo cuando el error sea recuperable.

Adecuado para:

- Timeout temporal.
- Rate limit con espera indicada.
- Fallo transitorio de red.

No adecuado para:

- Falta de permisos.
- Argumento inválido.
- Recurso inexistente.
- Acción duplicada.
- Restricción permanente del plan.

Los reintentos deben tener:

- Límite.
- Backoff.
- Registro.
- Protección contra duplicados.

## Seguridad en el flujo

Cada capa debe recibir únicamente la información necesaria.

El flujo debe impedir:

- Ejecutar comandos sin permisos.
- Usar un `guildId` incorrecto.
- Leer memoria de otro usuario.
- Repetir una acción sensible.
- Confiar en datos no validados del cliente.
- Mostrar errores internos al usuario.
- Ejecutar contenido generado por IA como código sin validación.

## Eventos internos

Los eventos internos permiten desacoplar funciones.

Ejemplo:

```text
VoiceSessionCompleted
        ↓
VoiceTrackingService
        ↓
XpService
        ↓
LevelService
        ↓
RewardService
        ↓
NotificationService
```

Cada servicio debe escuchar únicamente los eventos que necesita.

## Orden de procesamiento

Cuando un evento desencadena varias acciones, debe definirse el orden.

Ejemplo de subida de nivel:

```text
Validar minutos
        ↓
Guardar minutos
        ↓
Calcular XP
        ↓
Guardar XP
        ↓
Determinar nuevo nivel
        ↓
Guardar nivel
        ↓
Calcular recompensa
        ↓
Guardar recompensa
        ↓
Enviar notificación
```

Si una etapa falla, el sistema debe definir si:

- Se revierte todo.
- Se reintenta la etapa.
- Se registra para reparación.
- Se completa parcialmente de forma segura.

## Transacciones y consistencia

Las operaciones relacionadas deben usar una estrategia de consistencia adecuada.

Ejemplos:

- Saldo y transacción deben mantenerse coordinados.
- Recompensa y nivel deben evitar duplicación.
- Registro de voz y XP deben poder auditarse.
- Configuración y permisos deben validarse juntos cuando sea necesario.

La estrategia concreta depende de la base de datos y del código real.

## Observabilidad del evento

Cada evento importante debería poder rastrearse mediante:

- `eventId`.
- `correlationId`.
- Tipo de evento.
- Guild opcional.
- Usuario opcional, con cuidado de privacidad.
- Handler.
- Servicio.
- Duración.
- Resultado.
- Error clasificado.

No deben registrarse tokens, secretos ni contenido privado innecesario.

## Pruebas

El flujo debe probarse por capas.

### Tests unitarios

- Normalización.
- Validaciones.
- Routers.
- Servicios.
- Renderers.
- Clasificación de errores.

### Tests de integración

- Evento → handler.
- Handler → servicio.
- Servicio → base de datos.
- Servicio → integración externa.

### Tests de contrato

- Formato de respuestas.
- Eventos internos.
- Adaptadores externos.
- Estructuras persistidas.

### Tests end-to-end

- Interacción real o simulada completa.
- Permisos.
- Persistencia.
- Respuesta final.
- Recuperación ante errores.

## Estructura conceptual de carpetas

La estructura exacta debe ajustarse al repositorio real, pero una organización posible sería:

```text
src/
├── events/
│   ├── handlers/
│   ├── routers/
│   └── normalizers/
├── commands/
├── features/
├── services/
├── domain/
├── repositories/
├── integrations/
├── workers/
├── queues/
├── renderers/
├── middleware/
├── config/
├── errors/
├── logging/
└── types/
```

Esta estructura es una propuesta, no una descripción confirmada del repositorio.

## Estado actual

El flujo descrito representa la ruta técnica recomendada para HannaeX.

Debe verificarse en el código:

- Qué eventos están conectados.
- Qué handlers existen.
- Qué servicios están implementados.
- Qué funciones ejecutan persistencia.
- Qué tareas usan workers.
- Cómo se manejan los errores.
- Si existe correlación de eventos.
- Qué partes todavía están dentro de listeners.

## Decisiones pendientes

- ¿Cuál es el cliente de Discord utilizado?
- ¿Qué archivo inicia la aplicación?
- ¿Existe un router central?
- ¿Cómo se registran los comandos?
- ¿Qué eventos se procesan actualmente?
- ¿Qué operaciones requieren colas?
- ¿Qué base de datos se utiliza por feature?
- ¿Existe una política común de errores?
- ¿Cómo se gestionan los reintentos?
- ¿Qué operaciones ya son idempotentes?
- ¿Qué estructura de logs existe?

## Notas relacionadas

- [[Arquitectura — Visión general]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[HannaeX — Relación con Hoshiko]]
