# Informe Técnico de Investigación y Diseño Final: Voice XP (Consistencia Absoluta)

## 1. Verificación de Topología de Base de Datos y Transacciones

### 1.1. Topología Real de MongoDB en HannaeX
- **Producción y Staging:** Operan sobre MongoDB Atlas en un Replica Set de tres nodos (`mongodb+srv://...`).
- **Desarrollo Local y CI:** Comúnmente operan sobre instancias standalone de MongoDB sin réplica.
- **Limitación Oficial:** Las transacciones multi-documento (`session.startTransaction()`) arrojan `MongoServerError: Transaction numbers are only allowed on a replica set member or mongos` en entornos standalone.
- **Dictamen Arquitectónico:** El subsistema de Voice XP **no debe depender de transacciones multi-documento**. Toda la consistencia e idempotencia se garantiza mediante operaciones atómicas sobre documentos individuales (`LocalLevel`).

---

## 2. Análisis Crítico: Durabilidad de `creditId` y Retención en Buffer

### 2.1. Derivación Determinista de Identificadores
La generación de identificadores mediante UUIDs aleatorios volátiles en memoria falla ante caídas previas a la confirmación de red.

**Mecanismo Determinista:**
- Para intervalos continuos: `creditId = cont:${session.token}:${session.start.getTime()}`.
- Dado que `session.token` y `session.start` residen en MongoDB en `ActiveVoiceSession`, ante cualquier caída del proceso bot, el reinicio lee los mismos campos y regenera el **mismo `creditId` exacto**.
- Si MongoDB ejecutó la escritura pero el proceso perdió la respuesta (Lost ACK), el reintento porta el mismo identificador. MongoDB detecta que ya fue procesado y retorna `modifiedCount = 0` sin duplicar experiencia.

### 2.2. Demostración Matemática contra la Evicción Prematura en el Buffer
Se planteó la duda de si un crédito pendiente podría sufrir evicción si ocurren 50 créditos posteriores.
- **Demostración de Secuencialidad Estricta:**
  1. En llamadas de voz, los créditos son **estrictamente secuenciales por sesión**: el intervalo N+1 solo puede generarse después de que el intervalo N haya avanzado `session.start`.
  2. Es físicamente imposible tener 50 créditos de voz en vuelo simultáneos para un mismo usuario.
  3. Los mensajes de texto generan XP por su propio pipeline y **no insertan identificadores en `appliedCreditIds`** (este campo está reservado exclusivamente para la deduplicación de créditos de voz).
  4. Por tanto, un buffer de 100 elementos de voz cubre más de 8 horas de llamadas continuas (un crédito cada 5 min = 12 por hora), blindando el sistema contra cualquier reintento retardado por saturación de red.

---

## 3. Resolución Concurrente de `Ensure-Exists` y Conflicto E11000

### 3.1. Anatomía del Conflicto Concurrente de Inserción
Cuando dos eventos concurrentes (ej. mensaje de texto y cierre de voz) intentan inicializar simultáneamente un perfil inexistente en `LocalLevel`:
1. Ambos ejecutan `updateOne({ userId, guildId }, { $setOnInsert: defaults }, { upsert: true })`.
2. El primer hilo inserta el documento exitosamente.
3. El segundo hilo colisiona con el índice único `{ userId: 1, guildId: 1 }` y recibe `MongoServerError: E11000 duplicate key error`.

### 3.2. Criterio de Discriminación Seguro:
El bloque `catch` evalúa explícitamente:
```typescript
const isExpectedUniqueConflict =
  error?.code === 11000 &&
  (error?.keyPattern?.userId === 1 && error?.keyPattern?.guildId === 1 ||
   (typeof error?.message === "string" && error.message.includes("userId_1_guildId_1")));
```
- Si es verdadero: Confirma que el documento ya fue creado por el hilo concurrente y continúa normalmente hacia la Fase 2.
- Si es falso (otro índice o error de red/disco): Arroja la excepción inmediatamente.

---

## 4. Política de Downtime y Corrección de Curva tras Reinicios (V05)

### 4.1. Taxonomía Estricta del Tiempo
1. **Tiempo Comprobado:** Verificado activamente mediante eventos del Discord Gateway mientras el bot estuvo encendido.
2. **Tiempo Estimado:** Minutos entre el último checkpoint y el momento del shutdown planificado (`lastShutdownAt`). Solo se aplica si el downtime fue `<= 60 segundos`.
3. **Tiempo No Verificable (Downtime):** Tiempo en que el bot estuvo fuera de servicio. **Nunca se acredita**.

### 4.2. Protección de la Curva Decreciente (`originalStart`)
En [`src/Features/leveling/voiceXp.ts#L32-L38`](file:///home/hanna/HannaeX/src/Features/leveling/voiceXp.ts#L32-L38), la curva penaliza sesiones largas (reduciendo XP al 25% tras 5 horas y 10% tras 7 horas).
- Si el bot estuvo caído 6 horas y restaura el `originalStart` de hace 6 horas, el usuario sufre una penalización del 25% en una conversación que recién está empezando.
- **Regla Definitiva:** Ante caídas prolongadas (> 2 minutos), `originalStart` se restablece a `now`, garantizando que el usuario comience al 100% de rendimiento.
