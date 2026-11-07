# 📚 Centro de Documentación de HannaeX & Hoshiko

Bienvenido al directorio de documentación técnica, arquitectónica y operativa del monorepo HannaeX / Hoshiko. Este espacio está estructurado por categorías temáticas para facilitar la exploración rápida y el onboarding del equipo.

---

## 🗺️ Mapa de Categorías

| Categoría | Directorio | Descripción |
| :--- | :--- | :--- |
| 🏛️ **Arquitectura** | [`architecture/`](./architecture/) | Visión general del monorepo, especificación de logs y diseño del sistema. |
| 💻 **Desarrollo** | [`development/`](./development/) | Guía de desarrollo local, flujos de trabajo, variables de entorno y comandos. |
| 🛡️ **Seguridad** | [`security/`](./security/) | Inventario defensivo, matrices de protección y módulos de seguridad. |
| 📋 **Planes y Roadmaps** | [`plans/`](./plans/) | Planes estratégicos y directrices para subsistemas clave (Anti-Raid, IA). |
| ⚖️ **Moderación** | [`moderation/`](./moderation/) | Arquitectura y especificación técnica del sistema de casos y moderación. |
| 🎵 **Música y Multimedia** | [`music/`](./music/) | Subsistema de música, nodos Lavalink, ADRs y diagramas Mermaid (`.mmd`). |
| 🎙️ **Voice XP** | [`voice-xp/`](./voice-xp/) | Sistema de experiencia por voz, ciclo de vida de sesiones y planes de prueba. |
| ⚙️ **Operaciones** | [`operations/`](./operations/) | Despliegue con PM2, configuración de Redis y mediciones de caché. |
| 🔍 **Auditorías y Reportes** | [`audits/`](./audits/) | Auditorías de privacidad, reportes de limpieza, migración y saneamiento por lotes. |

---

## 📂 Detalle de Contenidos por Categoría

### 🏛️ [architecture/](./architecture/) — Arquitectura y Especificaciones
- **[`PROJECT_OVERVIEW.md`](./architecture/PROJECT_OVERVIEW.md)**: Panorama global del monorepo, responsabilidades entre `apps/hoshiko` y `apps/hoshiko-security`, y arquitectura de servicios.
- **[`hoshiko-logs-specification.md`](./architecture/hoshiko-logs-specification.md)**: Especificación integral del sistema de auditoría y logs centralizados.
- **[`plan_de_arquitectura_y_seguridad.md`](./architecture/plan_de_arquitectura_y_seguridad.md)**: Diseño original de separación modular, permisos y segregación de privilegios.

### 💻 [development/](./development/) — Guías de Desarrollo
- **[`Hoshiko_Dev.md`](./development/Hoshiko_Dev.md)**: Guía práctica para desarrolladores: entorno de ejecución, comandos `npm`, configuración local y convenciones de código.

### 🛡️ [security/](./security/) — Seguridad y Defensa
- **[`defensa-inventario.md`](./security/defensa-inventario.md)**: Matriz exhaustiva del inventario defensivo, validación de componentes activos y desconectados.

### 📋 [plans/](./plans/) — Planes Estratégicos
- **[`plan_antiraid.md`](./plans/plan_antiraid.md)**: Plan maestro de implementación para los módulos de Anti-Raid y Sentinel.
- **[`plan_ia.md`](./plans/plan_ia.md)**: Estrategia de integración de IA conversacional y persistencia contextual con Google Gemini.

### ⚖️ [moderation/](./moderation/) — Moderación
- **[`SISTEMA_MODERACION.md`](./moderation/SISTEMA_MODERACION.md)**: Manual y arquitectura del flujo de sanciones, casos secuenciales (`/case`, `/cases`) y acciones automáticas.

