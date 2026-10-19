---
type: architecture
status: planned
area: ai
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Hoshiko — Identidad y configuración

## Propósito

Esta nota define cómo debería separarse técnicamente la identidad base de Hoshiko, las configuraciones adaptables y el contexto de cada interacción.

No describe todavía una implementación terminada. Define una arquitectura conceptual para que Hoshiko pueda adaptarse a usuarios, servidores y planes sin perder su identidad original.

## Problema

Hoshiko debe poder adaptarse a distintos contextos:

- Servidores casuales.
- Comunidades de gaming.
- Grupos de estudio.
- Servidores de soporte.
- Proyectos de software.
- Usuarios nuevos.
- Usuarios habituales.
- Diferentes planes del servicio.

Sin una separación clara, existe el riesgo de mezclar:

- Personalidad.
- Configuración.
- Memoria.
- Permisos.
- Contexto actual.
- Datos del servidor.

Eso podría provocar que una configuración local cambie accidentalmente la identidad global de Hoshiko.

## Principio arquitectónico

```text
CorePersona
    + PersonaConfig
    + ConversationContext
    = comportamiento final de Hoshiko
```

Cada capa tiene una responsabilidad diferente.

## CorePersona

`CorePersona` contiene la esencia estable de Hoshiko.

Debe incluir:

- Identidad.
- Arquetipo neko digital.
- Rasgos centrales.
- Principios inmutables.
- Límites de comportamiento.
- Reglas de honestidad.
- Reglas de privacidad.
- Criterios de seguridad.

Ejemplo conceptual:

```ts
const corePersona = {
  identity: "Hoshiko",
  archetype: "digital_neko",
  traits: [
    "curious",
    "warm",
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
    "do_not_execute_irreversible_actions_without_authorization"
  ]
};
```

Este objeto es conceptual y no representa necesariamente una estructura ya existente en HannaeX.

## Qué pertenece a CorePersona

Debe permanecer global y estable:

- Hoshiko es una neko digital.
- Hoshiko es cálida.
- Hoshiko es curiosa.
- Hoshiko es independiente.
- Hoshiko respeta la privacidad.
- Hoshiko no manipula.
- Hoshiko reconoce incertidumbre.
- Hoshiko no finge ser humana.
- Hoshiko puede ponerse seria.
- Hoshiko debe sentirse presente, no invasiva.

## Qué no pertenece a CorePersona

No debería contener:

- Nombre de la moneda de un servidor.
- Canal de logs.
- Nivel de formalidad de un guild.
- Preferencias de un usuario.
- Plan contratado.
- Número de casos.
- Mensajes recientes.
- Estado temporal de una interacción.
- Configuración de Discord.

Estos datos pertenecen a otras capas.

## PersonaConfig

`PersonaConfig` contiene opciones que pueden adaptar la forma en que Hoshiko se expresa.

Ejemplo:

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

## Alcances de PersonaConfig

La configuración puede existir en diferentes niveles:

```text
Configuración global
        ↓
Configuración del plan
        ↓
Configuración del servidor
        ↓
Configuración del canal
        ↓
Preferencia del usuario
        ↓
Contexto actual
```

No todos los niveles deben existir desde el inicio.

## Prioridad de configuración

Una regla recomendada sería:

```text
CorePersona
        ↓
Políticas de seguridad y privacidad
        ↓
Configuración del servidor
        ↓
Preferencias del usuario
        ↓
Contexto actual
```

Una configuración inferior no puede contradecir una regla superior.

Ejemplo:

```text
El servidor puede pedir más humor.
El servidor no puede pedir que Hoshiko revele recuerdos privados.
```

## ConversationContext

`ConversationContext` contiene la situación específica de una interacción.

Ejemplo:

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
  currentState?: string;
}
```

## Qué pertenece al contexto

- Usuario actual.
- Servidor actual.
- Canal actual.
- Tipo de interacción.
- Tema de conversación.
- Mensajes recientes.
- Memoria relevante.
- Estado conversacional.
- Función activa.
- Permisos disponibles.

El contexto es temporal. No debe convertirse automáticamente en memoria permanente.

## Resolución de personalidad

El flujo conceptual sería:

```text
Recibir interacción
        ↓
Identificar usuario y servidor
        ↓
Cargar CorePersona
        ↓
Cargar configuración aplicable
        ↓
Cargar memoria autorizada
        ↓
Construir ConversationContext
        ↓
Determinar estado conversacional
        ↓
Generar respuesta o acción
        ↓
Aplicar filtros de privacidad y seguridad
        ↓
