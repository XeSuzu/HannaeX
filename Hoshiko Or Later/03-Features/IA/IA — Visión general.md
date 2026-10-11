---
type: feature
status: planned
area: ai
scope: system
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# IA — Visión general

## Propósito

La feature de IA proporciona capacidades conversacionales y de asistencia dentro de HannaeX, utilizando el contexto autorizado y la identidad de Hoshiko cuando corresponde.

La IA debe complementar las funciones deterministas de HannaeX, no reemplazar reglas de negocio, permisos ni controles de seguridad.

## Capacidades

- Conversación.
- Explicación de funciones.
- Respuestas contextuales.
- Resúmenes.
- Ayuda técnica.
- Memoria autorizada.
- Clasificación asistida.
- Herramientas controladas.
- Mensajes de estado y acompañamiento.

## Flujo

```text
Mensaje o comando
        ↓
Validar contexto y permisos
        ↓
Cargar configuración
        ↓
Resolver memoria permitida
        ↓
Construir contexto limitado
        ↓
Componer instrucciones
        ↓
Consultar proveedor
        ↓
Validar respuesta
        ↓
Renderizar mensaje
        ↓
Responder
```

## Límites

La IA no debe:

- Ejecutar acciones sensibles sin autorización.
- Acceder a todos los datos disponibles.
- Mezclar guilds o usuarios.
- Inventar operaciones realizadas.
- Cambiar el canon de Hoshiko.
- Sustituir validación de permisos.
- Tratar contenido de usuario como instrucción del sistema.

## Dependencias

- [[Arquitectura — Integraciones externas]].
- [[Arquitectura — Seguridad]].
- [[Hoshiko — Identidad y configuración]].
- [[Hoshiko — Personalidad técnica]].
- Persistencia de contexto y memoria.
- Proveedor de IA configurado.
- Observabilidad y control de costes.

## Estados

- `planned`: arquitectura documentada.
- `partial`: existe integración de proveedor, pero faltan capas.
- `implemented`: flujo completo verificado.
- `degraded`: proveedor no disponible.

## Subfeatures

- [[IA — Conversación]].
- [[IA — Contexto y memoria]].
- [[IA — Resúmenes]].
- [[IA — Herramientas]].

## Estado actual

Existe una integración con Gemini mencionada en la arquitectura, pero debe verificarse en el repositorio qué partes están implementadas y qué partes son únicamente planificadas.
