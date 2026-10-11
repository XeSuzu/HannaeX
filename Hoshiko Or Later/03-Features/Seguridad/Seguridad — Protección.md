---
type: feature
status: planned
area: security
scope: system-guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Seguridad — Protección

## Propósito

Aplicar controles preventivos y límites contra abuso o acciones inseguras.

## Controles

- Rate limiting.
- Cooldowns.
- Validación de entradas.
- Idempotencia.
- Protección de secretos.
- Confirmación de acciones.
- Aislamiento por guild.
- Permisos mínimos.
- Límites de tamaño.
- Circuit breakers.

## Flujo

```text
Solicitud
        ↓
Validar identidad
        ↓
Validar alcance
        ↓
Aplicar rate limit
        ↓
Verificar permisos
        ↓
Aplicar policy
        ↓
Permitir, limitar o rechazar
```

## Reglas

- Los controles deben ejecutarse antes de acciones irreversibles.
- Los límites deben ser observables.
- Un plan superior no elimina protecciones básicas.
- Las claves de caché y rate limit deben incluir alcance.
- Los fallos de verificación deben ser restrictivos.

## Estado

Feature planificada. Parte de estos controles también pertenece a la arquitectura transversal de seguridad.

## Notas relacionadas

- [[Seguridad — Visión general]].
- [[Seguridad — Detección]].
- [[Seguridad — Respuesta]].
- [[Arquitectura — Seguridad]].
