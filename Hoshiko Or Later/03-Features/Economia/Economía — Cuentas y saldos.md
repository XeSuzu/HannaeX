---
type: feature
status: planned
area: economy
scope: guild-user
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Economía — Cuentas y saldos

## Propósito

Mantener una cuenta por usuario y guild con un saldo consistente y consultable.

## Modelo conceptual

```ts
interface EconomyAccount {
  guildId: string;
  userId: string;
  currency: string;
  balance: number;
  version: number;
  updatedAt: Date;
}
```

## Reglas

- La cuenta debe incluir el alcance del guild.
- El saldo no debe cambiar sin una transacción.
- La actualización debe ser atómica.
- Las cantidades deben validarse.
- Debe definirse si se permiten saldos negativos.
- La moneda debe identificarse por guild o instancia.

## Flujo de consulta

```text
Usuario
        ↓
Validar guild y userId
        ↓
Cargar cuenta
        ↓
Ocultar datos no necesarios
        ↓
Mostrar saldo y moneda
```

## Concurrencia

Se pueden utilizar:

- Versionado optimista.
- Actualizaciones atómicas.
- Locks por cuenta.
- Idempotencia.

## Errores

- Cuenta inexistente.
- Guild inválido.
- Saldo inconsistente.
- Concurrencia.
- Base no disponible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Economía — Visión general]].
- [[Economía — Transacciones]].
- [[Arquitectura — Persistencia]].
