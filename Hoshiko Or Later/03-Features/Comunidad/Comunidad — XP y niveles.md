---
type: feature
status: planned
area: community
scope: guild-user
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Comunidad — XP y niveles

## Propósito

Registrar actividad válida y convertirla en experiencia, niveles y progreso comunitario.

## Fuentes posibles

- Mensajes.
- Voz.
- Eventos.
- Misiones.
- Acciones administrativas autorizadas.

Cada fuente debe tener una policy independiente.

## Flujo

```text
Evento
        ↓
Validar usuario y guild
        ↓
Validar fuente
        ↓
Aplicar cooldown
        ↓
Calcular cantidad
        ↓
Guardar XP de forma segura
        ↓
Determinar nivel
        ↓
Emitir LevelUpEvent
```

## Reglas

- XP local debe utilizar `guildId` y `userId`.
- Las cantidades deben estar dentro de límites.
- Eventos repetidos no deben otorgar XP duplicada.
- El sistema debe controlar spam.
- Los cambios deben poder auditarse cuando sean importantes.
- Los mensajes eliminados o inválidos deben seguir la policy definida.

## Nivel

La fórmula puede ser:

- Lineal.
- Por umbrales.
- Curva progresiva.
- Configurable dentro de límites.

La fórmula debe estar versionada si cambiarla afecta el progreso existente.

## Configuración

- XP por fuente.
- Cooldown.
- Canales excluidos.
- Roles excluidos.
- Multiplicadores.
- Mensajes de subida de nivel.
- Canal de notificación.

## Errores

- Perfil inexistente.
- Configuración inválida.
- Evento duplicado.
- Base no disponible.
- Usuario o guild inválidos.

## Estado

Feature planificada.

## Notas relacionadas

- [[Comunidad — Visión general]].
- [[Comunidad — Rankings]].
- [[Comunidad — Recompensas]].
- [[Voz — XP de voz]].
- [[Arquitectura — Persistencia]].
