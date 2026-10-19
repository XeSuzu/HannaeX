---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Arquitectura — Capas del sistema

## Propósito

Esta nota define la separación de responsabilidades dentro de HannaeX.

El objetivo es evitar que los eventos de Discord, los comandos, la lógica de negocio, la persistencia y las integraciones externas terminen mezclados en los mismos archivos.

La arquitectura propuesta debe permitir que HannaeX evolucione desde un bot funcional hacia una plataforma más amplia sin perder mantenibilidad.

## Principio central

```text
Cada capa debe conocer solo lo necesario de las capas que utiliza.
```

Una feature nueva debe poder implementarse sin modificar toda la aplicación.

## Capas propuestas

```text
Platform / Discord
        ↓
Application
        ↓
Domain
        ↓
Infrastructure
        ↓
External Integrations
```

Además, existen capas transversales:

```text
Configuration
Logging
Errors
Security
Observability
```

## Vista general

```text
Discord Events and Interactions
              ↓
Presentation Layer
              ↓
Application Layer
              ↓
Domain Layer
              ↓
Persistence / Infrastructure Layer
              ↓
Database and External Services
```

La dirección de dependencias debe ir hacia dentro, evitando que el dominio dependa directamente de Discord o de un proveedor externo.

## 1. Platform Layer

### Responsabilidad

Representar la plataforma sobre la que opera HannaeX.

En el caso principal:

- Discord Gateway.
- Discord REST API.
- Slash commands.
- Components.
- Webhooks.
- Eventos de miembros.
- Eventos de voz.
- Canales y permisos.

### Componentes posibles

```text
DiscordClient
InteractionAdapter
MessageAdapter
VoiceAdapter
DiscordResponseAdapter
```

### Regla

La plataforma puede cambiar o ampliarse sin obligar a reescribir la lógica de negocio.

El dominio no debería recibir objetos completos del SDK si solo necesita algunos valores.

## 2. Presentation Layer

### Responsabilidad

Traducir entradas de la plataforma a casos de uso y convertir resultados en respuestas.

Incluye:

- Command handlers.
- Event handlers.
- Component handlers.
- Modal handlers.
- Autocomplete handlers.
- Response renderers.
- Mensajes públicos y privados.

### No debe hacer

- Implementar toda la lógica de XP.
- Modificar la base de datos directamente sin pasar por un servicio.
- Decidir reglas de negocio complejas.
- Consultar proveedores de IA sin una capa apropiada.
- Ejecutar una acción administrativa sin validar permisos.

### Flujo

```text
Entrada Discord
        ↓
Adapter
        ↓
Handler
        ↓
Use Case
        ↓
Resultado
        ↓
Renderer
        ↓
Respuesta Discord
```

## 3. Application Layer

### Responsabilidad

Coordinar casos de uso.

La capa de aplicación responde a preguntas como:

- ¿Qué pasos hay que ejecutar?
- ¿Qué servicio debe utilizarse?
- ¿Qué datos necesita la operación?
- ¿Qué política debe verificarse?
- ¿Qué resultado debe devolver?

### Ejemplos de casos de uso

```text
AwardXp
GetProfile
GetLeaderboard
TrackVoiceSession
CreateEconomyTransaction
ModerateMessage
GenerateAiResponse
SaveMemory
ResolveSecurityIncident
```

### Ejemplo conceptual

```ts
interface AwardXpInput {
  guildId: string;
  userId: string;
  amount: number;
  source: "message" | "voice" | "event" | "admin";
  idempotencyKey?: string;
}

class AwardXpUseCase {
  async execute(input: AwardXpInput): Promise<ServiceResult> {
    // Validar reglas y coordinar servicios.
    return { ok: true };
  }
}
```

El caso de uso coordina. No debería contener detalles de Discord ni consultas SQL específicas.

## 4. Domain Layer

### Responsabilidad

Contener las reglas fundamentales de negocio de HannaeX.

Ejemplos:

- Cómo se calcula XP.
- Qué condiciones producen un nivel.
- Qué es una transacción válida.
- Qué estados puede tener una sanción.
- Qué hace que una sesión de voz sea válida.
- Qué significa que una memoria sea válida.
- Qué límites tiene una recompensa.

### Componentes posibles

```text
Entities
Value Objects
Domain Services
Policies
Domain Events
Invariants
```

### Regla importante

El dominio no debe depender directamente de:

- Discord.js.
- MongoDB.
- Gemini.
- Variables de entorno.
- APIs HTTP concretas.
- Formatos de embed.

Puede depender de interfaces o puertos definidos por la aplicación.

## Entidades

Una entidad tiene identidad y ciclo de vida.

Ejemplos conceptuales:

```text
GuildProfile
UserProfile
XpProfile
VoiceSession
EconomyAccount
Transaction
ModerationCase
SecurityIncident
MemoryRecord
```

