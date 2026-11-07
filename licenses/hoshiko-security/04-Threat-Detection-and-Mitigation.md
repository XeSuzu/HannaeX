# 04 — Threat Detection and Mitigation Architecture

**Título:** Arquitectura de Detección de Amenazas y Mitigación — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-TDM-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT`  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `AntiRaid.ts`, `raidAlertManager.ts`, `AntiNukeManager.ts`, `honeypotHandler.ts`, `SentinelNetwork.ts`  

---

## 1. Flujo de Detección y Mitigación Anti-Raid (`AntiRaid.ts` + `raidAlertManager.ts`)
1. **Ingesta (`handleJoin`):** Cada evento `GuildMemberAdd` registra `{ id, username, accountAgeDays, joinedSecondsAgo: 0, timestamp }` en `AntiRaid.joinsMap` por `guildId`.
2. **Ventana Deslizante:** Se filtran entradas con `now - timestamp < 15000` (15 segundos).
3. **Disparo (`triggerRaidAlert`):** Al alcanzar `JOIN_LIMIT = 5`, se genera un `episodeId` único (`raid_<guildId>_<timestamp>_<hex>`), se registra en memoria (`registerActiveEpisode`) y, si MongoDB está conectado (`readyState === 1`), se persiste en `RaidEpisodeModel`.
4. **Alerta Interactiva:** Se envía un embed de alerta con botones `security_raid:timeout:<episodeId>`, `security_raid:ban:<episodeId>`, `security_raid:undo:<episodeId>` y `security_raid:ignore:<episodeId>`.
5. **Ejecución y Reversión (`executeRaidAction` en `raidAlertManager.ts`):**
   - `timeout` / `isolate`: Aplica aislamiento temporal (2 horas) a los sospechosos jerárquicamente moderables.
   - `ban`: Banea a los sospechosos del servidor.
   - `undo`: Levanta los baneos (`guild.members.unban`) o aislamientos (`member.timeout(null)`) aplicados en ese episodio y marca `revertedBy` / `revertedAt`.

## 2. Flujo Anti-Nuke (`AntiNukeManager.ts`)
1. **Vigilancia de Audit Logs:** Escucha `RoleDelete` (`ROLE_LIMIT = 3` en 10s), `ChannelDelete` (`CHANNEL_LIMIT = 3` en 10s) y `GuildBanAdd` (`BAN_LIMIT = 4` en 10s).
2. **Exclusiones Seguras:** Ignora acciones ejecutadas por el propio bot o por el dueño del servidor (`guild.ownerId`).
3. **Mitigación (`mitigateExecutor`):** Obtiene el miembro ejecutor, filtra todos sus roles no gestionados cuya posición sea estrictamente inferior a la posición del rol más alto del bot (`r.position < botHighestPos`), y los retira con `member.roles.remove()`, neutralizando la cuenta comprometida.

## 3. Flujo Honeypot (`honeypotHandler.ts`) y Sentinel (`SentinelNetwork.ts`)
- **Honeypot:** Si un usuario no-bot envía un mensaje en el `channelId` registrado en `HoneypotManager` para ese servidor, el mensaje se elimina y el miembro es baneado inmediatamente si `member.bannable` es `true`.
- **Sentinel:** Al entrar un miembro (`GuildMemberAdd`), si MongoDB está conectado (`readyState === 1`), consulta `GlobalBlacklist.findOne({ userId: member.id })`. Si existe y `member.bannable` es `true`, ejecuta `member.ban()`.
