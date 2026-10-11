---
type: architecture
status: planned
area: ai
scope: system
stability: medium
created: 2026-09-21
updated: 2026-09-21
---

# Hoshiko — Personalidad técnica

## Propósito

Esta nota define cómo podría representarse y aplicarse técnicamente la personalidad de Hoshiko dentro de HannaeX.

La nota anterior, [[Hoshiko — Identidad y configuración]], define la separación conceptual entre identidad base, configuración y contexto. Esta nota se centra en la posible implementación de esas capas dentro de un sistema TypeScript/Node.js.

La arquitectura descrita aquí es planificada. No debe considerarse implementada hasta verificarse directamente en el código.

## Principio de diseño

La personalidad no debe existir únicamente como un bloque de texto dentro de un prompt.

Debe expresarse mediante varias capas:

```text
Canon
  ↓
Configuración
  ↓
Contexto
  ↓
Memoria relevante
  ↓
Estado conversacional
  ↓
Prompt o instrucciones del modelo
  ↓
Respuesta validada
```

## Componentes principales

La implementación futura puede dividirse en estos componentes:

```text
CorePersonaProvider
PersonaConfigService
ConversationContextBuilder
MemoryResolver
HoshikoStateResolver
PromptComposer
ResponseValidator
```

Cada componente tendría una responsabilidad diferente.

## CorePersonaProvider

### Responsabilidad

Proporcionar la identidad estable de Hoshiko.

### No debe hacer

- Leer mensajes del servidor.
- Consultar memoria personal directamente.
- Ejecutar comandos.
- Aplicar configuraciones locales.
- Decidir sanciones.

### Datos posibles

```ts
interface CorePersona {
  identity: string;
  archetype: string;
  traits: string[];
  principles: string[];
  boundaries: string[];
  languageGuidelines: string[];
}
```

Ejemplo conceptual:

```ts
const corePersona: CorePersona = {
  identity: "Hoshiko",
  archetype: "digital_neko",
  traits: [
    "warm",
    "curious",
    "independent",
    "attentive",
    "playful",
    "calm"
  ],
  principles: [
    "be_honest",
    "respect_privacy",
    "avoid_manipulation",
    "admit_uncertainty",
    "protect_user_agency"
  ],
  boundaries: [
    "do_not_fake_humanity",
    "do_not_expose_private_memory",
    "do_not_force_interaction",
    "do_not_use_nya_as_a_tic"
  ],
  languageGuidelines: [
    "use_natural_spanish",
    "adapt_response_length",
    "be_serious_when_context_requires"
  ]
};
```

## PersonaConfigService

### Responsabilidad

Resolver los ajustes de personalidad aplicables a la interacción.

### Fuentes de configuración

```text
Configuración global
        ↓
Configuración del plan
        ↓
Configuración del servidor
        ↓
Configuración del canal
        ↓
Preferencias del usuario
```

### Interface propuesta

```ts
interface PersonaConfig {
  language: "es" | "en";
  formality: "casual" | "balanced" | "formal";
  humor: "none" | "light" | "active";
  emojiUsage: "none" | "low" | "medium";
  initiative: "reactive" | "balanced" | "proactive";
  nekoIntensity: "subtle" | "balanced" | "expressive";
  memoryEnabled: boolean;
}
```

### Regla de prioridad

Una configuración local no debe sobrescribir principios del canon.

```text
PersonaConfig puede cambiar el estilo.
PersonaConfig no puede cambiar los principios.
```

## ConversationContextBuilder

### Responsabilidad

Construir el contexto necesario para responder a una interacción.

### Datos posibles

```ts
interface ConversationContext {
  guildId?: string;
  userId: string;
  channelId?: string;
  channelType?: "text" | "voice" | "thread" | "dm";
  topic?: string;
  emotionalTone?: string;
  recentMessages: string[];
  relevantMemory: string[];
  activeFeature?: string;
  currentState?: HoshikoState;
  permissions?: string[];
}
```

### Reglas

El builder debe:

- Identificar el servidor cuando exista.
- Identificar el usuario.
- Respetar el canal y su visibilidad.
- Limitar mensajes recientes.
- Consultar solo memoria relevante.
- Filtrar datos privados.
- Evitar enviar todo el historial al modelo.
- Indicar si la conversación es pública o privada.

## MemoryResolver

### Responsabilidad

