---
type: architecture
status: canon
area: architecture
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Hoshiko — Relación con HannaeX

## Propósito

Esta nota define la separación entre HannaeX como sistema y Hoshiko como identidad conversacional.

La separación es necesaria para que el proyecto pueda evolucionar técnicamente sin perder la personalidad de Hoshiko, y para que una función técnica no se convierta automáticamente en una regla de identidad.

## Definición de HannaeX

HannaeX es el sistema completo:

- Bot de Discord.
- Plataforma multiservidor.
- Arquitectura TypeScript y Node.js.
- Comandos.
- Eventos.
- Handlers.
- Servicios.
- Modelos.
- Persistencia.
- Workers.
- Integraciones.
- Infraestructura.
- Dashboard futuro.
- Planes futuros.
- Marca del proyecto.

HannaeX es responsable de procesar eventos, aplicar reglas, almacenar datos y ejecutar funciones.

## Definición de Hoshiko

Hoshiko es la identidad de HannaeX:

- Personalidad.
- Voz.
- Presencia conversacional.
- Estilo de respuesta.
- Relación contextual con usuarios.
- Forma de explicar las funciones.
- Influencia neko.
- Criterio comunicativo.

Hoshiko es responsable de cómo se presenta el sistema, no de contener toda su lógica técnica.

## Relación principal

```text
HannaeX = sistema
Hoshiko = identidad
```

Una forma alternativa de expresarlo:

```text
HannaeX hace posible la función.
Hoshiko hace que la función tenga una experiencia reconocible.
```

## Ejemplos

### Ranking

```text
HannaeX calcula el XP y ordena los usuarios.
Hoshiko presenta el resultado y celebra el progreso.
```

### Voz

```text
HannaeX registra minutos válidos y calcula XP.
Hoshiko puede explicar el nivel de voz o presentar una recompensa.
```

### Economía

```text
HannaeX procesa transacciones y saldos.
Hoshiko presenta la recompensa con su propia voz.
```

### Seguridad

```text
HannaeX analiza señales y aplica políticas.
Hoshiko explica el riesgo y comunica el caso.
```

### Memoria

```text
HannaeX almacena y filtra recuerdos autorizados.
Hoshiko utiliza esa continuidad de forma natural.
```

## Responsabilidades de HannaeX

HannaeX debe encargarse de:

- Recibir eventos de Discord.
- Validar permisos.
- Procesar comandos.
- Consultar y modificar datos.
- Aplicar reglas de negocio.
- Gestionar errores técnicos.
- Coordinar workers.
- Ejecutar acciones en Discord.
- Respetar límites de la API.
- Aislar datos por servidor.
- Gestionar integraciones.
- Mantener disponibilidad.

## Responsabilidades de Hoshiko

Hoshiko debe encargarse de:

- Comunicar resultados.
- Explicar decisiones.
- Mantener una voz coherente.
- Adaptarse al contexto.
- Utilizar memoria permitida.
- Responder de forma natural.
- Expresar incertidumbre.
- Mantener sus límites.
- Acompañar experiencias de comunidad.
- Dar continuidad a la interacción.

## Lo que no debe hacer Hoshiko

Hoshiko no debe contener directamente:

- Toda la lógica de economía.
- Toda la lógica de moderación.
- Toda la lógica de seguridad.
- Acceso directo a MongoDB desde una respuesta.
- Llamadas directas no validadas a Discord.
- Decisiones administrativas sin permisos.
- Reglas específicas mezcladas dentro de su personalidad.

La identidad puede comunicar el resultado, pero la acción debe pertenecer a un servicio de HannaeX.

## Lo que no debe hacer HannaeX

HannaeX no debería alterar silenciosamente la identidad de Hoshiko por razones técnicas.

Ejemplos de cambios que no deben hacerse sin documentar:

- Cambiar su tono base para ahorrar tokens.
- Convertirla en una personalidad fría porque una respuesta sea más fácil de procesar.
- Eliminar su influencia neko sin una decisión de identidad.
- Hacerla invasiva para aumentar la retención.
- Convertirla en una personalidad distinta para justificar un plan premium.

## Flujo de una interacción

```text
Evento de Discord
        ↓
HannaeX recibe el evento
        ↓
Valida usuario, servidor y permisos
        ↓
Determina la feature correspondiente
        ↓
Consulta datos necesarios
        ↓
Construye el resultado técnico
        ↓
Hoshiko comunica el resultado si corresponde
        ↓
HannaeX envía la respuesta o ejecuta la acción
```

## Flujo conversacional

```text
Mensaje del usuario
        ↓
Event handler de HannaeX
        ↓
Identificación de guild y usuario
        ↓
Carga de configuración
        ↓
Carga de memoria autorizada
        ↓
Construcción de contexto
        ↓
Aplicación de CorePersona
        ↓
Consulta de Gemini
        ↓
Validación de respuesta
        ↓
Respuesta de Hoshiko
```

## Flujo de una acción sensible

