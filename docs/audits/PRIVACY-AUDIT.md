# Informe de Auditoría y Corrección de Cumplimiento Legal y Técnico — Hoshiko

**Título:** Informe Integral de Auditoría y Remediación de Privacidad y Cumplimiento Legal  
**Identificador de Versión:** `HOSHIKO-AUDIT-2026-11-09`  
**Fecha:** 9 de noviembre de 2026  
**Alcance:** `apps/hoshiko` (Bot Principal Hoshiko). *Nota: Hoshiko Security es un proyecto independiente desacoplado en fase de desarrollo y no forma parte del producto operativo auditado.*  
**Equipo Auditor Especializado:**
- **Software Architect & Senior Developer:** Remediación técnica, fail-closed, decoupling y ciclo de vida de datos.
- **Security Auditor:** Análisis de riesgos criptográficos, validación de entropía y llaves AES-256-GCM.
- **Privacy Engineer:** Contraste de inventario de datos, índices TTL, minimización y gobernanza.
- **Legal Compliance Researcher:** Evaluación de normativas de Discord, Google Gemini API y LOPDP (Ecuador).
- **QA Engineer:** Ejecución de suites de regresión y verificación de aserciones.

---

## 1. Resumen Ejecutivo

Se auditó de forma exhaustiva la arquitectura y el comportamiento del código de Hoshiko frente a sus compromisos públicos y regulatorios. Se identificaron y subsanaron cinco discrepancias críticas y de alto impacto:

1. **Cifrado AES-256-GCM Fail-Closed:** Se eliminó la ruta de degradación (*fail-open*) que permitía persistir o devolver texto plano ante ausencia o fallo de clave. Se implementó validación estricta de 32 bytes y detención controlada (*fail-closed*) en inicio.
2. **Memoria Personal y Retención Granular:** Se suprimió el índice TTL a nivel de documento que amenazaba con destruir recuerdos explícitos y preferencias de usuario tras 90 días de inactividad. Se desacopló la retención: los recuerdos explícitos son permanentes y los auto-extraídos expiran a los 90 días mediante rutinas automatizadas.
3. **Compatibilidad con Google Gemini API y Usuarios Menores:** Se auditaron las condiciones de Gemini API (actualizadas al 28 de abril de 2026), verificando la prohibición categórica de aplicaciones dirigidas o probablemente accesibles por menores de 18 años. Se eliminó la afirmación errónea de que una autorización parental subsana dicha limitación y se establecieron restricciones técnicas para canales no clasificados como adultos.
4. **Purga Automatizada al Retirar el Bot (`guildDelete`):** Se implementó el listener `guildDelete.ts` para eliminar de forma inmediata e irreversible todos los datos acotados al servidor tras su expulsión o retiro, cumpliendo estrictamente la Sección 4 de la *Discord Developer Policy*.
5. **Historial de Perfiles, Avatares y Presencia:** Se redujo la retención de presencia a un TTL estricto de 24 horas y se implementó el gestor `TrackingOptOutManager` junto con el comando soberano `/privacy`, dotando a los usuarios de controles de oposición (*opt-out*) y supresión inmediata.

---

## 2. Modificaciones Técnicas por Componente

### A. Cifrado de Campos (`apps/hoshiko/src/Security/Encryption/FieldEncryptionService.ts`)
- **Validación Estricta:** Implementación de `FieldEncryptionService.validateOrThrow()`. Se exige una clave de exactamente 32 bytes (64 caracteres hexadecimales o 32 bytes UTF-8).
- **Comportamiento Fail-Closed:**
  - `encrypt(plaintext)`: Lanza una excepción inmediata si la clave es nula o inválida, o si la operación de cifrado arroja un error. Prohibición terminante de retornar texto plano como mecanismo de degradación.
  - `decrypt(cipherOrPlain)`: Valida la estructura `enc:v1:<iv>:<tag>:<ciphertext>` y verifica la integridad criptográfica mediante `decipher.setAuthTag(authTag)`. Si se detecta alteración en los datos o en el tag, retorna `"[Dato cifrado no recuperable]"` sin filtrar secretos.
- **Inicio Seguro:** Integrado en `apps/hoshiko/src/index.ts` para verificar la disponibilidad de la clave en producción antes de conectar con bases de datos.

