---
type: feature
status: planned
area: community
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Comunidad — Eventos

## Propósito

Permitir actividades temporales de participación comunitaria con reglas, progreso y recompensas.

## Componentes

- Evento.
- Periodo.
- Participantes.
- Objetivos.
- Reglas.
- Recompensas.
- Estado.
- Notificaciones.

## Estados

```text
planned
  ↓
active
  ↓
paused
  ↓
completed / cancelled
```

## Flujo

```text
Crear o configurar evento
        ↓
Validar permisos
        ↓
Publicar información
        ↓
Registrar participación
        ↓
Actualizar progreso
        ↓
Cerrar evento
        ↓
Asignar recompensas
```

## Reglas

- El periodo debe tener zona horaria definida.
- La participación debe ser idempotente.
- La configuración debe poder revisarse.
- Los cambios sensibles deben auditarse.
- Los eventos cancelados deben explicar qué ocurre con el progreso.

## Estado

Feature planificada.

## Notas relacionadas

- [[Comunidad — Visión general]].
- [[Comunidad — Recompensas]].
- [[Arquitectura — Workers y tareas asíncronas]].
