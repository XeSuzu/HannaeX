# Problemas Técnicos Confirmados y Clasificación de Hallazgos en Voice XP (Revisión Final)

Este documento presenta la catalogación técnica, evidencia en código fuente, mecánicas de fallo, resolución de discrepancias y clasificación formal de aprobación para el subsistema de Voice XP de HannaeX.

---

## 1. Matriz de Clasificación y Estado de Aprobación

| ID | Hallazgo Investigado | Estado Técnico | Severidad | Criterio Final de Aprobación | Archivo Principal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **V01** | Pérdida de minutos residuales y liquidaciones discontinuas | **Confirmado** | **CRITICAL** | **Listo para implementar** | [`src/Events/Client/handlers/voice/voiceManager.ts`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceManager.ts#L90-L98) |
| **V02** | Reset semanal compartido asimétrico entre texto y voz | **Confirmado** | **HIGH** | **Listo para implementar** | [`src/Features/leveling/voiceXp.ts`](file:///home/hanna/HannaeX/src/Features/leveling/voiceXp.ts#L65-L77) y [`src/Features/leveling/textXp.ts`](file:///home/hanna/HannaeX/src/Features/leveling/textXp.ts#L116-L137) |
| **V03** | Carrera entre intervalo y cierre; trampa E11000 en upsert | **Confirmado** | **HIGH** | **Listo para implementar** | [`src/Events/Client/handlers/voice/voiceManager.ts`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceManager.ts#L178-L189) |
| **V04** | Ausencia de roles, anuncios y levellog en subidas de nivel de voz | **Confirmado** | **MEDIUM** | **Requiere decisión de producto** | [`src/Features/leveling/voiceXp.ts`](file:///home/hanna/HannaeX/src/Features/leveling/voiceXp.ts#L95-L109) |
| **V05** | Pérdida de XP tras reinicio y penalización incorrecta de curva | **Confirmado** | **HIGH** | **Listo para implementar** | [`src/Events/Client/handlers/voice/voiceManager.ts`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceManager.ts#L48-L53) |
| **V06** | Acompañante ensordecido/silenciado cuenta para el quórum | **Confirmado parcialmente** | **MEDIUM** | **Requiere decisión de producto** | [`src/Events/Client/handlers/voice/voiceUtils.ts`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceUtils.ts#L14-L24) |
| **V07** | Purga de sesiones activas > 24 horas por índice TTL | **Confirmado parcialmente** | **LOW** | **No requiere cambios** | [`src/Database/leveling/activeVoiceSession.model.ts`](file:///home/hanna/HannaeX/src/Database/leveling/activeVoiceSession.model.ts#L23-L26) |
| **V08** | Excepciones silenciadas y bloqueo potencial por timeout en Mongo | **Confirmado** | **HIGH** | **Listo para implementar** | [`src/Events/Client/handlers/voice/voiceUtils.ts`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceUtils.ts#L44-L51) y [`src/Services/mongo.ts`](file:///home/hanna/HannaeX/src/Services/mongo.ts#L27) |

---

## 2. Detalle Exhaustivo de los Hallazgos

### V01. Pérdida de Minutos Residuales y Liquidaciones Discontinuas
- **Estado:** **Confirmado** | **Listo para implementar**
- **Severidad:** **CRITICAL**
- **Archivos:** [`src/Events/Client/handlers/voice/voiceManager.ts#L90-L98`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceManager.ts#L90-L98) y [`#L189`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceManager.ts#L189).
- **Evidencia y Solución Definitiva:** Se resuelve mediante avance exacto en intervalos continuos (`start += minutes * 60_000`) y desacoplamiento de liquidaciones discontinuas (40s + 20s = 60s) indexadas con `creditId` determinista derivado del token de sesión.

---

### V02. Reset Semanal Compartido Asimétrico
- **Estado:** **Confirmado** | **Listo para implementar**
- **Severidad:** **HIGH**
- **Archivos:** [`src/Features/leveling/voiceXp.ts#L65-L77`](file:///home/hanna/HannaeX/src/Features/leveling/voiceXp.ts#L65-L77) y [`src/Features/leveling/textXp.ts#L116-L137`](file:///home/hanna/HannaeX/src/Features/leveling/textXp.ts#L116-L137).
- **Evidencia y Solución Definitiva:** Se resuelve mediante un pipeline de agregación atómico de un solo paso en MongoDB (`[ { $set: ... } ]`), eliminando la vulnerabilidad de carreras concurrentes entre texto y voz.

---

### V03. Carrera entre Intervalo y Cierre; Eliminación de la Trampa E11000
- **Estado:** **Confirmado** | **Listo para implementar**
- **Severidad:** **HIGH**
- **Archivos:** [`src/Events/Client/handlers/voice/voiceManager.ts#L178-L189`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceManager.ts#L178-L189).
- **Evidencia y Solución Definitiva:**
  1. Adopción del protocolo en dos fases: `ensureLocalLevelExists` (capturando `E11000` esperado) seguido de actualización condicional con `upsert: false` y deduplicación por `appliedCreditIds`.
  2. Derivación determinista de `creditId = cont:${token}:${start}` para que los reintentos tras caídas o Lost ACKs reutilicen exactamente la misma clave de deduplicación.

---

### V04. Ausencia de Roles y Anuncios en Voz
- **Estado:** **Confirmado** | **Requiere decisión de producto**
- **Severidad:** **MEDIUM**
- **Archivos:** [`src/Features/leveling/voiceXp.ts#L95-L109`](file:///home/hanna/HannaeX/src/Features/leveling/voiceXp.ts#L95-L109).
- **Estado:** Diseño técnico listo; a la espera de definición de producto sobre roles compartidos vs. independientes y canal de anuncio.

---

### V05. Recuperación tras Reinicio y Corrección de Curva
- **Estado:** **Confirmado** | **Listo para implementar**
- **Severidad:** **HIGH**
- **Archivos:** [`src/Events/Client/handlers/voice/voiceManager.ts#L48-L53`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceManager.ts#L48-L53).
- **Evidencia y Solución Definitiva:**
  1. Distinción explícita de downtime mediante `lastShutdownAt`.
  2. Cero acreditación de downtime en caídas prolongadas (> 2 min).
  3. Restablecimiento de `originalStart = now` tras caídas largas para evitar penalizaciones injustas en la curva decreciente de XP.

---

### V06. Elegibilidad de Acompañantes en el Quórum
- **Estado:** **Confirmado parcialmente** | **Requiere decisión de producto**
- **Severidad:** **MEDIUM**
- **Archivos:** [`src/Events/Client/handlers/voice/voiceUtils.ts#L14-L24`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceUtils.ts#L14-L24).
- **Estado:** Exclusión técnica de ensordecidos lista (`!m.voice.selfDeaf && !m.voice.serverDeaf`); decisión pendiente sobre oyentes silenciados (`selfMute: true`).

---

### V07. Comportamiento Real del Índice TTL
- **Estado:** **Confirmado parcialmente** | **No requiere cambios**
- **Severidad:** **LOW**
- **Archivos:** [`src/Database/leveling/activeVoiceSession.model.ts#L23-L26`](file:///home/hanna/HannaeX/src/Database/leveling/activeVoiceSession.model.ts#L23-L26).
- **Conclusión:** El índice `{ start: 1, expireAfterSeconds: 86400 }` es correcto y no purga sesiones activas normales. Actúa como recolector de basura de sesiones abandonadas.

---

### V08. Persistencia, Timeouts y Concurrencia en MongoDB
- **Estado:** **Confirmado** | **Listo para implementar**
- **Severidad:** **HIGH**
- **Archivos:** [`src/Events/Client/handlers/voice/voiceUtils.ts#L44-L51`](file:///home/hanna/HannaeX/src/Events/Client/handlers/voice/voiceUtils.ts#L44-L51) y [`src/Services/mongo.ts#L27`](file:///home/hanna/HannaeX/src/Services/mongo.ts#L27).
- **Solución Definitiva:** Sustitución de `.catch(() => null)` por logging estructurado, adopción de `.maxTimeMS(3000)` en MongoDB y procesamiento en lotes de 3 miembros para no saturar el pool de conexiones.
