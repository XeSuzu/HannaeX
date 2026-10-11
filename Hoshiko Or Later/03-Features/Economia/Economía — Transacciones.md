---
type: feature
status: planned
area: economy
scope: guild-user
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Economía — Transacciones

## Propósito

Registrar movimientos de moneda de forma consistente, auditable e idempotente.

## Tipos

- Recompensa.
- Compra.
- Transferencia.
- Penalización.
- Ajuste administrativo.
- Reembolso.
- Bonificación de evento.

## Flujo

```text
Solicitud
        ↓
Validar actor, guild y cuenta
        ↓
Validar cantidad y policy
        ↓
Comprobar idempotencia
        ↓
Actualizar saldo de forma atómica
        ↓
Registrar transacción
        ↓
Auditar si corresponde
        ↓
Notificar
```

## Datos mínimos

- `transactionId`.
- `guildId`.
- `userId`.
- Tipo.
- Cantidad.
- Saldo anterior.
- Saldo posterior.
- Fuente.
- Actor, cuando aplique.
- Clave idempotente.
- Fecha.

## Reglas

- No modificar saldo sin una transacción.
- Registrar saldo anterior y posterior.
- Utilizar cantidades seguras.
- Evitar duplicación por reintentos.
- Separar ajustes administrativos de operaciones normales.
- No permitir que una respuesta de IA ejecute movimientos sin autorización.
- Mantener el alcance por guild.

## Concurrencia

La operación debe protegerse mediante una estrategia apropiada:

- Actualización atómica.
- Versionado optimista.
- Lock por cuenta.
- Cola por usuario.
- Idempotencia.

## Errores

- Cantidad inválida.
- Saldo insuficiente.
- Cuenta inexistente.
- Guild inválido.
- Operación duplicada.
- Concurrencia.
- Persistencia no disponible.

## Auditoría

Los ajustes administrativos, reembolsos y operaciones inusuales deben generar auditoría con motivo y actor.

## Estado

Feature planificada. Debe verificarse si existe alguna implementación actual antes de marcarla como parcial o implementada.

## Notas relacionadas

- [[Economía — Visión general]].
- [[Economía — Cuentas y saldos]].
- [[Economía — Tienda]].
- [[Economía — Recompensas]].
- [[Arquitectura — Persistencia]].
- [[Arquitectura — Seguridad]].
