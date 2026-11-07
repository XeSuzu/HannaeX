# 07 — Future Terms and Conditions (Preliminary Internal Draft)

**Título:** Lineamientos para Futuros Términos de Servicio — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-FTOS-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT` (Exclusivamente Interno — Prohibida su Publicación Actual)  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `03-Roadmap-and-Planned-Features.md`, `06-Privacy-and-Security-Considerations.md`  

---

> [!WARNING]
> **DOCUMENTO INTERNO NO PUBLICABLE:** `apps/hoshiko-security` se encuentra en desarrollo y apagado en producción (`autorestart: false`). Este documento establece únicamente las cláusulas que deberán integrarse cuando el producto complete su desarrollo y auditoría.

## 1. Estructura Requerida para los Futuros Términos de Hoshiko Security
Cuando Hoshiko Security se lance como aplicación independiente en Discord, sus Términos de Servicio deberán incluir:

1. **Mandato del Administrador y Configuración de Riesgo:**
   - El administrador del servidor es el único responsable de habilitar Hoshiko Security, posicionar su rol jerárquico y designar canales Honeypot.
   - Prohibición expresa de configurar canales de uso legítimo o general como canales Honeypot con el fin de provocar baneos masivos de miembros inocentes.
2. **Naturaleza Reactiva y Límites de las Medidas Automáticas:**
   - Explicación transparente de los umbrales de disparo: Anti-Raid (5 ingresos en 15s), Anti-Nuke (3 roles o canales eliminados o 4 baneos en 10s), Honeypot (mensaje en canal trampa) y Sentinel (`GlobalBlacklist`).
   - Descargo por limitaciones externas: imposibilidad técnica de actuar sobre el dueño del servidor (`ownerId`), sobre roles superiores al bot o durante saturación de *rate limits* de la API de Discord.
3. **Procedimiento de Reversión y Apelación:**
   - Uso del botón `security_raid:undo` por el staff del servidor para revertir aislamientos o baneos de un episodio de raid.
   - Canal oficial de apelación ante el operador para solicitudes de revisión o baja de `GlobalBlacklist` (Sentinel).
