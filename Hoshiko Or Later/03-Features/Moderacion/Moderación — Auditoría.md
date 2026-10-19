---
type: feature
status: planned
area: moderation
scope: guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Moderación — Auditoría

## Propósito

Registrar acciones administrativas y eventos relevantes para investigación y transparencia operativa.

## Eventos

- Acción ejecutada.
- Acción rechazada.
- Configuración modificada.
- Regla activada.
- Caso creado o cerrado.
- Rol modificado.
- Evidencia añadida o eliminada.
- Permiso cambiado.

## Registro conceptual

```ts
interface ModerationAuditRecord {
  auditId: string;
  guildId: string;
  action: string;
  actorId?: string;
  targetId?: string;
  caseId?: string;
  result: "success" | "denied" | "failed";
  reasonCode?: string;
  correlationId?: string;
  createdAt: Date;
}
```

## Reglas

- No registrar secretos.
- Limitar datos personales.
- Restringir acceso.
- Mantener integridad del registro.
- Definir retención.
- Asociar `correlationId` cuando sea posible.
- No depender únicamente de mensajes visibles en Discord.

## Estado

Feature planificada.

## Notas relacionadas

- [[Moderación — Visión general]].
- [[Moderación — Comandos]].
- [[Moderación — Casos]].
- [[Arquitectura — Observabilidad]].
- [[Arquitectura — Seguridad]].