Ejemplo:

```ts
interface XpProfile {
  guildId: string;
  userId: string;
  totalXp: number;
  level: number;
  updatedAt: Date;
}
```

La forma real debe ajustarse al modelo persistido.

## Value Objects

Un value object representa un valor con reglas propias y sin identidad independiente.

Ejemplos:

```text
GuildId
UserId
ChannelId
XpAmount
CurrencyAmount
Cooldown
PlanTier
PermissionSet
```

Pueden ayudar a evitar errores como:

- Mezclar IDs de usuario con IDs de guild.
- Usar cantidades negativas.
- Comparar planes como strings arbitrarios.
- Interpretar un cooldown inválido.

## Invariantes

Las invariantes son condiciones que siempre deben cumplirse.

Ejemplos:

- XP no puede ser negativa.
- Un saldo no puede modificarse sin una transacción válida.
- Un registro de voz no debe pertenecer a otro guild.
- Una recompensa no debe otorgarse dos veces por el mismo evento.
- Una sanción debe tener un actor o fuente identificable.
- Una memoria eliminada no debe volver a aparecer.

Las invariantes deben protegerse en más de una capa cuando la operación sea sensible.

## Policies

Las policies encapsulan decisiones de negocio.

Ejemplos:

```text
XpPolicy
RewardPolicy
EconomyPolicy
ModerationPolicy
MemoryPolicy
PlanLimitPolicy
VoiceTrackingPolicy
```

Una policy no debería depender de cómo Discord representa un botón o un mensaje.

## 5. Infrastructure Layer

### Responsabilidad

Implementar detalles técnicos necesarios para que la aplicación funcione.

Incluye:

- Repositorios.
- Modelos de base de datos.
- Clientes HTTP.
- Cache.
- Colas.
- Locks.
- Persistencia de eventos.
- Serialización.
- Adaptadores técnicos.

### Ejemplos

```text
MongoXpRepository
MongoEconomyRepository
RedisCooldownStore
GeminiClient
QueuePublisher
DiscordGuildRepository
```

La infraestructura implementa contratos utilizados por la aplicación.

## Puertos y adaptadores

La aplicación puede definir interfaces, y la infraestructura puede implementarlas.

```ts
interface XpRepository {
  findByUser(guildId: string, userId: string): Promise<XpProfile | null>;
  save(profile: XpProfile): Promise<void>;
}
```

Implementación posible:

```ts
class MongoXpRepository implements XpRepository {
  async findByUser(guildId: string, userId: string) {
    // Detalles de MongoDB.
  }

  async save(profile: XpProfile) {
    // Persistencia concreta.
  }
}
```

La aplicación utiliza `XpRepository`, no necesita saber que internamente existe MongoDB.

## 6. Integrations Layer

### Responsabilidad

Aislar proveedores externos.

Ejemplos:

- Gemini.
- Discord.
- Proveedores de música.
- APIs de letras.
- Servicios de pagos.
- Servicios de imágenes.
- Sistemas de monitoreo.
- Servicios de correo.

### Reglas

Cada integración debe:

- Tener una interfaz clara.
- Manejar timeouts.
- Clasificar errores.
- Ocultar secretos.
- Implementar reintentos limitados.
- Permitir mocks en tests.
- Exponer solo las operaciones necesarias.

## Servicios transversales

### Configuration Service

Debe centralizar la lectura y validación de configuración.

No se recomienda leer `process.env` desde cualquier archivo de la aplicación.

```ts
interface AppConfig {
  discordToken: string;
  databaseUrl: string;
  aiProvider?: string;
  environment: "development" | "test" | "production";
}
```

Los nombres reales de las variables deben mantenerse fuera de la documentación pública si contienen información sensible.

### Logging Service

Debe proporcionar logs estructurados.

```ts
interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

El logger debe filtrar:

- Tokens.
- Contraseñas.
- Claves API.
- Contenido privado innecesario.
- Datos sensibles.

### Error Service

Debe centralizar:

- Códigos de error.
- Conversión de excepciones.
- Mensajes públicos.
- Clasificación de reintentos.
- Registro técnico.

### Permission Service

Debe separar:

- Permisos del usuario.
- Permisos del bot.
- Permisos del canal.
- Permisos de la feature.
- Restricciones del plan.

## Dirección de dependencias

La dirección recomendada es:

```text
Presentation → Application → Domain
       ↓             ↓          ↑
   Platform    Infrastructure  Policies
                     ↓
              External Services
```

El dominio debe ser la parte más independiente.

## Dependencias prohibidas o peligrosas

Evitar:

```text
Domain → Discord SDK
Domain → MongoDB
Domain → Gemini
Domain → process.env
Renderer → Database directo
Handler → múltiples APIs externas sin servicio
Feature → otra feature mediante imports circulares
```

Estas dependencias dificultan pruebas, migraciones y mantenimiento.

## Comunicación entre features

Las features deben comunicarse mediante:

- Servicios bien definidos.
- Casos de uso.
- Eventos internos.
- Repositorios o puertos compartidos.

Evitar que una feature lea directamente los modelos internos de otra.

Ejemplo preferido:

```text
VoiceFeature
      ↓
