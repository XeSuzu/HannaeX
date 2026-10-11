---
type: feature
status: planned
area: moderation
scope: guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Moderación — Casos

## Propósito

Representar incidentes de moderación con historial, estado y responsables.

## Estados

```text
open
  ↓
under_review
  ↓
resolved / dismissed / escalated
```

## Datos posibles

- Identificador.
- Guild.
- Usuario afectado.
- Actor.
- Motivo.
- Evidencia permitida.
- Acciones tomadas.
- Estado.
- Fechas.
- Referencias externas.

## Flujo

```text
Incidente
        ↓
Crear caso
        ↓
Registrar evidencia mínima
        ↓
Asignar responsable
        ↓
Aplicar o recomendar acción
        ↓
Revisar
        ↓
Cerrar o escalar
```

## Reglas

- Restringir acceso.
- Registrar cambios.
- Evitar conservar evidencia innecesaria.
- Permitir corrección administrativa.
- Mantener historial de decisiones.
- Separar investigación de sanción automática.

## Estado

Feature planificada.

## Notas relacionadas

- [[Moderación — Visión general]].
- [[Moderación — Comandos]].
- [[Moderación — Automatizaciones]].
- [[Moderación — Auditoría]].
