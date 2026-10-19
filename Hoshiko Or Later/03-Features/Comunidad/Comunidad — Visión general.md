---
type: feature
status: planned
area: community
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Comunidad — Visión general

## Propósito

Las features de comunidad convierten la actividad de un servidor en progresión, reconocimiento y participación continua.

## Capacidades

- XP y niveles.
- Rankings.
- Recompensas.
- Rachas.
- Misiones.
- Eventos.
- Notificaciones.
- Perfil comunitario.

## Principios

- La progresión debe ser explicable.
- Las recompensas no deben duplicarse.
- La configuración pertenece al guild.
- Los rankings deben respetar privacidad y alcance.
- La participación no debe depender de manipulación.
- El sistema debe evitar incentivar spam o abuso.

## Flujo común

```text
Evento de actividad
        ↓
Validar fuente
        ↓
Aplicar cooldown o policy
        ↓
Guardar progreso
        ↓
Evaluar nivel, misión o recompensa
        ↓
Emitir evento interno
        ↓
Notificar si corresponde
```

## Dependencias

- Persistencia.
- Configuración de guild.
- Permisos.
- Workers.
- Observabilidad.
- Notificaciones de Discord.

## Subfeatures

- [[Comunidad — XP y niveles]].
- [[Comunidad — Rankings]].
- [[Comunidad — Recompensas]].
- [[Comunidad — Rachas y misiones]].
- [[Comunidad — Eventos]].

## Estado

Área planificada. Cada subfeature debe verificarse contra el código real.
