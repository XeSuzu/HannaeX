---
type: feature
status: planned
area: economy
scope: guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Economía — Recompensas

## Propósito

Conectar la economía con XP, eventos, misiones, voz y acciones autorizadas para otorgar moneda u otros beneficios.

## Fuentes

- Subida de nivel.
- Misión completada.
- Evento comunitario.
- Racha.
- Actividad de voz.
- Compra o devolución.
- Ajuste administrativo.

## Flujo

```text
Evento de elegibilidad
        ↓
Evaluar policy
        ↓
Verificar si ya fue otorgada
        ↓
Calcular beneficio
        ↓
Crear transacción
        ↓
Registrar recompensa
        ↓
Notificar
```

## Reglas

- Toda recompensa debe tener origen.
- Debe existir una clave idempotente.
- No debe otorgarse fuera del guild correcto.
- Los límites diarios o por evento deben estar definidos.
- Los errores deben dejar una operación pendiente o auditable.
- La notificación no debe ser la fuente de verdad de la recompensa.

## Modelo conceptual

```ts
interface EconomyReward {
  rewardId: string;
  guildId: string;
  userId: string;
  amount: number;
  source: string;
  sourceId?: string;
  idempotencyKey: string;
  status: "pending" | "granted" | "failed";
  createdAt: Date;
}
```

## Límites

Pueden existir límites por:

- Usuario.
- Guild.
- Día.
- Evento.
- Misión.
- Plan.
- Tipo de recompensa.

Los límites deben ser visibles o explicables cuando afectan al usuario.

## Errores

- Elegibilidad inválida.
- Recompensa duplicada.
- Saldo no actualizado.
- Fuente inexistente.
- Persistencia no disponible.
- Límite alcanzado.

## Estado

Feature planificada.

## Notas relacionadas

- [[Economía — Visión general]].
- [[Economía — Cuentas y saldos]].
- [[Economía — Transacciones]].
- [[Comunidad — Recompensas]].
- [[Comunidad — Rachas y misiones]].
- [[Voz — Recompensas]].
