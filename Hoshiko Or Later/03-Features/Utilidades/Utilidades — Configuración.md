---
type: feature
status: planned
area: utilities
scope: guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Utilidades — Configuración

## Propósito

Permitir que administradores configuren HannaeX dentro de un guild.

## Operaciones

- Activar o desactivar features.
- Configurar canales.
- Configurar roles.
- Ajustar idioma.
- Ajustar preferencias de Hoshiko.
- Configurar límites y políticas.
- Consultar configuración actual.
- Restablecer valores permitidos.

## Flujo

```text
Solicitud
        ↓
Validar administrador
        ↓
Validar valor y recurso
        ↓
Guardar configuración versionada
        ↓
Invalidar caché
        ↓
Auditar
        ↓
Confirmar
```

## Reglas

- Una configuración no concede permisos de Discord.
- Los canales y roles deben pertenecer al guild.
- Los valores deben normalizarse y validarse.
- Los cambios críticos requieren confirmación.
- No aplicar configuraciones parcialmente inválidas.
- Mantener un historial mínimo de cambios importantes.

## Configuración posible

- Locale.
- Canales de anuncios, logs y moderación.
- Roles de recompensa.
- Features activas.
- Cooldowns.
- Preferencias de voz.
- Economía.
- Moderación.
- IA y Hoshiko.

## Errores

- Permiso insuficiente.
- Canal inexistente.
- Rol inexistente.
- Valor inválido.
- Dependencia no disponible.
- Configuración incompatible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Utilidades — Visión general]].
- [[Arquitectura — Configuración y entorno]].
- [[Arquitectura — Persistencia]].
- [[Hoshiko — Identidad y configuración]].
