---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Arquitectura — Integraciones externas

## Propósito

Esta nota define cómo HannaeX debe comunicarse con servicios externos sin acoplar toda la aplicación a un proveedor concreto.

Las integraciones externas pueden cambiar, fallar, limitar solicitudes o modificar sus contratos. Por eso deben aislarse detrás de interfaces, adaptadores y políticas comunes.

La arquitectura descrita es planificada. Las integraciones activas y sus implementaciones deben verificarse directamente en el repositorio y en la configuración del entorno.

## Principio central

```text
HannaeX depende de capacidades;
no debe depender innecesariamente de detalles de un proveedor.
```

Ejemplo:

```text
AiProvider
    ↓
GeminiAdapter
```

La lógica de aplicación utiliza `AiProvider`, no construye directamente solicitudes específicas de Gemini en cada comando.

## Tipos de integraciones

### Plataforma principal

- Discord Gateway.
- Discord REST API.
- Discord CDN, cuando aplique.
- Webhooks.

### Inteligencia artificial

- Proveedor de modelos de lenguaje.
- Embeddings.
- Generación de imágenes.
- Moderación asistida.
- Resúmenes.

### Multimedia

- Búsqueda de música.
- Reproducción.
- Letras.
- Metadatos.
- Procesamiento de audio.

### Infraestructura

- Base de datos.
- Caché.
- Colas.
- Almacenamiento de archivos.
- Observabilidad.

### Monetización

- Pagos.
- Suscripciones.
- Webhooks de facturación.
- Gestión de planes.

### Servicios auxiliares

- Correo.
- Notificaciones.
- Analytics.
- Dashboard.
- Sistemas de soporte.

## Capas de una integración

```text
Feature o caso de uso
        ↓
Interfaz / puerto
        ↓
Servicio de integración
        ↓
Adaptador del proveedor
        ↓
Cliente SDK o HTTP
        ↓
Servicio externo
```

El adaptador transforma:

- Modelo interno → formato del proveedor.
- Respuesta del proveedor → modelo interno.
- Error externo → error clasificado de HannaeX.

## Contratos internos

Una integración debe exponer una interfaz mínima.

### Proveedor de IA

```ts
interface AiProvider {
  generateText(input: GenerateTextInput): Promise<AiTextResult>;
  summarize(input: SummarizeInput): Promise<AiTextResult>;
}
```

### Almacenamiento

```ts
interface FileStorage {
  upload(input: UploadFileInput): Promise<StoredFile>;
  delete(fileId: string): Promise<void>;
  createDownloadReference(fileId: string): Promise<string>;
}
```

### Música

```ts
interface MusicProvider {
  search(query: string): Promise<MusicSearchResult>;
  resolveTrack(input: ResolveTrackInput): Promise<ResolvedTrack>;
}
```

Los nombres y métodos finales dependen de las features reales.

## Adaptadores

El adaptador debe ser el único componente que conozca detalles específicos del proveedor.

```ts
class GeminiAdapter implements AiProvider {
  async generateText(input: GenerateTextInput): Promise<AiTextResult> {
    // Construir solicitud específica del proveedor.
    // Convertir respuesta al modelo interno.
  }
}
```

Una feature no debería importar el SDK del proveedor si puede utilizar el puerto interno.

## Configuración de proveedores

La configuración debe centralizarse y validarse al iniciar la aplicación.

```ts
interface ProviderConfig {
  name: string;
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  rateLimitPerMinute?: number;
}
```

Los secretos deben proceder de un sistema seguro de configuración, no de archivos versionados.

## Selección de proveedor

HannaeX puede necesitar seleccionar un proveedor por:

- Feature.
- Plan.
- Región.
- Disponibilidad.
- Coste.
- Latencia.
- Capacidad.
- Política del producto.

```ts
interface ProviderResolver<T> {
  resolve(context: ProviderContext): T;
}
```

La selección no debe cambiar silenciosamente las garantías de privacidad o seguridad.

## Fallback

Un fallback puede utilizarse cuando un proveedor no está disponible.

```text
Proveedor principal
        ↓ falla
Proveedor alternativo
        ↓ falla
Respuesta degradada o error controlado
```

El fallback debe comprobar:

- Compatibilidad de capacidades.
- Privacidad.
- Formato de respuesta.
- Coste.
- Límites del plan.
- Región y residencia de datos.
- Consentimiento necesario.