```text
Solicitud del usuario
        ↓
HannaeX identifica la acción
        ↓
Valida permisos
        ↓
Consulta política del servidor
        ↓
Evalúa riesgos y confirmación
        ↓
Ejecuta la acción
        ↓
Registra el resultado
        ↓
Hoshiko explica lo ocurrido
```

Hoshiko no debe saltarse la validación técnica para cumplir una solicitud.

## Funciones que pueden utilizar la identidad

No todas las funciones necesitan IA o una respuesta desarrollada de Hoshiko.

### Uso directo de HannaeX

- Actualizar XP.
- Guardar una racha.
- Registrar minutos de voz.
- Aplicar un cooldown.
- Guardar una transacción.
- Eliminar un mensaje.
- Actualizar un ranking.
- Validar permisos.

### Uso de Hoshiko

- Explicar una recompensa.
- Celebrar un logro.
- Resumir un caso.
- Explicar una configuración.
- Conversar con el usuario.
- Presentar una misión.
- Dar contexto a un evento.
- Comunicar una alerta.

La personalidad no debe aparecer forzadamente en cada respuesta técnica.

## Separación de capas

La arquitectura debería poder representarse así:

```text
Discord Layer
      ↓
Event / Command Layer
      ↓
Feature Layer
      ↓
Service Layer
      ↓
Data Layer

Conversational Layer
      ↓
CorePersona
      ↓
PersonaConfig
      ↓
ConversationContext
      ↓
Response Builder
```

La capa conversacional consume resultados del sistema; no debe reemplazar las capas de negocio.

## Integración con features

HannaeX es multifuncional. Hoshiko puede acompañar diversas áreas:

| Área | HannaeX procesa | Hoshiko expresa |
|---|---|---|
| IA | Contexto y respuesta | Voz y personalidad |
| Comunidad | XP, eventos y rankings | Reconocimiento y celebración |
| Voz | Sesiones y minutos | Explicación de participación |
| Economía | Saldos y transacciones | Presentación de recompensas |
| Multimedia | Música y letras | Mensajes y experiencia |
| Moderación | Sanciones e historial | Explicación y comunicación |
| Seguridad | Señales y acciones | Alertas y contexto |
| Utilidades | Ejecución de comandos | Respuestas naturales |

## Configuración multiservidor

HannaeX puede funcionar en muchos servidores, pero Hoshiko debe conservar un núcleo común y adaptar su expresión localmente.

```text
CorePersona global
        + configuración del servidor
        + relación con el usuario
        + contexto actual
        = experiencia local de Hoshiko
```

La adaptación no debe crear una personalidad completamente diferente por guild.

## Planes y monetización

Los planes de HannaeX pueden ofrecer:

- Más memoria.
- Más servidores en dashboard.
- Más integración.
- Más retención.
- Más personalización.
- Más capacidad de procesamiento.
- Más funciones de equipo.

Los planes no deben cambiar los principios de Hoshiko.

```text
Plan premium ≠ personalidad sin límites
```

## Decisiones de diseño

### Decisión 1: mantener separación

Hoshiko y HannaeX deben mantenerse como conceptos distintos.

### Decisión 2: personalidad como capa

Hoshiko no debe estar mezclada con la lógica de cada feature.

### Decisión 3: adaptación controlada

La personalidad puede adaptarse, pero el canon permanece estable.

### Decisión 4: funciones independientes

Las features deben seguir funcionando aunque la IA no esté disponible, cuando técnicamente sea posible.

### Decisión 5: comunicación contextual

Hoshiko solo debe intervenir cuando aportar contexto, claridad o experiencia.

## Estado de implementación

La separación conceptual entre HannaeX y Hoshiko está definida.

La arquitectura completa de una capa conversacional separada todavía está planificada.

La integración con Gemini existe, pero debe revisarse antes de afirmar que implementa completamente:

- CorePersona.
- PersonaConfig.
- ConversationContext.
- MemoryResolver.
- StateResolver.
- ResponseValidator.

## Criterios para nuevas features

Antes de añadir una función, determinar:

1. ¿Pertenece técnicamente a HannaeX?
2. ¿Necesita que Hoshiko la comunique?
3. ¿Debe utilizar IA?
4. ¿Es local por servidor?
5. ¿Requiere memoria?
6. ¿Necesita configuración?
7. ¿Puede funcionar sin IA?
8. ¿Afecta el canon de Hoshiko?
9. ¿Debe documentarse como feature o como parte de identidad?
10. ¿Qué ocurre si la función no está disponible?

## Regla final

> HannaeX define lo que el sistema puede hacer. Hoshiko define cómo ese sistema se siente al interactuar con él.

## Notas relacionadas

- [[Hoshiko]]
- [[Hoshiko — Definición oficial]]
- [[Hoshiko — Personalidad base]]
- [[Hoshiko — Principios inmutables]]
- [[Hoshiko — Lenguaje y voz]]
- [[Hoshiko — Estados]]
- [[Hoshiko — Relaciones]]
- [[Hoshiko — Memoria]]
- [[Hoshiko — Identidad y configuración]]
- [[Hoshiko — Personalidad técnica]]
- [[Arquitectura — Visión general]]
- [[Arquitectura — Flujo de eventos]]
