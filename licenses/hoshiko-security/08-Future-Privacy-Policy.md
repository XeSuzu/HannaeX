# 08 — Future Privacy Policy (Preliminary Internal Draft)

**Título:** Lineamientos para Futura Política de Privacidad — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-FPRV-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT` (Exclusivamente Interno — Prohibida su Publicación Actual)  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `05-Data-and-Telemetry-Inventory.md`, `06-Privacy-and-Security-Considerations.md`  

---

> [!WARNING]
> **DOCUMENTO INTERNO NO PUBLICABLE:** No publicar hasta que `apps/hoshiko-security` tenga definidos sus índices TTL en base de datos y su procedimiento de apelación Sentinel.

## 1. Elementos Obligatorios para la Futura Política de Privacidad
1. **Datos Tratados:**
   - Identificadores y metadatos de sospechosos en episodios de raid (`RaidEpisodeModel`: `id`, `username`, `accountAgeDays`, `joinedSecondsAgo`, `appliedAction`, `appliedBy`, `revertedBy`).
   - Identificadores y motivo en `GlobalBlacklist` (`userId`, `reason`, `addedAt`).
   - Contadores efímeros en RAM de Audit Log (`AntiNukeManager`: `executor.id`, expiración en 10s).
2. **Base Jurídica:**
   - Interés legítimo de seguridad de la información, protección de comunidades digitales contra ataques coordinados y defensa frente a actos destructivos (Art. 7 num. 8 y Art. 18 de la LOPDP de Ecuador / Art. 6.1.f y 17.3.e del RGPD).
3. **Plazos de Conservación a Implementar Antes del Lanzamiento:**
   - Ventanas de detección en RAM: 10 a 15 segundos.
   - `RaidEpisodeModel`: Definir e implementar en código el plazo de retención (ej. 90 días mediante índice TTL en MongoDB) antes de declararlo públicamente.
   - `GlobalBlacklist`: Conservación vinculada a la vigencia de la amenaza verificada, sujeta a derecho de rectificación/oposición ante error o falso positivo.
