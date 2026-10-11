---
type: feature
status: planned
area: voice
scope: guild-user
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Voz — Tracking de sesiones

## Propósito

Registrar cuándo un usuario entra, permanece o sale de un canal de voz dentro de un guild.

## Modelo conceptual

```ts
interface VoiceSession {
  sessionId: string;
  guildId: string;
  userId: string;
  channelId?: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  status: "open" | "closed" | "recovered";
}
```

## Flujo

```text
VoiceStateUpdate
        ↓
Identificar transición
        ↓
Validar canal y usuario
        ↓
Abrir o cerrar sesión
        ↓
Guardar de forma idempotente
        ↓
Emitir evento interno
```

## Reglas

- Una sesión abierta debe tener alcance claro.
- Los eventos repetidos no deben abrir sesiones duplicadas.
- El cierre por reinicio debe poder marcarse como recuperado.
- Deben definirse canales excluidos.
- La duración debe calcularse con timestamps confiables.

## Errores

- Estado inconsistente.
- Sesión duplicada.
- Canal inexistente.
- Usuario fuera del guild.
- Persistencia no disponible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Voz — Visión general]].
- [[Voz — XP de voz]].
- [[Arquitectura — Persistencia]].
- [[Arquitectura — Recuperación ante fallos]].