No debe enviarse información a un proveedor alternativo si su política no es compatible con el contexto.

## Timeouts

Cada llamada externa debe tener un timeout explícito.

```ts
interface ExternalCallOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}
```

El timeout debe evitar que una integración con problemas bloquee:

- El event loop.
- Un worker.
- Una interacción de Discord.
- Una transacción crítica.

## Reintentos

Los reintentos deben clasificarse por error.

### Posiblemente reintentable

- Timeout.
- Error de red.
- Error temporal del proveedor.
- Rate limit con tiempo de espera conocido.

### No reintentable

- Credenciales inválidas.
- Argumentos rechazados.
- Endpoint inexistente.
- Permiso insuficiente.
- Contenido no permitido.
- Recurso eliminado.

Los reintentos de operaciones con efectos secundarios requieren idempotencia.

## Rate limits

La integración debe respetar los límites del proveedor.

Debe existir, cuando corresponda:

- Rate limiter.
- Cola por proveedor.
- Backoff.
- Priorización.
- Cache.
- Agrupación de solicitudes.
- Métricas de consumo.

La aplicación debe diferenciar un rate limit de un fallo permanente.

## Circuit breaker

Una integración inestable puede activar un circuito de protección.

```text
Normal
  ↓ muchos fallos
Open
  ↓ espera
Half-open
  ↓ prueba exitosa
Normal
```

Mientras el circuito esté abierto:

- Evitar solicitudes innecesarias.
- Responder con fallback o error controlado.
- Registrar el estado.
- Permitir recuperación gradual.

## Errores externos

Los errores deben transformarse en categorías internas.

```ts
interface IntegrationError {
  provider: string;
  code: string;
  category:
    | "authentication"
    | "authorization"
    | "rate_limit"
    | "timeout"
    | "network"
    | "invalid_request"
    | "not_found"
    | "provider"
    | "unknown";
  retryable: boolean;
  publicMessageKey: string;
}
```

No se deben mostrar al usuario:

- Stack traces.
- Tokens.
- Solicitudes completas.
- Headers sensibles.
- URLs firmadas.
- Detalles internos innecesarios.

## Discord como integración

Discord es la plataforma principal, pero también debe tratarse como una dependencia externa.

Buenas prácticas:

- Separar adapters de Discord.
- Respetar límites de interacción.
- Manejar respuestas diferidas.
- Verificar permisos del bot.
- Manejar canales eliminados.
- Manejar guilds no disponibles.
- Evitar asumir que un objeto sigue existiendo.
- Clasificar errores REST.
- No enviar mensajes duplicados.

## Gemini como integración

La integración con Gemini debe encapsular:

- Construcción de solicitudes.
- Selección de modelo.
- Límites de tokens.
- Timeouts.
- Reintentos.
- Errores del proveedor.
- Validación de respuestas.
- Control de costes.
- Redacción de datos sensibles antes del envío.

El proveedor no debe definir por sí solo:

- El canon de Hoshiko.
- La política de memoria.
- Los permisos del servidor.
- Las acciones administrativas.
- La lógica de negocio.

## Privacidad antes de enviar datos

Antes de llamar a un proveedor externo, HannaeX debe determinar:

- Qué datos son necesarios.
- Si el usuario autorizó el procesamiento.
- Si el canal es público o privado.
- Si existe información de otros usuarios.
- Si se necesita anonimizar.
- Cuánto tiempo conserva el proveedor los datos.
- Si el plan o región permite la operación.

El filtro debe ocurrir antes de construir el payload externo.

## Respuestas estructuradas

Cuando sea posible, los proveedores deben responder mediante esquemas controlados.

```ts
interface AiTextResult {
  text: string;
  provider: string;
  model?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  finishReason?: string;
}
```

Las respuestas estructuradas facilitan:

- Validación.
- Observabilidad.
- Cambio de proveedor.
- Control de costes.
- Tests.

## Webhooks

Los webhooks externos deben:

- Verificar firma o autenticidad.
- Validar timestamp.
- Proteger contra replay.
- Registrar un identificador externo.
- Procesarse de forma idempotente.
- Responder rápido.
- Delegar trabajo lento a una cola.

```text
Webhook
   ↓
Verificación
   ↓
Normalización
   ↓
Idempotencia
   ↓
Encolar trabajo
   ↓
Respuesta HTTP
```

## Servicios de pago

