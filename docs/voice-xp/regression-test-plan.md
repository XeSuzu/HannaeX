# Plan de Pruebas de Regresión Exhaustivo: Subsistema Voice XP (Revisión Final)

Este documento detalla la matriz integral de pruebas de regresión requerida para certificar el subsistema de Voice XP, ampliada con los 8 escenarios rigurosos de durabilidad de `creditId`, concurrencia en `Ensure-Exists`, conflicto E11000, recuperación tras reinicios y verificación de políticas de downtime.

---

## 1. Matriz de Cobertura de Escenarios de Prueba

| # | Escenario de Prueba | Hallazgo Asociado | Tipo de Prueba | Estado de Definición |
| :- | :--- | :--- | :--- | :--- |
| **01** | Sesión de 30 segundos (sub-minuto) | `V01` | Unitario | Completo |
| **02** | Sesión de 59 segundos (límite inferior) | `V01` | Unitario | Completo |
| **03** | Sesión de 60 segundos exactos | `V01` | Unitario | Completo |
| **04** | Sesión de 4 minutos y 59 segundos | `V01` | Unitario | Completo |
| **05** | Intervalos consecutivos de 5m con residuos | `V01` | Simulación temporal | Completo |
| **06** | Desconexión durante operación de XP pendiente | `V03` | Concurrencia asíncrona | Completo |
| **07** | Dos operaciones de cierre simultáneas | `V03` | Concurrencia / Idempotencia | Completo |
| **08** | Reinicio con usuario todavía conectado | `V05` | Unitario / Mock | Completo |
| **09** | Reinicio con usuario desconectado en downtime corto (< 1m) | `V05` | Integración / Mock | Completo |
| **10** | MongoDB no disponible durante persistencia inicial | `V08` | Aislamiento / Mock | Completo |
| **11** | Cambio de semana iniciado por XP de voz | `V02` | Integración DB | Completo |
| **12** | Cambio de semana iniciado por XP de texto | `V02` | Integración DB | Completo |
| **13** | Eventos simultáneos de texto y voz en cambio de semana | `V02` | Concurrencia real DB | Completo |
| **14** | Subida de nivel de voz (Level Up) | `V04` | Integración con Mocks | Completo |
| **15** | Usuario ensordecido durante una sesión activa | `V06` | Unitario | Completo |
| **16** | Sesión activa continua superior a 24 horas | `V07` | Simulación temporal | Completo |
| **17** | Fallo de MongoDB en intervalo y rollback de timestamp | `V03` / `V08` | Simulación de fallos | Completo |
| **18** | Sincronización de canal bajo timeout de MongoDB (30s) | `V08` | Estrés / Latencia | Completo |
| **19** | 10 eventos simultáneos de texto/voz en cambio de semana | `V02` | Concurrencia masiva DB | Completo |
| **20** | Acompañante ensordecido vs. acompañante silenciado | `V06` | Unitario de reglas | Completo |
| **21** | Reinicio tras caída prolongada (> 1 hora) con límite de gracia | `V05` | Integración temporal | Completo |
| **22** | Liquidación de 40s + 20s discontinuos con `creditId` | `V01` / `V03` | Integración de lógica | Completo |
| **23** | **NUEVO:** Error de MongoDB antes de persistir un crédito discontinuo | `V01` / `V08` | Simulación de fallos | Completo |
| **24** | **NUEVO:** Reinicio después de derivar `creditId`, pero antes de acreditar | `V03` / `V05` | Resiliencia tras crash | Completo |
| **25** | **NUEVO:** Pérdida de ACK después de confirmar liquidación (Lost ACK) | `V03` | Idempotencia DB | Completo |
| **26** | **NUEVO:** Reintento de un crédito tras 50 créditos posteriores | `V03` | Buffer / Retención | Completo |
| **27** | **NUEVO:** Dos operaciones concurrentes durante `Ensure-Exists` | `V03` | Concurrencia DB | Completo |
| **28** | **NUEVO:** Conflicto E11000 esperado durante la inicialización | `V03` | Manejo de excepciones | Completo |
| **29** | **NUEVO:** Recuperación determinista de créditos pendientes tras reinicio | `V03` / `V05` | Integración temporal | Completo |
| **30** | **NUEVO:** Rehidratación corta (< 60s) vs. larga (> 2m) y política de downtime | `V05` | Simulación temporal | Completo |

---

## 2. Detalle de los Nuevos Escenarios de Prueba

### Escenario 23: Error de MongoDB antes de persistir un crédito discontinuo
- **Objetivo:** Verificar que si la base de datos falla al consolidar un minuto residual, el remanente no se pierde de memoria ni se duplica.
- **Preparación:** `partialSeconds` acumula 40s. Una sesión aporta 25s (`total = 65s`, 1 minuto acreditable, 5s remanente).
- **Acción:** `LocalLevel.updateOne` rechaza con `MongoNetworkTimeoutError`.
- **Resultado Esperado:** El bloque `catch` restaura el estado previo en `partialSeconds` (remanente de 65s retenido para reintento). Cero pérdida de tiempo.
- **Tipo de Prueba:** Simulación de fallos de red.

---

