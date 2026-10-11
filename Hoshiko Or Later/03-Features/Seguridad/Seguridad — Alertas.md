---
type: feature
status: planned
area: security
scope: system-guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Seguridad — Alertas

## Propósito

Comunicar señales relevantes a los responsables adecuados sin crear ruido excesivo ni exponer datos sensibles.

## Tipos

- Operativa.
- Moderación.
- Seguridad.
- Economía.
- Integraciones.
- Disponibilidad.

## Severidad

```text
info
  ↓
warning
  ↓
high
  ↓
critical
```

## Datos

Una alerta puede incluir:

- Identificador.
- Guild.
- Fuente.
- Severidad.
- Resumen.
- Recomendación.
- Estado.
- Fecha.
- `correlationId`.

## Reglas

- Definir destinatarios.
- Evitar alertas duplicadas.
- Incluir acción recomendada.
- Restringir contenido sensible.
- Permitir reconocer y cerrar alertas.
- Escalar alertas no atendidas cuando corresponda.

## Estado

Feature planificada.

## Notas relacionadas

- [[Seguridad — Visión general]].
- [[Seguridad — Detección]].
- [[Seguridad — Incidentes]].
- [[Arquitectura — Observabilidad]].
