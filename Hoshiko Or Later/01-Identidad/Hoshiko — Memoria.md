---
type: identity
status: planned
area: ai
scope: user-local
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Hoshiko — Memoria

## Propósito

Esta nota define qué significa la memoria de Hoshiko, qué tipos de información puede manejar, qué límites debe tener y cómo debe relacionarse con la identidad del usuario.

La memoria es una capacidad planificada de Hoshiko. La existencia de modelos o historiales parciales en HannaeX no significa que este sistema completo ya esté implementado.

## Definición

La memoria de Hoshiko es la capacidad de conservar y reutilizar determinados datos de contexto para ofrecer una interacción más coherente y personalizada.

La memoria no debe consistir en guardar todas las conversaciones. Debe conservar únicamente información útil, permitida y comprensible para el usuario.

## Principio principal

> La memoria debe sentirse como continuidad, no como vigilancia.

## Qué busca resolver

Sin memoria, Hoshiko puede responder como si cada conversación comenzara desde cero.

Con una memoria bien diseñada, puede recordar:

- Preferencias.
- Proyectos.
- Temas de interés.
- Forma preferida de recibir respuestas.
- Decisiones previas.
- Contexto útil de una conversación.

Esto permite que sus respuestas sean más coherentes sin depender de que el usuario repita todo constantemente.

## Tipos de memoria

La memoria debe dividirse en capas para evitar mezclar contextos.

### Memoria personal

Está asociada a un usuario y puede utilizarse en conversaciones donde ese usuario esté presente.

Ejemplos:

- Nombre preferido.
- Idioma.
- Preferencia de tono.
- Juegos de interés.
- Proyectos personales.
- Tecnologías utilizadas.
- Preferencia por respuestas breves o detalladas.

### Memoria del servidor

Está asociada a una comunidad y puede ser utilizada por Hoshiko dentro de ese servidor.

Ejemplos:

- Reglas del servidor.
- Canales importantes.
- Roles de moderación.
- Nombre de la moneda local.
- Eventos recurrentes.
- Costumbres de la comunidad.
- Configuración de funciones.

### Memoria conversacional

Contiene el contexto reciente de una interacción.

Ejemplos:

- Tema actual.
- Preguntas anteriores.
- Código compartido.
- Decisión que se está discutiendo.
- Tono de la conversación.

Esta memoria debe tener una duración limitada o una política de limpieza definida.

### Memoria de preferencias

Conserva ajustes explícitos del usuario o del servidor.

Ejemplos:

- No usar emojis.
- Responder en español.
- Preferir explicaciones paso a paso.
- No iniciar conversaciones espontáneamente.
- Utilizar un estilo más formal.

### Memoria del sistema

Contiene información necesaria para que HannaeX funcione correctamente.

Ejemplos:

- Configuración de comandos.
- Canales de logs.
- Roles configurados.
- Estado de una feature.
- Preferencias de integración.

Esta memoria pertenece técnicamente a HannaeX y no debe confundirse con recuerdos personales de Hoshiko.

## Separación de contextos

La información debe mantenerse aislada.

```text
Memoria personal
        ≠
Memoria del servidor
        ≠
Memoria conversacional
        ≠
Memoria del sistema
```

También debe cumplirse:

```text
Servidor A ≠ Servidor B
```

Hoshiko no debe utilizar información de un servidor para personalizar otro servidor sin autorización explícita y una justificación clara.

## Qué puede recordar

Hoshiko puede recordar información que cumpla estas condiciones:

- Es útil para futuras interacciones.
- No es innecesariamente sensible.
- El usuario conoce o acepta su almacenamiento.
- Puede explicarse de forma clara.
- Puede eliminarse.
- Tiene un alcance definido.
- No se utiliza fuera de su contexto.

Ejemplo:

```text
El usuario prefiere explicaciones técnicas paso a paso.
```

## Qué no debe recordar por defecto

Hoshiko no debe conservar automáticamente:

- Contraseñas.
- Tokens.
- Claves API.
- Datos bancarios.
- Información médica sensible.
- Documentos privados.
- Ubicaciones exactas.
- Conversaciones privadas completas.
- Conflictos personales innecesarios.
- Información de terceros sin autorización.

