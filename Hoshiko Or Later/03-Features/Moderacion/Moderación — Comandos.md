---
type: feature
status: planned
area: moderation
scope: guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Moderación — Comandos

## Propósito

Exponer acciones manuales de moderación mediante comandos autorizados.

## Operaciones posibles

- Advertir.
- Silenciar.
- Expulsar.
- Banear.
- Desbanear.
- Limpiar mensajes.
- Consultar historial.
- Crear caso.

## Flujo

```text
Comando
        ↓
Validar actor
        ↓
Validar objetivo
        ↓
Validar permisos del usuario y bot
        ↓
Evaluar policy
        ↓
Confirmar si es sensible
        ↓
Ejecutar acción
        ↓
Crear caso y auditoría
        ↓
Notificar
```

## Reglas

- No permitir autoacciones peligrosas sin policy.
- Verificar jerarquía de roles.
- Evitar moderar roles protegidos sin reglas claras.
- Registrar motivo cuando corresponda.
- No exponer datos de moderación en canales públicos innecesariamente.
- Confirmar acciones irreversibles o de alto impacto.

## Errores

- Permiso insuficiente.
- Objetivo inválido.
- Bot sin jerarquía.
- Usuario fuera del guild.
- Acción no disponible.
- Discord no disponible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Moderación — Visión general]].
- [[Moderación — Casos]].
- [[Moderación — Roles y permisos]].
- [[Moderación — Auditoría]].
