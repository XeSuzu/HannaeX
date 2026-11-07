# 01 — Product Vision & Operational Independence

**Título:** Visión de Producto y Arquitectura Independiente — Hoshiko Security  
**Identificador de Versión:** `HSEC-INT-VIS-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `DRAFT` (Producto en Desarrollo — No Publicado)  
**Alcance:** `apps/hoshiko-security`  
**Referencias:** `apps/hoshiko-security/src/index.ts`, `ecosystem.config.js`, `tests/unit/security-separation.test.cjs`  

---

## 1. Propósito y Separación Arquitectónica
**Hoshiko Security** (`apps/hoshiko-security`) es un producto independiente de ciberdefensa perimetral y protección estructural para servidores de Discord. Ha sido separado del bot principal (`apps/hoshiko`) tanto a nivel de código como de proceso operativo:

1. **Aislamiento de Proceso y Credenciales:**
   - Opera en su propio workspace (`apps/hoshiko-security`) y proceso PM2 (`hoshiko-security`, declarado con `autorestart: false` en `ecosystem.config.js:58-73`).
   - Utiliza su propio cliente Discord (`SecurityClient.ts`) y variable de entorno `HOSHIKO_SECURITY_TOKEN` en `.env.security` (`SecurityConfig.ts`).
   - Si `HOSHIKO_SECURITY_TOKEN` no está configurado, el proceso finaliza limpiamente sin iniciar sesión en Discord (verificado por test `SEP-03`).
2. **Separación de Responsabilidades frente a Hoshiko Principal:**
   - **Hoshiko Principal (`apps/hoshiko`):** Conserva la interacción social, niveles, confesiones, IA conversacional y el AutoMod de contenido cotidiano (`wordFilter`, `linkProtector`, `aiJudge`).
   - **Hoshiko Security (`apps/hoshiko-security`):** Concentra la defensa perimetral de alto impacto: `Anti-Raid`, `Anti-Nuke`, `Honeypot`, `Lockdown` y `Sentinel Network` (verificado por tests `SEP-01` y `SEP-02`).

## 2. Modelo Potencial de Distribución (Gratuito vs. Premium)
- **Estado actual:** En desarrollo interno (`DRAFT`), sin oferta comercial activa.
- **Planes futuros (`FUTURE`):** Se contempla ofrecer un nivel base gratuito de protección perimetral (Anti-Raid básico y Honeypot) y un eventual nivel Premium con telemetría forense extendida, reglas personalizadas de Anti-Nuke y respaldos de configuración, sujeto a redacción contractual definitiva antes de cualquier lanzamiento.
