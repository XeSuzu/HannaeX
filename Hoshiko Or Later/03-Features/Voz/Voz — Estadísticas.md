---
type: feature
status: planned
area: voice
scope: guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Voz — Estadísticas

## Propósito

Mostrar actividad de voz de un usuario o guild en periodos definidos.

## Métricas posibles

- Minutos totales.
- Sesiones.
- Duración media.
- Canal más utilizado.
- Actividad diaria.
- Actividad semanal.
- Comparación con periodos anteriores.

## Flujo

```text
Solicitud
        ↓
Validar alcance
        ↓
Consultar agregados
        ↓
Aplicar periodo y zona horaria
        ↓
Renderizar estadísticas
```

## Reglas

- Indicar el periodo consultado.
- No exponer estadísticas de otros usuarios sin permiso o política.
- Utilizar agregados para evitar consultas pesadas.
- Definir cómo se tratan sesiones abiertas.
- Respetar eliminación o anonimización de datos.

## Estado

Feature planificada.

## Notas relacionadas

- [[Voz — Visión general]].
- [[Voz — Tracking de sesiones]].
- [[Arquitectura — Persistencia]].
- [[Arquitectura — Escalabilidad]].
