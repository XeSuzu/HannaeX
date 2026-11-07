# 09 — Legal and Technical Open Questions (Hoshiko Security)

**Título:** Cuestiones Abiertas Técnicas y Jurídicas Antes del Lanzamiento — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-OPN-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `NEEDS-REVIEW`  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `03-Roadmap-and-Planned-Features.md`, `06-Privacy-and-Security-Considerations.md`  

---

## 1. Requisitos Bloqueantes antes de Publicar Documentación de Hoshiko Security

| ID | Cuestión Abierta | Estado Actual en Código | Acción Requerida antes de Publicar |
| :--- | :--- | :--- | :--- |
| **SEC-OPN-01** | **Gobernanza y Apelación de `SentinelNetwork` (`GlobalBlacklist`)** | `SentinelNetwork.reportUser(userId, reason)` inserta en `GlobalBlacklist` y `checkMember` banea automáticamente al entrar a cualquier servidor con el bot. No existe procedimiento de verificación de pruebas ni canal de apelación documentado. | Definir política estricta: sólo el operador (`v.sxn`) tras verificar evidencia de raid/nuke puede añadir a `GlobalBlacklist`, e implementar un canal/correo de apelación para remover falsos positivos. |
| **SEC-OPN-02** | **Ausencia de Índice TTL en `RaidEpisodeModel`** | `raidEpisode.model.ts` guarda episodios de raid en MongoDB sin fecha de caducidad automática. | Añadir índice TTL en `raidEpisode.model.ts` (ej. 90 días) o definir política expresa de depuración antes de prometer un plazo en una política pública. |
| **SEC-OPN-03** | **Persistencia de Configuración de `Honeypot` y `Lockdown`** | `HoneypotManager` y `LockdownManager` guardan los IDs en `Map`/`Set` en memoria RAM, perdiéndose al reiniciar el proceso, y no tienen comandos slash propios en `apps/hoshiko-security`. | Conectar `HoneypotManager` y `LockdownManager` a persistencia en MongoDB y definir comandos administrativos propios antes de ofrecerlos a servidores externos. |
| **SEC-OPN-04** | **Necesidad del Intent Privilegiado `MessageContent` en `SecurityClient`** | `SecurityClient.ts` solicita `GatewayIntentBits.MessageContent`, pero ningún módulo actual de `apps/hoshiko-security` lee `message.content` (`HoneypotManager` sólo comprueba `message.channel.id`). | Retirar `MessageContent` de `SecurityClient.ts` si no se va a analizar contenido de texto, o implementar el análisis heurístico de texto de raid que lo justifique ante Discord. |
| **SEC-OPN-05** | **Definición Comercial de Planes Gratuitos vs. Premium** | No existe lógica de planes ni facturación en `apps/hoshiko-security`. | Definir alcance comercial, precios, procesador de pagos y condiciones de reembolso antes de redactar cláusulas de pago. |