Buscar y filtrar recuerdos autorizados que puedan ser útiles para la interacción.

### Flujo

```text
Usuario y guild
        ↓
Buscar candidatos
        ↓
Filtrar por alcance
        ↓
Filtrar por permisos
        ↓
Filtrar por relevancia
        ↓
Aplicar límites de cantidad
        ↓
Entregar contexto resumido
```

### Reglas

- No incluir memoria de otro servidor.
- No incluir recuerdos privados en un canal público sin necesidad.
- No incluir secretos.
- No utilizar recuerdos eliminados.
- No enviar toda la memoria al modelo.
- Registrar solo lo necesario.

## HoshikoStateResolver

### Responsabilidad

Determinar el estado conversacional más adecuado.

Estados posibles:

```ts
type HoshikoState =
  | "relaxed"
  | "curious"
  | "playful"
  | "focused"
  | "alert"
  | "serious"
  | "protective"
  | "empathetic"
  | "celebratory"
  | "reflective";
```

### Prioridad

```text
serious / protective
        ↓
empathetic
        ↓
alert
        ↓
focused
        ↓
curious
        ↓
celebratory
        ↓
playful
        ↓
relaxed
```

### Posibles señales

- Tipo de canal.
- Tipo de comando.
- Palabras del usuario.
- Incidente activo.
- Nivel de riesgo.
- Tema técnico.
- Logro conseguido.
- Estado emocional inferido con cautela.
- Configuración del servidor.

El estado no debe diagnosticar emociones ni convertir una inferencia en un hecho.

## PromptComposer

### Responsabilidad

Combinar identidad, configuración y contexto en instrucciones para el modelo de IA.

### Orden recomendado

```text
1. Reglas de seguridad del sistema
2. Principios inmutables
3. CorePersona
4. Configuración permitida
5. Estado conversacional
6. Contexto de servidor
7. Memoria relevante
8. Mensaje actual
```

### Estructura conceptual

```ts
interface PromptInput {
  corePersona: CorePersona;
  personaConfig: PersonaConfig;
  conversationContext: ConversationContext;
  systemConstraints: string[];
}
```

### Principio

El prompt no debe tener permiso para contradecir las reglas de seguridad o privacidad del sistema.

## ResponseValidator

### Responsabilidad

Revisar la respuesta del modelo antes de enviarla a Discord cuando sea necesario.

### Validaciones posibles

- No expone memoria privada.
- No mezcla servidores.
- No afirma capacidades inexistentes.
- No inventa acciones realizadas.
- No presenta propuestas como implementadas.
- No utiliza humor en un contexto crítico.
- No incluye secretos.
- No contiene una orden administrativa no autorizada.
- No rompe el formato esperado.

### Resultado

```ts
interface ValidationResult {
  valid: boolean;
  reasons: string[];
  sanitizedResponse?: string;
  requiresReview?: boolean;
}
```

## Flujo completo

```text
Discord Interaction
        ↓
Identificar userId y guildId
        ↓
Cargar PersonaConfig
        ↓
Construir ConversationContext
        ↓
Resolver memoria relevante
        ↓
Determinar HoshikoState
        ↓
Cargar CorePersona
        ↓
Componer instrucciones
        ↓
Consultar Gemini
        ↓
Validar respuesta
        ↓
Enviar a Discord
```

## Separación entre respuesta y acción

Una respuesta conversacional no debería ejecutar automáticamente una acción administrativa.

Ejemplo:

```text
Hoshiko explica una posible amenaza
        ↓
Moderador confirma
        ↓
ModerationService ejecuta la acción
```

La IA puede recomendar o preparar una acción, pero las acciones sensibles deben pasar por permisos, política y confirmación.

## Integración con comandos

Los comandos de Discord deben permanecer separados de la personalidad.

```text
Slash command
      ↓
Command handler
      ↓
Feature service
      ↓
Resultado estructurado
      ↓
Response renderer
      ↓
Mensaje de Hoshiko, si corresponde
```

La feature ejecuta la lógica. Hoshiko puede explicar el resultado, pero no debe contener toda la lógica de negocio.

## Integración con funciones no conversacionales

No todas las funciones requieren IA.

### No requieren necesariamente a Hoshiko

- Cálculo de XP.
- Actualización de rankings.
- Registro de minutos de voz.
- Persistencia de una racha.
- Rate limiting.
- Eliminación de mensajes.
- Validación de permisos.
- Aplicación de un cooldown.

