# 05 — Data and Telemetry Inventory (Hoshiko Security)

**Título:** Inventario de Datos Forenses y Persistencia — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-DAT-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT`  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `raidEpisode.model.ts`, `globalBlacklist.model.ts`, `AntiRaid.ts`, `AntiNukeManager.ts`  

---

## 1. Matriz de Datos de `apps/hoshiko-security`

| Data ID | Modelo / Estructura | Campos Exactos en Código | Ubicación | Retención Actual en Código | Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-DAT-01** | `RaidEpisodeModel` (`raidEpisode.model.ts`) | `episodeId`, `guildId`, `startTime`, `lastSuspectTime`, `suspects[]` (`id`, `username`, `accountAgeDays`, `joinedSecondsAgo`), `suspectIds[]`, `recommendation`, `commonMetadata`, `status`, `appliedAction`, `appliedBy`, `appliedAt`, `revertedBy`, `revertedAt`, `actionTaken`, `actionExpiresAt`, `resolved`, `resolvedAt`, `resolvedBy`, `createdAt`, `updatedAt` | MongoDB (`RaidEpisode`) + Map en memoria (`activeEpisodes` en `raidAlertManager.ts`) | **Indefinido en MongoDB** (El esquema `raidEpisode.model.ts` **no tiene índice TTL definido** actualmente; la propuesta de retención de 90 días requiere añadir un índice TTL antes de producción). | `apps/hoshiko-security/src/modules/antiraid/raidEpisode.model.ts:1-77` |
| **SEC-DAT-02** | `GlobalBlacklist` (`globalBlacklist.model.ts`) | `userId`, `reason`, `addedAt` | MongoDB (`GlobalBlacklist`) | **Indefinido en MongoDB** (sin índice TTL ni campos de expiración). | `apps/hoshiko-security/src/modules/sentinel/globalBlacklist.model.ts:1-16` |
| **SEC-DAT-03** | Ventana de Ingresos Anti-Raid (`AntiRaid.joinsMap`) | `id`, `username`, `accountAgeDays`, `joinedSecondsAgo`, `timestamp` | Memoria RAM del proceso | **15 segundos** (`TIME_WINDOW = 15_000`; se depura en el siguiente join o al reiniciar). | `apps/hoshiko-security/src/modules/antiraid/AntiRaid.ts:24-45` |
| **SEC-DAT-04** | Contadores Anti-Nuke (`roleTracker`, `channelTracker`, `banTracker`) | Clave `${guildId}:${executorId}` -> `{ count, lastAction }` | Memoria RAM del proceso | **10 segundos** (`TIME_WINDOW = 10_000`; se elimina al disparar la mitigación). | `apps/hoshiko-security/src/modules/antinuke/AntiNukeManager.ts:15-24, 39-56` |
| **SEC-DAT-05** | Estado Honeypot y Lockdown (`honeypotChannels`, `lockedGuilds`) | `guildId`, `channelId` | Memoria RAM del proceso | Mientras dure el proceso o hasta levantar el lockdown (`liftLockdown`). | `honeypotHandler.ts:4`; `lockdownManager.ts:4` |
