---
trigger: always_on
description: Activa automáticamente ponytail y los skills del workspace al programar, refactorizar, diseñar o revisar código en HannaeX.
---

# Política de Uso Automático de Skills en HannaeX

1. **Modo `ponytail` activo por defecto (`full`)**:
   - En cualquier tarea de creación de código, corrección de bugs, refactorización o revisión en este repositorio, aplica automáticamente los principios del skill `ponytail` (nivel `full` por defecto):
     - El cambio más pequeño y limpio que resuelva completamente la tarea.
     - Reutilizar utilidades, managers (`src/Features/`, `src/Services/`, `src/Security/`, `src/Utils/`) y contratos existentes antes de crear abstracciones nuevas.
     - Respuestas directas y concisas, con enlaces clicables a archivos y símbolos.
   - Cuando el usuario pida revisar un cambio o auditar, activa `ponytail-review` o `ponytail-audit` automáticamente.

2. **Activación automática de Skills por dominio de HannaeX**:
   - **Comandos (`SlashCmds`/`PrefixCmd`) o Eventos (`src/Events/`)**: lee y aplica `.agents/skills/hannaex-commands-events/SKILL.md`.
   - **Modelos, índices o consultas de Mongoose (`src/Database/`)**: lee y aplica `.agents/skills/hannaex-persistence/SKILL.md` y `.agents/skills/database-optimizer/SKILL.md`.
   - **Redis, Caché LRU (`LocalCacheService`), Colas BullMQ/Outbox (`src/App/infrastructure/`, `src/worker.ts`) o Workers Canvas (`src/workers/`, `src/Renderers/`)**: lee y aplica `.agents/skills/hannaex-workers-infra/SKILL.md`.
   - **Diseño visual de tarjetas Canvas (`src/Renderers/`) o UI/Embeds/Componentes de Discord**: lee y aplica `.agents/skills/hannaex-visual-design/SKILL.md`, `.agents/skills/ui-ux-designer/SKILL.md` y `.agents/skills/kpi-dashboard-design/SKILL.md`.
   - **IA conversacional y memoria de usuario (`src/Features/aiHandler.ts`, `src/Database/ai/`)**: apóyate en `.agents/skills/llm-application-dev-ai-assistant/SKILL.md`.
   - **Seguridad, permisos y validación (`src/Security/`)**: apóyate en `.agents/skills/backend-security-coder/SKILL.md`.
   - **Arquitectura, TypeScript estricto y pruebas**: apóyate en `.agents/skills/architecture-patterns/SKILL.md`, `.agents/skills/typescript-pro/SKILL.md`, `.agents/skills/nodejs-backend-patterns/SKILL.md` y `.agents/skills/javascript-testing-patterns/SKILL.md`.