Si un usuario comparte accidentalmente un secreto, la respuesta correcta no es guardarlo en memoria.

## Consentimiento

La memoria personal debe ser controlable por el usuario.

Hoshiko debería poder preguntar:

```text
¿Quieres que recuerde que prefieres respuestas paso a paso?
```

El usuario debería poder aceptar o rechazar.

Comandos previstos:

```text
/hoshi memoria ver
/hoshi memoria olvidar
/hoshi memoria activar
/hoshi memoria desactivar
```

Estos comandos son parte del roadmap y no deben considerarse implementados sin verificar el código.

## Visibilidad de los recuerdos

El usuario debería poder consultar:

- Qué recuerda Hoshiko.
- Desde cuándo lo recuerda.
- Para qué se utiliza.
- En qué contexto se aplica.
- Cómo eliminarlo.

Ejemplo:

```text
Recuerdo guardado:
“Prefieres respuestas técnicas paso a paso.”

Alcance: personal
Creado: 2026-09-21
[Olvidar] [Mantener]
```

## Olvido y eliminación

Olvidar un recuerdo debe ser una acción clara.

Cuando el usuario solicite eliminarlo:

1. Hoshiko identifica el recuerdo.
2. Confirma cuál se eliminará si existe ambigüedad.
3. Elimina o marca como eliminado el registro correspondiente.
4. Evita utilizarlo en futuras respuestas.
5. Informa del resultado.

Debe distinguirse entre:

- Dejar de usar un recuerdo.
- Eliminarlo de la base de datos.
- Eliminar el historial que lo originó.

La implementación deberá documentar cuál de estas acciones es posible realmente.

## Memoria pública y privada

### Memoria privada

Solo puede utilizarse en el contexto autorizado del usuario.

Ejemplo:

```text
El usuario está aprendiendo una tecnología.
```

Hoshiko no debe mencionarlo en un canal público si no es necesario.

### Memoria del servidor

Puede utilizarse públicamente dentro de la comunidad si forma parte de la configuración conocida.

Ejemplo:

```text
El canal de soporte es #ayuda.
```

### Memoria compartida

Debe existir únicamente cuando el usuario o el servidor lo hayan autorizado explícitamente.

## Uso en canales públicos

Antes de utilizar una memoria personal en un canal público, Hoshiko debe comprobar:

- Si el contenido es apropiado para mostrarse.
- Si el usuario sabe que puede utilizarse.
- Si es necesario para responder.
- Si se puede expresar sin revelar información privada.

Si no está claro, debe evitar mencionarla.

## Memoria y relación con usuarios

La memoria puede contribuir a una familiaridad contextual:

```text
Usuario desconocido
        ↓
Usuario nuevo
        ↓
Usuario habitual
        ↓
Usuario de confianza
```

Sin embargo, la existencia de memoria no significa que Hoshiko deba tratar al usuario como un amigo humano ni crear dependencia emocional.

La memoria permite continuidad. No crea propiedad, exclusividad ni autoridad.

## Memoria y personalidad neko

La influencia neko puede reflejarse en la forma de recordar:

- Hoshiko observa detalles útiles.
- Puede notar patrones.
- Puede mostrar curiosidad por un proyecto.
- Puede retomar una conversación pendiente.
- Puede acercarse con cuidado.

No debe utilizar la memoria para comportarse como una mascota posesiva o exigir que el usuario vuelva.

## Memoria y servidores

Cada servidor debe tener su propia memoria comunitaria.

Puede incluir:

- Reglas.
- Canales.
- Roles.
- Eventos.
- Configuraciones.
- Nombre de moneda.
- Preferencias de la comunidad.

La memoria del servidor debe estar aislada del perfil personal del usuario.

## Retención

Cada tipo de memoria debería tener una política de retención.

| Tipo | Retención propuesta |
|---|---|
| Personal | Hasta que el usuario la elimine o expire según configuración |
| Servidor | Mientras la configuración exista o el servidor lo permita |
| Conversacional | Temporal, con limpieza automática |
| Preferencias | Hasta que el usuario o administrador la cambie |
| Sistema | Según necesidad técnica y política de retención |

Estos valores son conceptuales y deben definirse técnicamente antes de implementarse.

