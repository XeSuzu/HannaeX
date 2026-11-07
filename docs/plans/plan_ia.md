# PLAN_IA.md: Optimización, Arquitectura, Memoria y Core Conversacional (HannaeX / Hoshiko)

> **Documento:** `plan_ia.md`  
> **Estado:** **CORRECCIÓN DIRIGIDA COMPLETADA Y VALIDADA (96/96 Tests Pasando - 100%)**.

---

## 0. Resumen de Correcciones Dirigidas Post-Auditoría

| Área Corregida | Archivo / Línea | Causa Raíz Resuelta | Verificación |
| :--- | :--- | :--- | :--- |
| **Semántica Absoluta de TTL / Cooldowns** | [`LocalCacheService.ts:20, 39`](file:///home/hanna/HannaeX/src/App/infrastructure/cache/LocalCacheService.ts#L20), [`aiHandler.ts:17-25`](file:///home/hanna/HannaeX/src/Features/aiHandler.ts#L17) | Se añadió opción `updateAgeOnGet: boolean` (default `true` para preservar compatibilidad con `CacheManager`). En `aiHandler.ts` y `automodState.ts` (`actionCooldownL1`) se configuró explícitamente `updateAgeOnGet: false` para que las lecturas con `get()` no prolonguen el cooldown. | `tests/unit/ai-phase3-cache-and-culture.test.cjs` (prueba determinista de TTL) |
| **Sanitización Robusta de Historial** | [`conversationContext.ts:20`](file:///home/hanna/HannaeX/src/Features/ai/conversationContext.ts#L20) | Regex desanclada `/\[([^[\]\n]{1,64}(?:\s+dice\|\s+says)?)\s*\]\s*:/gi` que neutraliza evasiones con Markdown (`**[Hoshiko dice]:**`, `> [Hoshiko dice]:`, etc.) sin tocar corchetes legítimos (`[1, 2, 3]`). | `tests/unit/ai-phase2-prompt-isolation.test.cjs` (casos Markdown y citas) |
| **Escape Estructural de Recuerdos** | [`SystemPrompts.ts:11, 105`](file:///home/hanna/HannaeX/src/Utils/AI/SystemPrompts.ts#L11) | Función `escapeXml` que convierte `<`, `>`, `&`, `"`, `'` a entidades XML seguras, impidiendo que `</user_profile>` cierre prematuramente el bloque de perfil del usuario. | `tests/unit/ai-phase2-prompt-isolation.test.cjs` (intento de inyección XML) |
| **Matriz de Cobertura en `shouldExtractFacts`** | [`conversationContext.ts:26-55`](file:///home/hanna/HannaeX/src/Features/ai/conversationContext.ts#L26) | Ampliación de patrones biográficos para cubrir dietas (`vegetariano/vegano`), posesiones familiares con plurales/numerales (`tengo 2 hermanos`), verbos de afición (`amo`, `suelo jugar`, `juego al`) y metas (`mi sueño es`), descartando preguntas técnicas y saludos. | `tests/unit/ai-phase6-memory-gating.test.cjs` (matriz de 18 casos) |
| **Observabilidad de Google Search Fallback** | [`conversationReply.ts:18`](file:///home/hanna/HannaeX/src/Features/ai/conversationReply.ts#L18) | Registro estructurado sin secretos que emite advertencia con código y mensaje abreviado al degradar a texto puro si falla la búsqueda. | `tests/unit/ai-phase5-tools-degradation.test.cjs` |
