---
type: feature
status: planned
area: community
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Comunidad — Recompensas

## Propósito

Asignar beneficios o reconocimientos por niveles, logros, misiones, eventos o actividad válida.

## Tipos

- Rol.
- Moneda.
- Insignia.
- Título.
- Acceso a canal.
- Mensaje de reconocimiento.
- Recompensa de evento.

## Flujo

```text
Evento de elegibilidad
        ↓
Evaluar policy
        ↓
Verificar si ya fue otorgada
        ↓
Asignar beneficio
        ↓
Registrar resultado
        ↓
Notificar
```

## Reglas

- La recompensa debe ser idempotente.
- Debe existir un motivo y origen.
- El bot debe tener permisos para asignarla.
- Los límites del plan no deben crear estados incoherentes.
- Una recompensa fallida debe quedar pendiente o registrada.
- No prometer una recompensa que no puede asignarse.

## Roles

Antes de asignar un rol:

- Verificar que el rol exista.
- Verificar jerarquía del bot.
- Verificar que el usuario pueda recibirlo.
- Registrar si la asignación falló.

## Errores

- Recompensa duplicada.
- Rol inexistente.
- Permiso insuficiente.
- Usuario fuera del guild.
- Configuración inválida.
- Persistencia no disponible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Comunidad — Visión general]].
- [[Comunidad — XP y niveles]].
- [[Comunidad — Rachas y misiones]].
- [[Arquitectura — Workers y tareas asíncronas]].
