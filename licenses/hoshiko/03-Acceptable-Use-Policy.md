# 03 — Acceptable Use Policy (Internal Reference Dossier)

**Título:** Política Interna de Uso Aceptable y Salvaguardas Anti-Abuso  
**Identificador de Versión:** `HOSHIKO-INT-AUP-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `INTERNALLY-APPROVED`  
**Alcance:** `apps/hoshiko` (Bot Principal)  
**Referencias:** `Features/ai/contentPolicy.ts`, `Utils/triggerConditions.ts`, `Services/search.ts`, `Public/Terms-of-Service.md`  

---

## 1. Controles Técnicos de Uso Aceptable Implementados en Código

1. **Protección contra Prompt Injection y Sondeos Corporativos (`Utils/triggerConditions.ts`):**
   - `containsPromptInjection()`: Detecta y bloquea intentos de sobrescribir instrucciones del sistema (`ignore previous instructions`, `system prompt`, `jailbreak`, etc.).
   - `detectCorporateProbe()`: Intercepta preguntas dirigidas a extraer la arquitectura interna o identidad del modelo y responde manteniendo el personaje de Hoshiko.
   - `FORBIDDEN_FACT_PATTERNS` (`Database/ai/UserMemoryManager.ts:4`): Impide que un usuario inyecte recuerdos falsos reclamando ser administrador, owner, staff o tener permisos de root/bypass.

2. **Bloqueo Estricto de Contenido Ilegal y CSAM en Búsquedas (`Services/search.ts:47-85`):**
   - `BLACKLISTED_TERMS_SET`: Lista negra dura en memoria que bloquea de forma incondicional (incluso en canales marcados como NSFW) términos de abuso sexual infantil (`cp`, `loli`, `shota`, `underage`, etc.), violencia extrema (`gore`, `snuff`) y pornografía explícita antes de realizar cualquier consulta a Google Custom Search o Serper.

3. **Límites de Concurrencia, Presupuesto y Cooldowns (`Features/aiHandler.ts`, `Features/automod/aiJudge.ts`):**
   - `MAX_PENDING_PER_CHANNEL = 3` (`aiHandler.ts:18`): Descarta mensajes adicionales en ráfaga por canal para evitar agotamiento de cuota.
   - `userAiCooldown`: Cooldown de 3 segundos por usuario (`aiHandler.ts:27-31`).
   - `DAILY_AI_BUDGET_PER_GUILD = 200` (`aiJudge.ts:35`): Tope máximo de 200 evaluaciones de moderación con IA por servidor al día, degradando de forma segura al filtro local (`evaluateWithLocalRegex`) si se supera o si se abre el circuit breaker (`CIRCUIT_THRESHOLD = 3`).

## 2. Conductas Prohibidas para Usuarios y Administradores
- Usar `/confess` o `/say` para acosar, difamar, amenazar, publicar datos personales de terceros (*doxxing*) o infringir las leyes aplicables.
- Intentar evadir sanciones locales (`/confession-ban`, silenciamientos o baneos) mediante cuentas secundarias.
- Automatizar llamadas a comandos para degradar el rendimiento de MongoDB, Redis o los workers de `@napi-rs/canvas`.
- Configurar canales de registro (`#message-log`, `#confess-log`) con permisos públicos para exponer datos de moderación a miembros sin rol administrativo.
