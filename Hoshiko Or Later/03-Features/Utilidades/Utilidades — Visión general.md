---
type: feature
status: planned
area: utilities
scope: system-guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Utilidades — Visión general

## Propósito

Agrupar comandos generales, configuración, información y herramientas de apoyo para usuarios y administradores.

## Capacidades

- Configuración.
- Información.
- Recordatorios.
- Herramientas.
- Administración.

## Principios

- Respuestas claras.
- Permisos explícitos.
- Validación de entradas.
- Límites de uso.
- Separación entre lectura y escritura.
- No exponer secretos.
- Acciones destructivas con confirmación.

## Flujo común

```text
Solicitud
        ↓
Identificar alcance
        ↓
Validar permisos
        ↓
Validar argumentos
        ↓
Ejecutar servicio
        ↓
Renderizar resultado
        ↓
Auditar si corresponde
```

## Subfeatures

- [[Utilidades — Configuración]].
- [[Utilidades — Información]].
- [[Utilidades — Recordatorios]].
- [[Utilidades — Herramientas]].
- [[Utilidades — Administración]].

## Estado

Área planificada.
