---
type: feature
status: planned
area: economy
scope: guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Economía — Visión general

## Propósito

Proporcionar saldos, transacciones y recompensas internas dentro del alcance de un guild.

## Capacidades

- Cuentas.
- Moneda local.
- Transacciones.
- Recompensas.
- Tienda.
- Historial.
- Límites.
- Auditoría.

## Principios

- El saldo debe ser consistente.
- Toda modificación debe tener origen.
- No deben existir transacciones duplicadas.
- Los cálculos deben utilizar una representación segura.
- Las acciones sensibles requieren permisos y confirmación.
- La economía debe estar aislada por guild.

## Flujo común

```text
Solicitud o evento
        ↓
Validar usuario y guild
        ↓
Evaluar policy
        ↓
Comprobar límites
        ↓
Ejecutar operación atómica
        ↓
Guardar transacción
        ↓
Emitir evento
        ↓
Notificar
```

## Subfeatures

- [[Economía — Cuentas y saldos]].
- [[Economía — Transacciones]].
- [[Economía — Tienda]].
- [[Economía — Recompensas]].

## Dependencias

- Persistencia.
- Idempotencia.
- Auditoría.
- Configuración de guild.
- Permisos.
- Recompensas comunitarias.

## Estado

Área planificada.
