---
type: feature
status: planned
area: voice
scope: guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Voz — Recompensas

## Propósito

Asignar recompensas por hitos de actividad de voz, sin convertir la permanencia artificial en un mecanismo de abuso.

## Posibles recompensas

- XP.
- Nivel.
- Rol.
- Insignia.
- Moneda.
- Reconocimiento.
- Desbloqueo de misión.

## Flujo

```text
Hito alcanzado
        ↓
Validar elegibilidad
        ↓
Comprobar duplicación
        ↓
Asignar recompensa
        ↓
Registrar resultado
        ↓
Notificar
```

## Reglas

- El hito debe utilizar minutos válidos.
- La recompensa debe ser idempotente.
- Deben existir límites razonables.
- El bot necesita permisos para roles o mensajes.
- Un fallo de notificación no debe duplicar el beneficio.

## Estado

Feature planificada.

## Notas relacionadas

- [[Voz — Visión general]].
- [[Voz — XP de voz]].
- [[Comunidad — Recompensas]].
