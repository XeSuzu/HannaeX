---
name: hannaex-persistence
description: Arquitectura y convenciones de la capa de persistencia Mongoose en src/Database/ de HannaeX. Úsalo al crear o editar esquemas, índices, modelos o consultas de MongoDB.
---

# HannaeX — Persistencia Mongoose (`src/Database/`)

## Cuándo usar este skill
- Al crear o modificar modelos de Mongoose en `src/Database/<dominio>/`.
- Al escribir consultas, agregaciones o migraciones sobre colecciones de MongoDB en `src/Features/`, `src/Services/`, `src/Commands/` o `src/Events/`.

## Mapa de dominios en `src/Database/`
- `connect.ts`: Conexión única a MongoDB (`connectDatabase`).
- `ai/`: `userMemory.model.ts`, `conversation.model.ts`.
- `community/`: `confession.model.ts`, `suggestion.model.ts`, `sponsor.models.ts`.
- `guild/`: `guildConfig.model.ts`, `serverConfig.model.ts`, `trigger.model.ts`.
- `leveling/`: `userLevel.model.ts`, `dailyActivity.model.ts`, `achievement.models.ts`, `globalConfig.model.ts`.
- `moderation/`: `warning.model.ts`, `automodCount.model.ts`, `tempMute.model.ts`.
- `streaks/`: `streak.model.ts`, `streakGroup.model.ts`.
- `system/`: `systemMetric.model.ts`.
- `tracking/`: `userTracking.models.ts`, `voiceSession.model.ts`.

## Reglas obligatorias
1. **Sin barriles globales**: Importa siempre desde `src/Database/<dominio>/<archivo>.model` (nunca crees `src/Database/index.ts` ni `src/Models/`).
2. **Registro idempotente de modelos**:
   ```ts
   import { Document, Model, Schema, model, models } from "mongoose";

   export const MiModelo: Model<IMiDocumento> =
     (models.MiModelo as Model<IMiDocumento>) ||
     model<IMiDocumento>("MiModelo", MiSchema);
   ```
3. **Índices sin duplicación**:
   - No declares `unique: true` o `index: true` dentro del campo del `Schema` **y además** un `Schema.index({ campo: 1 })` idéntico, ya que Mongoose emite warnings de índice duplicado.
   - Prefiere `Schema.index({ ... })` explícito para índices compuestos (`{ userId: 1, guildId: 1 }`) y TTL.
4. **Rendimiento en lecturas**:
   - Usa `.lean()` en consultas de solo lectura donde no se necesite `.save()` sobre el documento hidratado.
   - Usa operaciones atómicas (`$inc`, `$set`, `$setOnInsert` con `upsert: true`) para contadores de XP, rachas y métricas.