VoiceSessionCompleted
      ↓
XpFeature
```

Ejemplo problemático:

```text
VoiceFeature importa y modifica directamente el modelo interno de XP.
```

## Ciclo de una feature

Una feature nueva debería diseñarse así:

```text
Requisito
   ↓
Caso de uso
   ↓
Reglas de dominio
   ↓
Puertos necesarios
   ↓
Implementaciones de infraestructura
   ↓
Handler o endpoint
   ↓
Renderer
   ↓
Pruebas
   ↓
Observabilidad
```

## Ejemplo: perfil de XP

```text
/commands/xp
        ↓
XpCommandHandler
        ↓
GetXpProfileUseCase
        ↓
XpRepository
        ↓
Base de datos
        ↓
XpProfileResult
        ↓
XpRenderer
        ↓
Respuesta de Discord
```

Hoshiko puede aportar el tono del mensaje, pero el cálculo y la lectura del perfil pertenecen a HannaeX.

## Ejemplo: respuesta de IA

```text
Mensaje o comando
        ↓
AiInteractionHandler
        ↓
BuildConversationContextUseCase
        ↓
MemoryPolicy
        ↓
AiProvider interface
        ↓
GeminiAdapter
        ↓
ResponseValidator
        ↓
AiResponseRenderer
        ↓
Discord
```

La integración con Gemini no debe definir por sí sola toda la identidad de Hoshiko.

## Ejemplo: moderación

```text
Evento de moderación
        ↓
ModerationHandler
        ↓
ModerateMessageUseCase
        ↓
PermissionPolicy
        ↓
ModerationPolicy
        ↓
DiscordModerationAdapter
        ↓
ModerationCaseRepository
        ↓
Respuesta y registro
```

Una sugerencia generada por IA no debe saltarse las policies ni los permisos.

## Estado y caché

La caché puede utilizarse para:

- Configuración del guild.
- Cooldowns.
- Permisos calculados por poco tiempo.
- Rankings temporales.
- Respuestas repetibles.
- Estado de integraciones.

La caché no debe ser la única fuente de verdad para datos críticos.

Debe definirse:

- TTL.
- Clave.
- Alcance.
- Estrategia de invalidación.
- Comportamiento ante pérdida de caché.

## Configuración por entorno

Debe existir una diferencia clara entre:

```text
development
        ↓
test
        ↓
staging, si aplica
        ↓
production
```

Cada entorno debe aislar:

- Base de datos.
- Tokens.
- Guilds de prueba.
- Colas.
- Integraciones.
- Logs.
- Recursos.

Nunca se debe probar una función destructiva sobre datos de producción sin un procedimiento explícito.

## Estado actual

Esta separación de capas es una arquitectura objetivo.

Debe verificarse en el repositorio real:

- Qué carpetas ya existen.
- Qué clases cumplen cada responsabilidad.
- Qué listeners contienen lógica de negocio.
- Qué repositorios están implementados.
- Qué dependencias circulares existen.
- Qué integraciones están acopladas.
- Qué configuración se lee directamente desde el entorno.

## Migración progresiva

No es necesario reescribir HannaeX de una sola vez.

Ruta recomendada:

1. Identificar listeners grandes.
2. Extraer validaciones reutilizables.
3. Extraer servicios de dominio.
4. Definir interfaces para persistencia.
5. Separar renderers.
6. Añadir resultados estructurados.
7. Centralizar errores.
8. Añadir logs con correlación.
9. Incorporar tests.
10. Migrar feature por feature.

## Criterios de aceptación

Una feature puede considerarse bien separada cuando:

- El handler es pequeño.
- La lógica de negocio se puede probar sin Discord.
- La persistencia está detrás de un repositorio o adapter.
- Los errores están clasificados.
- Las respuestas no contienen lógica de dominio oculta.
- La feature tiene tests básicos.
- La configuración está validada.
- Los logs permiten rastrear la operación.
- Las acciones sensibles son idempotentes o protegidas.

## Decisiones pendientes

- ¿Qué estilo arquitectónico seguirá el repositorio real?
- ¿Se utilizará arquitectura hexagonal, modular o una combinación?
- ¿Dónde están actualmente los límites entre features?
- ¿Qué modelos comparten varias áreas?
- ¿Qué repositorios deben definirse primero?
- ¿Qué integraciones requieren adapters?
- ¿Se utilizarán eventos internos formales?
- ¿Qué parte de la migración aporta más valor inmediato?

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
- [[HannaeX — Relación con Hoshiko]]
