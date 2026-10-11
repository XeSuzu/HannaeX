---
type: feature
status: planned
area: utilities
scope: system-guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Utilidades — Información

## Propósito

Mostrar información útil del bot, guild, usuario, configuración y estado de servicios.

## Ejemplos

- Ayuda.
- Versión.
- Estado.
- Perfil.
- Información del guild.
- Comandos disponibles.
- Límites del plan.
- Estado de una integración.
- Información de una feature.

## Flujo

```text
Solicitud
        ↓
Identificar alcance
        ↓
Validar permisos
        ↓
Consultar fuente autorizada
        ↓
Filtrar datos sensibles
        ↓
Renderizar respuesta
```

## Reglas

- No exponer secretos.
- Respetar permisos.
- Diferenciar estado interno de información pública.
- Indicar cuándo una función está deshabilitada.
- No mostrar datos privados de terceros.
- Indicar la versión real del sistema cuando esté disponible.

## Respuestas posibles

- Mensaje breve.
- Embed informativo.
- Lista paginada.
- Panel de ayuda.
- Diagnóstico restringido.

## Errores

- Recurso no encontrado.
- Datos no disponibles.
- Permiso insuficiente.
- Integración degradada.

## Estado

Feature planificada.

## Notas relacionadas

- [[Utilidades — Visión general]].
- [[Utilidades — Administración]].
- [[Arquitectura — Observabilidad]].
- [[Arquitectura — Despliegue]].
