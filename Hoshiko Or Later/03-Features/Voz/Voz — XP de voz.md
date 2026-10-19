---
type: feature
status: planned
area: voice
scope: guild-user
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Voz — XP de voz

## Propósito

Convertir minutos de voz válidos en XP de comunidad sin duplicar recompensas ni incentivar actividad artificial.

## Flujo

```text
Sesión cerrada
        ↓
Validar duración y reglas
        ↓
Determinar minutos válidos
        ↓
Calcular XP
        ↓
Aplicar idempotencia
        ↓
Actualizar perfil
        ↓
Evaluar nivel y recompensas
```

## Reglas pendientes

- Si cuentan usuarios solos.
- Si cuentan usuarios muteados.
- Duración mínima.
- Canales excluidos.
- Multiplicadores.
- Límite diario.
- XP por periodo.
- Tratamiento de sesiones recuperadas.

## Integridad

- Una sesión no debe otorgar XP dos veces.
- La sesión debe pertenecer al mismo guild que el perfil.
- El origen debe registrarse.
- Los cálculos deben ser reproducibles.

## Estado

Feature planificada.

## Notas relacionadas

- [[Voz — Visión general]].
- [[Voz — Tracking de sesiones]].
- [[Comunidad — XP y niveles]].
- [[Arquitectura — Workers y tareas asíncronas]].