### 🎵 [music/](./music/) — Música, Lavalink y Diagramas Mermaid
- **[`README.md`](./music/README.md)**: Introducción al subsistema de streaming musical.
- **[`ARCHITECTURE.md`](./music/ARCHITECTURE.md)**: Diseño técnico, comunicación con Lavalink y gestión de colas.
- **[`DECISIONS.md`](./music/DECISIONS.md)** y **[`decisions/ADR/`](./music/decisions/ADR/)**: Registros de decisión de arquitectura (ADR).
- **[`INFRASTRUCTURE.md`](./music/INFRASTRUCTURE.md)**: Requisitos de despliegue y topología de nodos de audio.
- **[`LEGAL.md`](./music/LEGAL.md)**: Directrices de cumplimiento normativo y políticas de audio.
- **[`PROVIDERS.md`](./music/PROVIDERS.md)**: Fuentes y proveedores de reproducción compatibles.
- **[`ROADMAP.md`](./music/ROADMAP.md)**: Objetivos futuros del reproductor.
- **[`research/`](./music/research/)**: Evaluaciones de rendimiento, Lavalink y benchmarking de proveedores.
- **[`architecture/`](./music/architecture/) (Diagramas Mermaid `.mmd`)**:
  - `01-system-context.mmd`: Contexto general del sistema.
  - `02-components.mmd`: Diagrama de componentes.
  - `03-playback-sequence.mmd`: Flujo de secuencia de reproducción.
  - `04-lavalink-communication.mmd`: Protocolo de comunicación con Lavalink.
  - `05-deployment.mmd`: Topología de despliegue.
  - `06-failover-recovery.mmd`: Resiliencia y recuperación ante caídas de nodo.
  - `07-scaling.mmd`: Estrategia de escalabilidad.
  - `08-data-security.mmd`: Modelo de seguridad de datos.

### 🎙️ [voice-xp/](./voice-xp/) — Experiencia de Voz (Voice XP)
- **[`README.md`](./voice-xp/README.md)**: Resumen del subsistema de recompensas por tiempo en canales de voz.
- **[`current-architecture.md`](./voice-xp/current-architecture.md)**: Flujo de persistencia y seguimiento de sesiones activas.
- **[`event-flow.md`](./voice-xp/event-flow.md)**: Mapeo paso a paso del evento `voiceStateUpdate`.
- **[`investigation-report.md`](./voice-xp/investigation-report.md)**: Diagnóstico de fallos pasados y cuellos de botella detectados.
- **[`known-issues.md`](./voice-xp/known-issues.md)**: Problemas identificados y mitigaciones aplicadas.
- **[`proposed-improvements.md`](./voice-xp/proposed-improvements.md)**: Propuestas de optimización asíncrona.
- **[`regression-test-plan.md`](./voice-xp/regression-test-plan.md)**: Estrategia de pruebas unitarias y de regresión.

### ⚙️ [operations/](./operations/) — Operaciones y Despliegue
- **[`deployment-processes.md`](./operations/deployment-processes.md)**: Guía de despliegue en entornos de staging y producción usando PM2.
- **[`redis-ubuntu-oracle-vm.md`](./operations/redis-ubuntu-oracle-vm.md)**: Procedimiento de configuración de Redis en Ubuntu / Oracle VM.
- **[`medicion-cache.md`](./operations/medicion-cache.md)**: Métricas y resultados de rendimiento de caché local L1 y Redis L2.

### 🔍 [audits/](./audits/) — Auditorías y Saneamiento
- **[`PRIVACY-AUDIT.md`](./audits/PRIVACY-AUDIT.md)**: Auditoría de privacidad, almacenamiento de identificadores y datos de usuario.
- **[`MODERATION_AUDIT_REPORT.md`](./audits/MODERATION_AUDIT_REPORT.md)**: Diagnóstico y resolución de bugs en el motor de moderación.
- **[`HOSHIKO_CLEANUP_REPORT.md`](./audits/HOSHIKO_CLEANUP_REPORT.md)**: Informe de saneamiento de imports, tipados y código muerto.
- **[`MONOREPO_MIGRATION_REPORT.md`](./audits/MONOREPO_MIGRATION_REPORT.md)**: Registro de migración de la estructura original hacia monorepo.
- **[`codebase/`](./audits/codebase/)**: Documentación de la auditoría metódica por lotes (`CORRECCION.md`, `HALLAZGOS.md`, `HUMANO.md`, `PROGRESO.md`, `RESUMEN.md`).

---

## 🔗 Enlaces a Recursos Relacionados

- **Identidad, Lore y Personalidad**: [`../Hoshiko Or Later/`](../Hoshiko%20Or%20Later/) (Vault de Obsidian con guías conceptuales y la filosofía de Hoshiko).
- **Marco Legal y Políticas Públicas**: [`../licenses/public/PRIVACY_POLICY.md`](../licenses/public/PRIVACY_POLICY.md) y [`../licenses/public/TERMS_OF_SERVICE.md`](../licenses/public/TERMS_OF_SERVICE.md) (Términos de servicio y políticas de privacidad oficiales para Hoshiko).
- **Términos y Licencias Legales**: [`../licenses/`](../licenses/) (Única fuente de verdad oficial de licencias, atribuciones y expedientes jurídicos).
- **Directrices de Agentes IA**: [`../AGENTS.md`](../AGENTS.md) (Reglas operativas para asistentes de código en HannaeX).