Las operaciones de pago requieren especial cuidado.

Debe separarse:

- Estado informado por el proveedor.
- Estado interno de la suscripción.
- Eventos de facturación.
- Beneficios del plan.
- Reembolsos.
- Cancelaciones.

No se debe activar un beneficio únicamente porque el cliente envió un dato no verificado.

Los webhooks de pago deben ser la fuente de confirmación cuando el proveedor así lo defina.

## Servicios multimedia

Las integraciones de música, letras o audio deben:

- Validar URLs y consultas.
- Respetar términos de uso.
- Manejar contenido no disponible.
- Controlar consumo de recursos.
- Limitar descargas o procesamiento.
- Separar metadatos de archivos.
- Evitar bloquear el bot.

## Cache de integraciones

La caché puede utilizarse para:

- Resultados de búsqueda.
- Metadatos de pistas.
- Estado de proveedor.
- Respuestas no sensibles.
- Configuración pública.

No debe cachearse sin cuidado:

- Respuestas privadas.
- Tokens.
- Datos con autorización limitada.
- Información cuya vigencia sea crítica.

Toda clave debe incluir el alcance necesario.

## Contratos y compatibilidad

Los adapters deben proteger a la aplicación de cambios del proveedor.

Cuando cambie un proveedor:

1. Identificar el cambio.
2. Actualizar el adapter.
3. Mantener el contrato interno cuando sea posible.
4. Añadir tests de contrato.
5. Revisar errores y límites.
6. Actualizar documentación.
7. Desplegar de forma gradual.

## Mocks y pruebas

Cada integración debe poder reemplazarse por un mock o fake.

Debe probarse:

- Éxito.
- Timeout.
- Rate limit.
- Error de autenticación.
- Respuesta inválida.
- Reintento.
- Circuit breaker.
- Fallback.
- Webhook duplicado.
- Payload malicioso.
- Caída del proveedor.

Las pruebas no deben depender de servicios externos reales salvo en pruebas controladas.

## Observabilidad

Registrar por integración:

- Nombre del proveedor.
- Operación.
- Duración.
- Estado.
- Código de error.
- Reintento.
- Uso o coste cuando sea posible.
- `correlationId`.

No registrar secretos ni payloads sensibles completos.

Métricas útiles:

- Latencia.
- Tasa de éxito.
- Tasa de errores.
- Rate limits.
- Timeouts.
- Coste por feature.
- Uso por guild o plan cuando corresponda.
- Estado del circuit breaker.

## Seguridad

Las integraciones deben aplicar mínimo privilegio.

Cada credencial debería tener únicamente los permisos necesarios.

Buenas prácticas:

- Rotar credenciales.
- No versionar secretos.
- Separar credenciales por entorno.
- Restringir acceso del worker.
- Revocar integraciones deshabilitadas.
- Validar certificados y endpoints.
- Evitar SSRF al procesar URLs proporcionadas por usuarios.
- Limitar tamaño de respuestas y archivos.

## Estado actual

Esta nota describe la arquitectura objetivo para integraciones externas.

Debe verificarse en el repositorio real:

- Qué proveedores están conectados.
- Qué SDKs se importan directamente desde features.
- Cómo se manejan errores y reintentos.
- Qué secretos requiere cada integración.
- Si existen adapters.
- Qué llamadas se ejecutan en handlers.
- Cómo se controlan costes y rate limits.
- Qué webhooks están implementados.

## Ruta de implementación

1. Inventariar proveedores actuales.
2. Clasificar cada integración por criticidad.
3. Identificar imports directos dentro de features.
4. Crear interfaces internas para capacidades principales.
5. Mover detalles de SDK a adapters.
6. Centralizar configuración y timeouts.
7. Añadir errores clasificados.
8. Añadir rate limiting y reintentos.
9. Añadir métricas y logs seguros.
10. Probar fallback y recuperación.

## Decisiones pendientes

- ¿Qué proveedores son críticos?
- ¿Se necesita más de un proveedor de IA?
- ¿Qué operaciones requieren fallback?
- ¿Qué servicios tendrán circuit breaker?
- ¿Dónde se guardarán secretos?
- ¿Qué datos pueden enviarse a cada proveedor?
- ¿Qué integraciones requieren webhooks?
- ¿Qué métricas de coste se registrarán?
- ¿Qué adapters deben extraerse primero?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[05-Planes]]