### B. Memoria Personal y Retención (`personalMemory.model.ts` y `PersonalMemoryService.ts`)
- **Supresión de TTL Destructivo:** Eliminación del índice TTL parcial a nivel de documento `{ lastInteraction: 1, expireAfterSeconds: 7776000 }` en `personalMemory.model.ts`, evitando el borrado accidental de recuerdos manuales y configuraciones de preferencias.
- **Retención Granular de Hechos:**
  - Hechos con `source: "explicit"` o `"legacy_migrated_confirmed"` permanecen de forma indefinida hasta supresión voluntaria.
  - Hechos con `source: "auto_extracted"` cuentan con una ventana estricta de 90 días (`AUTO_EXTRACTED_TTL_MS = 7776000000ms`).
  - Implementación de `purgeExpiredAutoExtractedFacts()` utilizando operaciones atómicas `$pull` en MongoDB, enlazada a la tarea cron diaria de las 03:00 AM (`apps/hoshiko/src/scripts/cronJobs.ts`).
  - Filtrado reactivo en lectura dentro de `getFacts()` y `getMemory()`.

### C. Eliminación de Datos al Retirar el Bot (`apps/hoshiko/src/Events/Client/Guilds/guildDelete.ts`)
- **Implementación del Listener `Events.GuildDelete`:**
  - Comprobación de disponibilidad (`guild.available === false` ignora caídas temporales de Discord para evitar borrados erróneos).
  - Purga automática e irreversible de colecciones dependientes del `guildId`: `ServerConfig`, `StatusConfig`, `LevelConfig`, `LocalLevel`, `ActiveVoiceSession`, `ServerEntityMemory`, `Conversation`, `UserMemory`, `AiTester`, `AvatarHistory`, `PresenceHistory`, `CaseModel`, `GuildSequenceModel`, `Snipe`, `Warning`, `Confession`, `Suggestion` y `Couple`.
  - Invalidación de memoria caché (`CacheManager.delete`, `LevelConfigCache.invalidate`).
  - Preservación íntegra de identificadores globales y memorias personales de usuario.

### D. Gobernanza de Seguimiento de Perfiles y Presencia (`userTracking.models.ts`, managers y `/privacy`)
- **Índice TTL en Presencia:** Adición de `{ updatedAt: 1 }, { expireAfterSeconds: 86400 }` a `PresenceHistorySchema` para garantizar que el estado de actividad no se almacene más de 24 horas.
- **Gestión de Oposición y Borrado (`TrackingOptOutManager.ts`):**
  - Chequeo de opt-out en `AvatarHistoryManager`, `UserHistoryManager` y `PresenceHistoryManager`.
  - Creación del comando `/privacy` con subcomandos:
    - `/privacy estado`: Diagnóstico de datos almacenados y estado de oposición.
    - `/privacy ajustes seguimiento:optout`: Activa la oposición para no registrar avatares, nombres ni actividad.
    - `/privacy borrar`: Ejecución inmediata del derecho de supresión sobre datos de seguimiento, memoria personal o ambos.

---

## 3. Evaluación Jurídica y de Cumplimiento

### 3.1. Discord Developer Terms of Service & Policy
- **Sección 4 (Data and Privacy):** Cumplimiento total mediante la implementación de `guildDelete.ts`. Los datos asociados al servidor no se retienen indebidamente tras la desinstalación de la aplicación.
- **Minimización de Datos:** Los registros de presencia (Gateway Intent `GuildPresences`) ahora se purgan de manera estricta a las 24 horas y los usuarios disponen de un mecanismo directo de exclusión voluntaria.

### 3.2. Google Gemini API Additional Terms of Service (Actualización de 28 de abril de 2026)
- **Restricción Categórica de Edad:**
  - Cláusula analizada: *«You must be 18 years of age or older to use the APIs. You also will not use the Services as part of a website, application, or other service (collectively, "API Clients") that is directed towards or is likely to be accessed by individuals under the age of 18.»*
  - **Incompatibilidad Identificada:** La presencia de usuarios de 13 a 17 años en Discord impide categorizar un bot de chat libre y abierto en canales generales como un servicio que no sea "likely to be accessed by individuals under the age of 18". Las condiciones de Google no contemplan el consentimiento parental como excepción a esta prohibición para clientes de API.
  - **Medida Adoptada:** Se corrigieron los documentos públicos para eliminar afirmaciones sobre excepciones parentales respecto a Google. Se establecieron salvaguardas técnicas para que la interacción generativa con Gemini requiera canales clasificados como adultos (18+/NSFW) o entornos bajo supervisión y autorización administrativa verificada.