### Pueden utilizar la identidad de Hoshiko

- Anuncios de subida de nivel.
- Celebración de logros.
- Explicación de una recompensa.
- Resumen de un evento.
- Mensaje de bienvenida.
- Explicación de una alerta.
- Interacción conversacional.

La personalidad debe mejorar la experiencia cuando aporta valor, no aparecer de manera forzada en cada función.

## Configuración por servidor

La configuración debe almacenarse con `guildId`.

Ejemplo conceptual:

```ts
interface GuildPersonaConfig extends PersonaConfig {
  guildId: string;
  responseChannels: string[];
  disabledStates?: HoshikoState[];
  customInstructions?: string[];
  memoryEnabled: boolean;
}
```

Las instrucciones personalizadas del servidor deben estar limitadas por el canon.

Un servidor puede pedir:

- Más formalidad.
- Menos emojis.
- Más humor.
- Menos iniciativa.
- Un idioma distinto.

No puede pedir:

- Revelar memorias privadas.
- Fingir que Hoshiko es humana.
- Manipular usuarios.
- Saltarse permisos.
- Ocultar riesgos.

## Configuración por usuario

Las preferencias pueden incluir:

- Idioma.
- Longitud.
- Formalidad.
- Uso de emojis.
- Memoria personal.
- Nivel de detalle técnico.
- Forma de invocación.

Estas preferencias deben estar limitadas por la configuración del servidor y los principios del sistema.

## Configuración por plan

Los planes pueden modificar:

- Límite de memoria.
- Retención de contexto.
- Número de servidores.
- Herramientas de resumen.
- Capacidad de personalización.
- Integraciones.
- Prioridad de procesamiento.

La personalidad base no debería cambiar entre planes.

## Errores y fallback

Si Gemini no está disponible:

- Hoshiko debe informar que la función conversacional no está disponible.
- Las funciones no dependientes de IA deben continuar funcionando.
- No debe inventar una respuesta como si el modelo hubiera contestado.
- El error debe registrarse técnicamente, sin exponer detalles sensibles.

```text
IA no disponible
        ↓
Funciones normales continúan
        ↓
Hoshiko comunica la limitación
```

## Rendimiento

Con la infraestructura actual de HannaeVM, la personalidad no debe provocar consultas innecesarias.

Buenas prácticas:

- Limitar contexto.
- Cachear configuración.
- No consultar toda la memoria en cada mensaje.
- Utilizar cooldowns.
- Procesar tareas lentas fuera del evento principal.
- Evitar generar IA para mensajes que no la necesitan.
- Mantener funciones no conversacionales independientes.

## Privacidad técnica

La arquitectura debe impedir que un prompt mal construido exponga:

- Memorias de otros usuarios.
- Datos de otros guilds.
- Tokens.
- Configuración interna sensible.
- Información de moderación no autorizada.

La privacidad debe validarse antes de construir el prompt, no únicamente después de recibir la respuesta.

## Estado actual

Esta arquitectura es planificada.

Existe integración con Gemini, pero no se debe afirmar que ya existe una implementación completa de:

- `CorePersonaProvider`.
- `PersonaConfigService`.
- `ConversationContextBuilder`.
- `MemoryResolver`.
- `HoshikoStateResolver`.
- `PromptComposer`.
- `ResponseValidator`.

Estos componentes representan la dirección técnica propuesta.

## Decisiones pendientes

- ¿Dónde se almacenará el CorePersona?
- ¿Se versionarán las instrucciones de personalidad?
- ¿Qué estados se implementarán primero?
- ¿Cómo se detectará el tema de una conversación?
- ¿Qué parte del contexto se enviará a Gemini?
- ¿Se utilizarán respuestas estructuradas?
- ¿Cómo se validarán menciones y acciones?
- ¿Qué funciones pueden invocar IA?
- ¿Cómo se registrarán los costos y límites de Gemini?

## Notas relacionadas

- [[Hoshiko]]
- [[Hoshiko — Definición oficial]]
- [[Hoshiko — Personalidad base]]
- [[Hoshiko — Lenguaje y voz]]
- [[Hoshiko — Estados]]
- [[Hoshiko — Relaciones]]
- [[Hoshiko — Memoria]]
- [[Hoshiko — Principios inmutables]]
- [[HannaeX — Relación con Hoshiko]]
- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Persistencia]]
