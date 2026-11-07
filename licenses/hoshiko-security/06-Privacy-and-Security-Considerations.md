# 06 — Privacy and Security Considerations (Hoshiko Security)

**Título:** Consideraciones de Privacidad y Seguridad de la Información — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-PRV-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT`  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `05-Data-and-Telemetry-Inventory.md`, `SecurityClient.ts`  

---

## 1. Minimización de Intents en `SecurityClient.ts`
A diferencia del bot principal, `SecurityClient.ts:9-15` solicita únicamente 5 intents:
- `Guilds`, `GuildMembers`, `GuildModeration`, `GuildMessages`, `MessageContent`.
- **No solicita `GuildPresences` ni `GuildVoiceStates`**, reduciendo la superficie de datos personales expuestos al proceso de seguridad.
- *Observación técnica:* Actualmente `HoneypotManager.handleMessage` solo necesita saber en qué `channelId` se envió el mensaje (`message.channel.id === honeypotChannelId`) sin inspeccionar el texto. Si en el futuro no se añade inspección de contenido de raid dentro de `hoshiko-security`, incluso podría evaluarse prescindir de `MessageContent` en esta aplicación o justificarlo exclusivamente cuando se incorpore detección de patrones textuales de raid.

## 2. Riesgos de Privacidad de la Lista Negra Global (`SentinelNetwork`)
- Una lista negra compartida entre servidores (`GlobalBlacklist`) que produce baneos automáticos al entrar (`SentinelNetwork.checkMember`) tiene un alto impacto sobre los derechos de los usuarios bajo la LOPDP (Art. 20 sobre decisiones automatizadas) y la Discord Developer Policy.
- **Requisito previo al despliegue:** Antes de activar `hoshiko-security` en producción, debe definirse quién tiene autoridad para ejecutar `SentinelNetwork.reportUser()`, qué evidencia verificable se exige y cómo puede apelar un usuario afectado por un falso positivo.

## 3. Falta de TTL en `RaidEpisodeModel`
- Aunque el diseño conceptual prevé conservar episodios de raid por 90 días, `raidEpisode.model.ts` aún no define un índice TTL en Mongoose. Hasta que se agregue dicho índice, cualquier política futura de `hoshiko-security` debe reflejar la conservación real o exigir primero el cambio en el esquema.