### 3.3. Legislación Ecuatoriana (LOPDP)
- **Artículos 7 y 8 (Bases de Legitimación):** Separación transparente entre la ejecución de comandos solicitados, el interés legítimo en seguridad/moderación y las funciones de personalización.
- **Artículos 15 y 16 (Derecho de Eliminación y Oposición):** El usuario cuenta ahora con herramientas de autoservicio (`/privacy borrar`, `/privacy ajustes seguimiento:optout`, `/memory borrar`) para ejercer sus derechos sin necesidad de intermediación técnica obligatoria.
- **Artículo 18 (Excepción de Moderación):** Se mantiene justificada legalmente la conservación de casos disciplinarios para prevenir la evasión de sanciones comunitarias mientras resulten necesarios.

---

## 4. Estado de la Documentación Pública e Interna

Se sincronizaron y versionaron los siguientes instrumentos normativos:
- `licenses/public/TERMS_OF_SERVICE.md` (`v2.2.0`): Actualizado con fail-closed, purga automática en salida, delimitación con Hoshiko Security y requisitos de edad de Gemini API.
- `licenses/public/PRIVACY_POLICY.md` (`v2.2.0`): Reflejo fiel de la retención granular (90 días para auto-extraídos, indefinido para manuales), TTL de 24h en presencia, controles en `/privacy` y purga automatizada en `guildDelete`.
- `licenses/hoshiko/02-Privacy-Policy.md` (`v3.2.0`): Dossier interno ajustado en terminología (personalización en lugar de entrenamiento) y bases jurídicas.
- `licenses/hoshiko/04-Data-Retention-and-Deletion.md` (`v3.2.0`): Inventario técnico de TTLs y procedimientos de eliminación corregido con la nueva implementación.
- `licenses/hoshiko/DATA-INVENTORY.md`: Actualización de fichas DAT-13 y DAT-19 con los nuevos plazos y comandos.
- `licenses/hoshiko/LEGAL-REVIEW.md`: Matriz de afirmaciones actualizada reflejando la transición de `guildDelete` y opt-out a estado verificado.

---

## 5. Pruebas y Evidencia Técnica de Verificación

Se ejecutaron pruebas automatizadas mediante el runner nativo de Node.js (`node --test`), superando satisfactoriamente todas las aserciones:

1. **`tests/unit/ai-field-encryption.test.cjs` (4/4 PASS):**
   - Cifrado y descifrado AES-256-GCM verificado con etiquetas de autenticación.
   - Retrocompatibilidad con datos legados en texto plano preservada.
   - Protección contra manipulación de datos (alteración de AuthTag detectada).
   - Comportamiento estricto fail-closed: excepciones ante claves ausentes o de longitud incorrecta.
2. **`tests/unit/ai-phase1-personal-memory.test.cjs` (7/7 PASS):**
   - Retención diferenciada comprobada: exclusión de recuerdos auto-extraídos de más de 90 días.
   - Preservación permanente de recuerdos explícitos introducidos por el usuario.
   - Zero-Knowledge Logging: confirmación de que no se imprime contenido privado en bitácoras de auditoría.
   - Rechazo de datos sensibles (números de tarjeta con o sin guiones, credenciales, diagnósticos médicos).
3. **Compilación de TypeScript (`npm run build:hoshiko`):**
   - Compilación limpia sin errores de tipos en todos los módulos modificados.

---

## 6. Recomendaciones Operativas

1. **Monitoreo de Claves de Cifrado:** Asegurar que `DATABASE_ENCRYPTION_KEY` esté debidamente aprovisionada en las variables de entorno de producción con exactamente 64 caracteres hexadecimales antes de cualquier despliegue futuro.
2. **Despliegue de Comandos Slash:** Cuando se realice la próxima ventana de mantenimiento autorizada, ejecutar `deploy-commands.js` para propagar el nuevo comando `/privacy` a los servidores.
3. **Evolución del Backend de IA:** Para permitir interacciones conversacionales generales fuera de canales restringidos a mayores de 18 años, evaluar la transición futura hacia un modelo de IA auto-hospedado (vLLM / Llama 3) o una suscripción corporativa enterprise que no traslade restricciones de edad de consumidor sobre los usuarios finales.