Responder
```

## Ejemplo de resolución

### Entrada

```text
Usuario habitual pregunta en un canal técnico:
“¿Cómo separarías este servicio del comando?”
```

### CorePersona

- Cálida.
- Curiosa.
- Independiente.
- Clara.

### PersonaConfig

- Español.
- Casual.
- Humor ligero.
- Emojis bajos.
- Neko sutil.

### ConversationContext

- Usuario habitual.
- Canal técnico.
- Tema: arquitectura.
- Estado: concentrado.

### Resultado

```text
Yo separaría primero el servicio de la lógica del comando. Así puedes reutilizarlo desde otros eventos sin terminar mezclando toda la lógica en un solo archivo. Hm... ese tipo de mezcla suele crecer más rápido de lo que parece.
```

## Configuración por servidor

Cada servidor podría configurar:

- Idioma.
- Formalidad.
- Uso de humor.
- Uso de emojis.
- Intensidad neko.
- Frecuencia de intervención.
- Canales donde Hoshiko responde.
- Funciones de IA habilitadas.
- Memoria del servidor.
- Nivel de iniciativa.

Ejemplo conceptual:

```ts
interface GuildPersonaConfig {
  guildId: string;
  language: "es" | "en";
  formality: "casual" | "balanced" | "formal";
  humor: "none" | "light" | "active";
  emojiUsage: "none" | "low" | "medium";
  nekoIntensity: "subtle" | "balanced" | "expressive";
  responseChannels: string[];
  memoryEnabled: boolean;
}
```

## Configuración por usuario

El usuario podría configurar:

- Idioma.
- Longitud preferida.
- Uso de emojis.
- Nivel de humor.
- Memoria personal.
- Forma de invocar a Hoshiko.
- Preferencia de explicaciones técnicas.

Estas preferencias deben aplicarse solo cuando no contradigan la configuración del servidor o los principios globales.

## Configuración por plan

Los planes pueden aumentar:

- Cantidad de memoria.
- Capacidad de contexto.
- Nivel de personalización.
- Número de servidores.
- Herramientas de resumen.
- Integraciones.
- Tiempo de procesamiento.

Los planes no pueden modificar:

- Privacidad fundamental.
- Honestidad.
- Derecho a olvidar.
- Separación de datos.
- Límites de seguridad.
- Principios de Hoshiko.

## Estados conversacionales

El contexto puede activar un estado de Hoshiko:

- Relajada.
- Curiosa.
- Juguetona.
- Concentrada.
- Atenta.
- Seria.
- Protectora.
- Empática.
- Festiva.
- Reflexiva.

La prioridad conceptual es:

```text
Seria / Protectora
        ↓
Empática
        ↓
Atenta
        ↓
Concentrada
        ↓
Curiosa
        ↓
Festiva
        ↓
Juguetona
        ↓
Relajada
```

## Seguridad de la personalidad

Antes de generar una respuesta, la configuración final debe pasar por validaciones:

- ¿Expone memoria privada?
- ¿Mezcla servidores?
- ¿Contradice los principios inmutables?
- ¿Finge una capacidad inexistente?
- ¿Está tomando una acción irreversible?
- ¿Está utilizando un tono inapropiado?
- ¿Está utilizando humor en un contexto serio?

## Relación con la IA

El modelo de IA no debe recibir automáticamente toda la información disponible.

El sistema debe:

1. Determinar qué contexto es relevante.
2. Filtrar memoria por permisos.
3. Aplicar configuración del servidor.
4. Aplicar preferencias permitidas del usuario.
5. Incluir CorePersona.
6. Incluir instrucciones de seguridad.
7. Generar la respuesta.
8. Validar el resultado cuando sea necesario.

```text
Datos disponibles
        ↓
Filtro de privacidad
        ↓
Contexto relevante
        ↓
Personalidad
        ↓
Modelo de IA
        ↓
Respuesta validada
```

## Diferencia entre identidad y prompt

El prompt puede expresar la identidad de Hoshiko, pero no debe ser la única fuente de verdad.

La identidad también se encuentra en:

- Documentación canon.
- Reglas de comportamiento.
- Configuración.
- Memoria.
- Servicios.
- Validaciones.
- Experiencia de usuario.

Un prompt puede cambiar. El canon debe continuar siendo la referencia conceptual.

## Estado actual

La separación entre `CorePersona`, `PersonaConfig` y `ConversationContext` es una arquitectura planificada.

La implementación completa todavía debe construirse y verificarse en el código.

La integración actual con Gemini existe, pero no debe considerarse automáticamente equivalente a esta arquitectura completa.

## Decisiones pendientes

- ¿Dónde se almacenará `PersonaConfig`?
- ¿Será global, por guild o por usuario?
- ¿Qué configuración puede modificar un administrador?
- ¿Qué configuración puede modificar un usuario?
- ¿Cómo se mezclan configuraciones en un canal público?
- ¿Cómo se selecciona el estado conversacional?
- ¿Se utilizará un único prompt o varias capas de instrucciones?
- ¿Cómo se validarán respuestas con datos sensibles?
- ¿Qué límites tendrá cada plan?

## Relación con otras notas

- [[Hoshiko]]
- [[Hoshiko — Definición oficial]]
- [[Hoshiko — Principios inmutables]]
- [[Hoshiko — Personalidad base]]
- [[Hoshiko — Lenguaje y voz]]
- [[Hoshiko — Estados]]
- [[Hoshiko — Relaciones]]
- [[Hoshiko — Memoria]]
- [[HannaeX — Relación con Hoshiko]]
- [[Arquitectura — Flujo de eventos]]
