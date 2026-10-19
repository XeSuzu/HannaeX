---
type: feature
status: planned
area: voice
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Voz — Visión general

## Propósito

Registrar y utilizar actividad válida en canales de voz para estadísticas, progresión, recompensas y funciones relacionadas.

## Capacidades

- Tracking de sesiones.
- Minutos válidos.
- XP de voz.
- Estadísticas.
- Recompensas.
- Detección de sesiones abandonadas.

## Flujo

```text
Cambio de estado de voz
        ↓
Validar guild y canal
        ↓
Abrir, actualizar o cerrar sesión
        ↓
Persistir sesión
        ↓
Calcular estadísticas
        ↓
Emitir XP o recompensa
```

## Reglas

- Definir qué canales cuentan.
- Decidir si usuarios muteados o solos cuentan.
- Evitar duplicar minutos.
- Cerrar sesiones antiguas.
- Respetar configuración y privacidad.
- Procesar cálculos pesados fuera del listener.

## Subfeatures

- [[Voz — Tracking de sesiones]].
- [[Voz — XP de voz]].
- [[Voz — Estadísticas]].
- [[Voz — Recompensas]].

## Estado

Área planificada. El código real debe verificarse antes de asignar estado definitivo.
