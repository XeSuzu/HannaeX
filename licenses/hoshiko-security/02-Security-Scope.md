# 02 — Security Scope & Operational Boundaries

**Título:** Alcance de Seguridad y Límites Operativos — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-SCP-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT`  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `apps/hoshiko-security/src/modules/`, `docs/security/defensa-inventario.md`  

---

## 1. Perímetro de Protección
Hoshiko Security está diseñado para actuar sobre eventos estructurales y de incursión masiva en Discord:

1. **Incursiones Masivas (`AntiRaid`):** Vigilancia de `guildMemberAdd` para detectar ráfagas anómalas de ingresos y permitir contención en bloque (`timeout`, `kick`, `ban`) y reversión (`undo`).
2. **Destrucción de Infraestructura (`AntiNukeManager`):** Vigilancia de `roleDelete`, `channelDelete` y `guildBanAdd` consultando el Audit Log de Discord para neutralizar cuentas con permisos comprometidos.
3. **Trampas de Bots (`HoneypotManager`):** Vigilancia en `messageCreate` sobre canales trampa designados para banear cuentas automatizadas que publican indiscriminadamente en todos los canales.
4. **Cierre de Emergencia (`LockdownManager`):** Remoción y restauración rápida del permiso `SendMessages` del rol `@everyone` ante crisis activas.
5. **Lista Negra Global (`SentinelNetwork`):** Verificación de nuevos miembros contra `GlobalBlacklist` al ingresar al servidor.

## 2. Límites Técnicos y de Jerarquía
- **Jerarquía de Discord:** Como cualquier bot de Discord, Hoshiko Security no puede sancionar al propietario del servidor (`guild.ownerId`) ni modificar o retirar roles cuya posición sea igual o superior al rol más alto del bot (`AntiNukeManager.ts:36-37, 130-145`).
- **Rate Limits de Discord API:** En incursiones de cientos de cuentas simultáneas, la velocidad de baneo o aislamiento está limitada por los *rate limits* por ruta de Discord.
- **Estado en Memoria vs. Persistencia:** Actualmente, la configuración de canales Honeypot (`HoneypotManager.honeypotChannels`) y los servidores en Lockdown (`LockdownManager.lockedGuilds`) se mantienen en estructuras `Map`/`Set` en memoria RAM del proceso.