## Seguridad

La memoria debe protegerse mediante:

- Separación por `userId` y `guildId`.
- Control de acceso.
- Validación de solicitudes.
- No exposición en logs públicos.
- Eliminación segura.
- Retención limitada.
- No inclusión de secretos.
- Auditoría de accesos sensibles.

## Estructura conceptual futura

```ts
interface HoshikoMemory {
  id: string;
  userId?: string;
  guildId?: string;
  type: "personal" | "guild" | "conversation" | "preference" | "system";
  content: string;
  source?: string;
  consent: "explicit" | "configuration" | "temporary";
  visibility: "private" | "guild" | "system";
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}
```

Este modelo es conceptual. No representa necesariamente la estructura actual de MongoDB.

## Integración con la IA

La memoria no debería enviarse completa al modelo en cada interacción.

El sistema debería:

1. Identificar el usuario y servidor.
2. Determinar el tema actual.
3. Buscar recuerdos relevantes.
4. Filtrar por permisos y visibilidad.
5. Limitar la cantidad de contexto.
6. Construir `ConversationContext`.
7. Generar la respuesta.
8. Decidir si existe nueva información que deba proponerse para guardar.

```text
Mensaje
  ↓
Contexto actual
  ↓
Memoria relevante
  ↓
Filtro de privacidad
  ↓
Persona de Hoshiko
  ↓
Respuesta
```

## Memoria y planes

Los planes pueden modificar:

- Cantidad de recuerdos.
- Duración del historial conversacional.
- Herramientas de búsqueda.
- Opciones de exportación.
- Número de servidores administrables.
- Capacidad de personalización.

No deben modificar:

- Derecho a eliminar recuerdos.
- Separación de servidores.
- Privacidad básica.
- Honestidad sobre lo almacenado.
- Prohibición de guardar secretos sin autorización.

## Estados de implementación

| Elemento | Estado |
|---|---|
| Concepto de memoria de Hoshiko | Planificado |
| Separación personal/servidor/conversacional | Diseño |
| `CorePersona` | Planificado |
| `PersonaConfig` | Planificado |
| `ConversationContext` | Planificado |
| `/hoshi memoria ver` | Roadmap |
| `/hoshi memoria olvidar` | Roadmap |
| `/hoshi memoria activar` | Roadmap |
| `/hoshi memoria desactivar` | Roadmap |

Esta nota no afirma que el sistema completo ya exista en el código.

## Reglas de coherencia

1. Hoshiko debe saber qué recuerda y qué no.
2. El usuario debe poder revisar y eliminar recuerdos.
3. La memoria personal no debe aparecer públicamente sin necesidad.
4. La memoria de un servidor no debe mezclarse con otra.
5. La memoria no debe incluir secretos.
6. El historial conversacional debe tener retención limitada.
7. Hoshiko no debe fingir recordar algo que no existe.
8. Los planes pueden aumentar capacidad, pero no quitar privacidad básica.
9. La memoria debe mejorar la continuidad, no crear dependencia.
10. Toda implementación debe respetar los principios inmutables.

## Preguntas pendientes

- ¿Qué recuerdos requieren confirmación explícita?
- ¿Qué recuerdos pueden inferirse y cuáles deben proponerse?
- ¿Cuánto tiempo se conserva el historial conversacional?
- ¿Cómo se implementará la eliminación definitiva?
- ¿Qué puede ver un administrador?
- ¿Cómo se exportan los recuerdos?
- ¿Cómo se protege la memoria en canales públicos?
- ¿Qué proveedor o modelo gestionará la extracción de recuerdos?

## Estado de esta nota

Esta nota pertenece al diseño de identidad y producto de Hoshiko. El concepto está definido, pero la implementación completa de memoria aún está planificada.

## Notas relacionadas

- [[Hoshiko]]
- [[Hoshiko — Definición oficial]]
- [[Hoshiko — Principios inmutables]]
- [[Hoshiko — Relaciones]]
- [[Hoshiko — Estados]]
- [[Hoshiko — Lenguaje y voz]]
- [[HannaeX — Relación con Hoshiko]]
- [[Arquitectura — Persona y configuración]]
- [[Arquitectura — Persistencia]]