### Escenario 24: Reinicio después de derivar `creditId`, pero antes de acreditar
- **Objetivo:** Demostrar que un crash del proceso previo a la escritura de red no corrompe la sesión persistida.
- **Preparación:** Intervalo de 5m deriva `creditId = cont:token-1:300000`. El proceso muere antes de invocar a MongoDB.
- **Acción:** El bot reinicia y ejecuta `rehydrateVoiceSessions()`.
- **Resultado Esperado:** Al no haberse modificado `ActiveVoiceSession`, la sesión se restaura desde su último checkpoint y genera exactamente el mismo `creditId` determinista al procesar el intervalo. Cero duplicación y cero pérdida.
- **Tipo de Prueba:** Resiliencia tras caída de proceso.

---

### Escenario 25: Pérdida de ACK después de confirmar liquidación (Lost ACK)
- **Objetivo:** Demostrar que un reintento idéntico tras una pérdida de confirmación de red no duplica la experiencia.
- **Preparación:** Documento con `voiceMinutes = 10`. Se envía `creditId = cont:tok:1`. MongoDB ejecuta la escritura (`voiceMinutes = 15`), pero el socket TCP se interrumpe antes de que Node.js reciba la respuesta.
- **Acción:** El bot reintenta la misma llamada con `creditId = cont:tok:1`.
- **Resultado Esperado:** MongoDB evalúa `"appliedCreditIds.id": { $ne: "cont:tok:1" }`, que resulta falsa; retorna `modifiedCount = 0`. `voiceMinutes` permanece estrictamente en 15.
- **Tipo de Prueba:** Idempotencia en MongoDB.

---

### Escenario 26: Reintento de un crédito tras 50 créditos posteriores
- **Objetivo:** Verificar que la secuencialidad estricta de las sesiones de voz y el buffer de 100 elementos impiden la evicción prematura de un crédito legítimo.
- **Preparación:** Se registran 50 créditos sucesivos en una sesión activa.
- **Acción:** Intentar reinyectar el crédito número 1.
- **Resultado Esperado:** Como el buffer circular retiene 100 elementos, el crédito número 1 continúa presente en `appliedCreditIds` y es rechazado con `modifiedCount = 0`.
- **Tipo de Prueba:** Prueba de retención y límites de buffer.

---

### Escenario 27: Dos operaciones concurrentes durante `Ensure-Exists`
- **Objetivo:** Comprobar la resiliencia de inicialización cuando dos eventos llegan en el mismo milisegundo para un usuario nuevo.
- **Preparación:** No existe documento para `userId = "u_new"`, `guildId = "g_new"`.
- **Acción:** Disparar simultáneamente `Promise.all([ensureLocalLevelExists(...), ensureLocalLevelExists(...)])`.
- **Resultado Esperado:** Ambas promesas resuelven con éxito (`Promise.all` no arroja error). Exactamente un documento es insertado.
- **Tipo de Prueba:** Concurrencia real sobre base de datos.

---

### Escenario 28: Conflicto E11000 esperado durante la inicialización
- **Objetivo:** Verificar que el bloque `catch` de `ensureLocalLevelExists` solo suprime el error E11000 del índice `{ userId: 1, guildId: 1 }` y propaga cualquier otro error.
- **Preparación:** Mock de `updateOne` configurado para arrojar `E11000` con `keyPattern: { userId: 1, guildId: 1 }`.
- **Acción:** Invocar `ensureLocalLevelExists(...)`.
- **Resultado Esperado:** La función retorna limpiamente (`void`) sin arrojar excepciones. (Si se simula un error de red o de otro índice, la función arroja el error).
- **Tipo de Prueba:** Unitario de manejo de excepciones.

---

### Escenario 29: Recuperación determinista de créditos pendientes tras reinicio
- **Objetivo:** Comprobar que tras un reinicio, el identificador derivado para un checkpoint pendiente coincide exactamente con el derivado antes del reinicio.
- **Preparación:** Sesión persistida con `s.token = "uuid-persistido"`, `s.start = 1700000000000`.
- **Acción:** Derivar `creditId` antes y después de `rehydrateVoiceSessions()`.
- **Resultado Esperado:** Ambos identificadores son estrictamente idénticos (`cont:uuid-persistido:1700000000000`).
- **Tipo de Prueba:** Unitario de derivación determinista.

---

### Escenario 30: Rehidratación corta (< 60s) vs. larga (> 2m) y política de downtime
- **Objetivo:** Validar la distinción entre reinicio rápido planificado y caída prolongada con reseteo de curva decreciente.
- **Preparación:**
  - Caso A: `lastShutdownAt` registrado hace 40 segundos. Usuario presente.
  - Caso B: `lastShutdownAt` registrado hace 3 horas (o ausente). Usuario presente.
- **Acción:** Ejecutar `rehydrateVoiceSessions()`.
- **Resultado Esperado:**
  - En Caso A: Sesión restaurada con `start = s.start` y `originalStart = s.originalStart` (continuidad legítima de deploy).
  - En Caso B: Cero downtime acreditado; sesión reanudada con `start = now` y **`originalStart = now`** (curva decreciente reiniciada al 100% de XP).
- **Tipo de Prueba:** Simulación temporal de reinicio.
