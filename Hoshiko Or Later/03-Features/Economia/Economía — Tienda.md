---
type: feature
status: planned
area: economy
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Economía — Tienda

## Propósito

Permitir que los usuarios canjeen saldo por artículos o beneficios configurados por el guild.

## Componentes

- Catálogo.
- Artículo.
- Precio.
- Disponibilidad.
- Inventario o beneficio.
- Límite por usuario.
- Compra.
- Reembolso, si aplica.

## Modelo conceptual

```ts
interface ShopItem {
  itemId: string;
  guildId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  purchaseLimit?: number;
  rewardType: string;
  enabled: boolean;
}
```

## Flujo de compra

```text
Consultar catálogo
        ↓
Seleccionar artículo
        ↓
Validar disponibilidad
        ↓
Validar saldo y límites
        ↓
Confirmar compra
        ↓
Crear transacción
        ↓
Entregar beneficio
        ↓
Registrar resultado
```

## Reglas

- La compra debe ser atómica o compensable.
- El precio utilizado debe quedar registrado.
- Un artículo no disponible no puede comprarse.
- Los beneficios deben entregarse de forma idempotente.
- El bot debe tener permisos para roles o acciones relacionadas.
- Los cambios del catálogo deben auditarse.
- El precio no debe cambiar entre confirmación y ejecución sin informar.

## Catálogo

Los administradores autorizados pueden:

- Crear artículos.
- Editar descripción.
- Cambiar precio.
- Activar o desactivar artículos.
- Definir stock.
- Definir límites.
- Revisar compras.

## Errores

- Artículo inexistente.
- Artículo desactivado.
- Stock agotado.
- Saldo insuficiente.
- Límite alcanzado.
- Permiso insuficiente.
- Entrega fallida.
- Compra duplicada.

## Reembolsos

Un reembolso debe crear una transacción inversa y registrar:

- Motivo.
- Actor.
- Compra original.
- Fecha.
- Beneficio retirado o estado de compensación.

## Estado

Feature planificada.

## Notas relacionadas

- [[Economía — Visión general]].
- [[Economía — Cuentas y saldos]].
- [[Economía — Transacciones]].
- [[Economía — Recompensas]].
- [[Arquitectura — Persistencia]].
