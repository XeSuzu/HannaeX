---
type: feature
status: planned
area: moderation
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Moderación — Automatizaciones

## Propósito

Detectar y responder a patrones configurados sin requerir una acción manual en cada caso.

## Ejemplos

- Filtros de contenido.
- Anti-spam.
- Anti-raid.
- Límites de menciones.
- Detección de enlaces.
- Alertas de actividad anómala.
- Repetición de mensajes.

## Flujo

```text
Evento
        ↓
Normalizar
        ↓
Evaluar reglas
        ↓
Calcular condición o confianza
        ↓
Aplicar acción permitida
        ↓
Registrar resultado
        ↓
Notificar o escalar
```

## Reglas

- Preferir acciones graduales.
- Evitar castigos automáticos con señales ambiguas.
- Permitir excepciones por rol o canal.
- Proteger contra evasión y abuso.
- Auditar cambios de reglas.
- Aplicar cooldowns y rate limits.
- Permitir revisión de falsos positivos.

## Acciones posibles

- Eliminar mensaje.
- Advertir.
- Aplicar timeout.
- Crear alerta.
- Crear caso.
- Escalar a moderadores.

## Estado

Feature planificada.

## Notas relacionadas

- [[Moderación — Visión general]].
- [[Moderación — Casos]].
- [[Moderación — Roles y permisos]].
- [[Seguridad — Detección]].
