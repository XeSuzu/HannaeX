# Sistema Voice XP: Especificación y Diseño Final de Consistencia Absoluta

Este directorio contiene la especificación arquitectónica definitiva, análisis de persistencia, durabilidad determinista de créditos (`creditId`), resolución de liquidaciones discontinuas, eliminación de colisiones E11000 y plan de pruebas ampliado a 30 escenarios para el subsistema de **Voice XP** de **Hoshiko (HannaeX)**.

> [!IMPORTANT]
> **Alcance Estricto:** Esta revisión se limitó exclusivamente a la **auditoría analítica, diseño formal de resiliencia y especificación técnica**. No se implementó ningún cambio en el código fuente de `src/`, manteniendo intactos todos los archivos funcionales y de prueba de producción.

---

## 1. Resumen Ejecutivo de la Revisión Final de Consistencia

Esta última revisión técnica cerró de manera concluyente las cuatro incógnitas de frontera arquitectónica:

1. **V01 + V03 (Durabilidad Determinista de `creditId`):** Se eliminó la dependencia de UUIDs aleatorios en memoria. Cada `creditId` se deriva determinísticamente de campos durables ya persistidos en MongoDB (`token` y `start`), garantizando que tras caídas de red, Lost ACKs o reinicios del bot, los reintentos regeneran **exactamente el mismo identificador**, evitando duplicaciones.
2. **V01 + V03 (Liquidaciones Discontinuas):** Se demostró que sesiones fragmentadas (ej. 40s + 20s = 60s) no deben modelarse como intervalos temporales continuos ficticios. Se tratan como créditos discretos independientes con identificador propio (`disc:token:start:seq`).
3. **V03 (Eliminación del Conflicto E11000 en MongoDB):** Se identificó que ejecutar `findOneAndUpdate` con condiciones de idempotencia y `upsert: true` produce colisiones `E11000 duplicate key error`. Se diseñó el protocolo **Ensure-Document-Exists** (con captura controlada de E11000 en el índice `{ userId, guildId }`) seguido de la actualización condicional con `upsert: false`.
4. **V03 (Retención de Buffer y Secuencialidad):** Se demostró matemáticamente que en llamadas de voz los créditos son estrictamente secuenciales (el intervalo N+1 no puede generarse hasta confirmar el N). Un buffer circular de 100 elementos de voz cubre más de 8 horas de llamada continua, impidiendo la evicción prematura de identificadores en vuelo.
5. **V05 (Taxonomía de Downtime y Reseteo de Curva):** Se distinguió el tiempo comprobado, estimado y no verificable. Se implementó la medición con `lastShutdownAt` y se estableció que ante caídas largas (> 2 min), `originalStart` se restablece a `now`, evitando penalizaciones injustas en la curva decreciente de XP.

---

## 2. Clasificación Final de Aprobación

| ID | Componente / Hallazgo | Estado Técnico | Clasificación Final |
| :--- | :--- | :--- | :--- |
| **V01** | Continuidad de segundos y liquidaciones discontinuas | Confirmado | **Listo para implementar** |
| **V02** | Reset semanal unificado y atómico por pipeline | Confirmado | **Listo para implementar** |
| **V03** | Idempotencia determinista por `creditId` (sin E11000) | Confirmado | **Listo para implementar** |
| **V04** | Asignación de roles, embeds y levellog en voz | Confirmado | **Requiere decisión de producto** |
| **V05** | Rehidratación con medición de downtime y reseteo de curva | Confirmado | **Listo para implementar** |
| **V06** | Exclusión de acompañantes ensordecidos en quórum | Confirmado parcialmente | **Requiere decisión de producto** |
| **V07** | Política de expiración por índice TTL de 24h | Confirmado parcialmente | **No requiere cambios** |
| **V08** | Concurrencia acotada (lotes de 3) y `maxTimeMS(3000)` | Confirmado | **Listo para implementar** |

---

## 3. Índice de Documentación Técnica Actualizada

1. [`current-architecture.md`](./current-architecture.md): Arquitectura del subsistema, ciclo de apagado y modelos de persistencia.
2. [`event-flow.md`](./event-flow.md): Flujos de eventos, diagramas de transición y escenarios de ejecución paso a paso.
3. [`known-issues.md`](./known-issues.md): Catálogo exhaustivo de problemas, código fuente y análisis crítico.
4. [`investigation-report.md`](./investigation-report.md): Demostración matemática contra colisiones E11000, durabilidad de `creditId` y curva decreciente tras downtime.
5. [`proposed-improvements.md`](./proposed-improvements.md): Especificación técnica definitiva con derivación determinista de créditos, Ensure-Exists y pipeline atómico en MongoDB.
6. [`regression-test-plan.md`](./regression-test-plan.md): Matriz ampliada a 30 escenarios de prueba de regresión exhaustivos.

---

## 4. Preguntas de Producto Pendientes de Decisión Humana

1. **Roles de Nivel de Voz (`V04`):** ¿Los niveles de voz otorgan los mismos roles que el texto (`LevelConfig.levelRoles`) o una jerarquía independiente?
2. **Canal de Anuncios (`V04`):** ¿Las subidas de nivel de voz deben enviarse a `announceChannelId` (canal general de texto) o ser privadas/por DM?
3. **Acompañante Silenciado (`V06`):** ¿Un usuario silenciado (`selfMute: true`) pero no sordo debe contar como acompañante válido? (Recomendación técnica: Sí para silenciados, No para ensordecidos).
