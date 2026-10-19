---
type: feature
status: planned
area: community
scope: guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Comunidad — Rachas y misiones

## Propósito

Fomentar participación recurrente mediante progreso temporal, objetivos y recompensas claras.

## Rachas

Una racha representa actividad válida durante periodos consecutivos.

Debe definirse:

- Qué actividad cuenta.
- Duración del periodo.
- Hora o zona horaria.
- Tolerancia.
- Qué rompe la racha.
- Si existe recuperación.
- Cómo se audita.

## Misiones

Una misión define:

- Objetivo.
- Condición de progreso.
- Periodo.
- Recompensa.
- Límite.
- Estado.

```ts
type MissionStatus = "available" | "active" | "completed" | "expired";
```

## Flujo

```text
Actividad válida
        ↓
Actualizar progreso
        ↓
Verificar objetivo
        ↓
Completar misión o mantener racha
        ↓
Emitir recompensa
        ↓
Notificar
```

## Reglas

- El tiempo debe calcularse de forma consistente.
- El progreso no debe duplicarse.
- El usuario debe poder entender el objetivo.
- La pérdida de una racha debe comunicarse con claridad.
- Las recompensas deben usar el sistema común.
- No incentivar spam dañino.

## Estado

Feature planificada.

## Notas relacionadas

- [[Comunidad — Visión general]].
- [[Comunidad — XP y niveles]].
- [[Comunidad — Recompensas]].
- [[Arquitectura — Persistencia]].
