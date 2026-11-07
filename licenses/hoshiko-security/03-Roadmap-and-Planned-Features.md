# 03 — Roadmap and Planned Features (Maturity Matrix)

**Título:** Matriz de Madurez y Hoja de Ruta — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-RDM-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT`  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `apps/hoshiko-security/src/`, `docs/plans/plan_antiraid.md`  

---

## 1. Clasificación Estricta de Funcionalidades

Cada módulo proyectado para Hoshiko Security se clasifica según su estado real en el repositorio (`IMPLEMENTED`, `APPROVED FOR DEVELOPMENT`, `PROPOSED`, `FUTURE`):

| Capacidad / Módulo | Clasificación Actual | Evidencia en Código / Estado Real |
| :--- | :--- | :--- |
| **Anti-Raid (Detección por umbral de joins 5 en 15s + Botones de Contención y Undo)** | **IMPLEMENTED** (En código, proceso apagado en prod) | `apps/hoshiko-security/src/modules/antiraid/AntiRaid.ts`, `raidAlertManager.ts`, `raidEpisode.model.ts`, `index.ts:38-80` |
| **Anti-Nuke (Detección en Audit Log de RoleDelete, ChannelDelete, BanAdd y remoción de roles del ejecutor)** | **IMPLEMENTED** (En código, proceso apagado en prod) | `apps/hoshiko-security/src/modules/antinuke/AntiNukeManager.ts:15-167` |
| **Honeypot (Baneo automático al escribir en canal trampa)** | **IMPLEMENTED (En memoria)** | `apps/hoshiko-security/src/modules/honeypot/honeypotHandler.ts:1-40` (Falta persistencia en DB del `channelId` por servidor y comando slash de configuración en `hoshiko-security`). |
| **Lockdown (Bloqueo/Desbloqueo de `SendMessages` en `@everyone`)** | **IMPLEMENTED (En memoria)** | `apps/hoshiko-security/src/modules/lockdown/lockdownManager.ts:1-53` (Falta persistir permisos previos por canal para restaurar estados complejos). |
| **Sentinel Network & Global Blacklist (`checkMember` y `reportUser`)** | **IMPLEMENTED (Base técnica)** | `apps/hoshiko-security/src/modules/sentinel/SentinelNetwork.ts:1-43`, `globalBlacklist.model.ts:1-16` (Falta flujo de gobernanza, revisión de pruebas y apelaciones). |
| **Anti-Alt (Filtro dedicado de cuentas recién creadas al entrar fuera de un raid)** | **APPROVED FOR DEVELOPMENT** | Actualmente `AntiRaid.ts:32-36` calcula `accountAgeDays` dentro del episodio de raid, pero no existe un módulo autónomo `AntiAlt` que rechace o aísle cuentas nuevas individualmente. |
| **Threat Detection con IA en `hoshiko-security`** | **PROPOSED** | El esquema `raidEpisode.model.ts:17` contempla el campo opcional `recommendation`, pero `apps/hoshiko-security` aún no invoca a Gemini para analizar muestras de raid. |
| **Account Compromise Detection (Detección de robo de cuenta de usuario/staff por anomalía de comportamiento)** | **FUTURE** | No implementado en código. |
| **Permission Escalation Detection (Detección de concesión furtiva de permisos `Administrator` o creación de webhooks maliciosos)** | **APPROVED FOR DEVELOPMENT** | Contemplado como extensión de `AntiNukeManager` mediante eventos `roleUpdate` y `webhooksUpdate`. |
| **Incident Recovery (Snapshots y reconstrucción automática de canales y roles borrados en un Nuke)** | **FUTURE** | No implementado (`AntiNukeManager` detiene al atacante quitándole roles, pero no recrea los canales/roles ya eliminados). |
