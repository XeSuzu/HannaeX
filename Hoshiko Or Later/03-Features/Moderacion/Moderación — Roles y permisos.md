---
type: feature
status: planned
area: moderation
scope: guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Moderación — Roles y permisos

## Propósito

Definir quién puede ejecutar cada acción de moderación y qué permisos requiere el bot.

## Capas

- Permisos de Discord.
- Roles del guild.
- Permisos internos de HannaeX.
- Propiedad del recurso.
- Restricciones del plan.
- Estado de la feature.

## Flujo de autorización

```text
Identificar actor
        ↓
Identificar guild
        ↓
Leer permisos actuales
        ↓
Evaluar policy interna
        ↓
Verificar permisos del bot
        ↓
Verificar jerarquía
        ↓
Permitir o rechazar
```

## Reglas

- El bot no puede superar su jerarquía.
- Una configuración no concede permisos de Discord.
- Los permisos deben comprobarse en el contexto actual.
- Cambios sensibles deben auditarse.
- Si no se puede verificar un permiso, se rechaza la acción.
- Los roles protegidos deben tener reglas explícitas.

## Estado

Feature planificada.

## Notas relacionadas

- [[Moderación — Visión general]].
- [[Moderación — Comandos]].
- [[Moderación — Automatizaciones]].
- [[Moderación — Auditoría]].
- [[Arquitectura — Seguridad]].
