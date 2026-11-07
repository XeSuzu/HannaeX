# Auditoría Independiente de Integridad y Comportamiento — Hoshiko Moderation

**Fecha de ejecución:** 2026-11-05  
**Entorno de ejecución:** Monorepo HannaeX (`apps/hoshiko`)  
**Metodología:** Flujo Multiagente Profesional Antigravity (`architect`, `security-auditor`, `developer`, `code-reviewer`, `qa-engineer`)  
**Evaluación Final de Preparación Operativa:** **`APPROVED`** (Aprobado para Operación en Producción)

---

## 1. Resumen Ejecutivo

Se ha llevado a cabo una auditoría técnica profunda, independiente y no complaciente del sistema de moderación convencional de Hoshiko (`apps/hoshiko`), contrastando las afirmaciones previas contra la implementación real y sometiendo el código a pruebas de estrés, concurrencia, jerarquías de Discord, degradación de red y vectores de evasión.

El informe previo aseguraba una suite de 198/198 tests aprobados y estabilidad total. Sin embargo, el análisis estático y dinámico inicial reveló **14 defectos demostrables** (clasificados entre Críticos, Altos, Medios y de Calidad de Pruebas), los cuales permanecían invisibles debido a que los mocks de prueba anteriores operaban en secuencias síncronas ideales sin simular concurrencia, colisiones `E11000` de MongoDB ni fallos transitorios en el Gateway de Discord.

A través de un ciclo de desarrollo riguroso en 3 lotes incrementales, cada defecto fue demostrado, corregido bajo la filosofía Ponytail (mínimo cambio efectivo sin sobre-ingeniería), revisado independientemente por [`code-reviewer`](file:///home/hanna/HannaeX/.agents/agents/code-reviewer.md) y validado con pruebas unitarias reales y aisladas por [`qa-engineer`](file:///home/hanna/HannaeX/.agents/agents/qa-engineer.md). La suite global creció a **216 pruebas unitarias (100% aprobadas, 0 fallos)**, el build compila limpiamente y el tipado estricto de TypeScript reporta 0 errores.

---

## 2. Estado Inicial Verificado (Desmintiendo Conclusiones Previas)

| Afirmación de la Fase Previa | Realidad Técnica Comprobada en Auditoría | Veredicto |
| :--- | :--- | :---: |
| *"La numeración de `CaseModel` es secuencial y libre de carreras"* | `findOne().sort({caseId: -1})` + `caseId + 1` colisionaba bajo peticiones concurrentes (`Promise.all`), arrojando `E11000 duplicate key` sobre `{guildId: 1, caseId: 1}` y descartando silenciosamente la auditoría. | **FALSO / DESMENTIDO** |
| *"La jerarquía de roles está totalmente blindada en moderación"* | Un error transitorio de red o socket timeout en `members.fetch` era capturado genéricamente y asumido como "usuario no presente en el servidor", permitiendo el baneo indiscriminado de Administradores y Staff. | **FALSO / DESMENTIDO** |
| *"El comando `unmute` valida jerarquía adecuadamente"* | Tanto `/unmute` como el botón `modlog_act:unmute` omitían por completo la función `canModerateTarget`, permitiendo a moderadores júnior levantar silencios impuestos por el Dueño del servidor. | **FALSO / DESMENTIDO** |
| *"El botón Falso Positivo (`forgive`) es seguro"* | `forgive` retransmitía el payload malicioso original sin escapar a canales públicos (convirtiéndose en vector de phishing) e inscribía al atacante de forma permanente en `whitelistedUsers`. | **FALSO / DESMENTIDO** |
| *"Las pruebas garantizan la estabilidad del sistema"* | Los tests unitarios no evaluaban concurrencia real, colisiones de base de datos ni caídas transitorias de API, otorgando una falsa sensación de seguridad. | **FALSO / DESMENTIDO** |

---

## 3. Matriz de Hallazgos

| ID | Área | Archivo | Hallazgo | Gravedad | Estado Final |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **AUD-01** | Persistencia | [`case.model.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts) | Condición de carrera en `createCase`: colisiones `E11000` bajo concurrencia por lectura no atómica. | **CRÍTICA** | **CORREGIDO** |
| **AUD-02** | Jerarquía / Permisos | [`mass-ban.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/mass-ban.ts) / [`components.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/handlers/components.ts) | Evasión de jerarquía por fallo transitorio en `members.fetch`: asume usuario fuera del servidor ante timeouts o 500s. | **CRÍTICA** | **CORREGIDO** |
| **AUD-03** | Seguridad de Contenido | [`components.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/handlers/components.ts) | Botón `forgive` retransmite contenido malicioso sin escapar a canales públicos y añade permanentemente a `whitelistedUsers`. | **CRÍTICA** | **CORREGIDO** |
| **AUD-04** | TempModeration | [`TempModerationService.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Services/TempModerationService.ts) | Desbaneo/desmuteo accidental por condición de carrera al renovar o extender sanciones durante la ejecución del cron. | **CRÍTICA** | **CORREGIDO** |
| **AUD-05** | Trazabilidad | [`case.model.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts) | Pérdida silenciosa de auditoría si MongoDB fallaba tras ejecutar la acción disciplinaria en Discord. | **CRÍTICA** | **CORREGIDO** |
| **AUD-06** | Jerarquía / Permisos | [`unmute.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/unmute.ts) / [`components.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/handlers/components.ts) | Omisión total de `canModerateTarget` en `/unmute` y `modlog_act:unmute`, permitiendo anular silencios a superiores. | **ALTA** | **CORREGIDO** |
| **AUD-07** | Concurrencia | [`components.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/handlers/components.ts) | Ausencia de bloqueo de interacción en botones: doble clic o clic simultáneo de dos moderadores duplicaba acciones y casos. | **ALTA** | **CORREGIDO** |
| **AUD-08** | Seguridad de Acceso | [`components.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/handlers/components.ts) | Purga ciega sin validar permisos: moderador sin acceso al canal infractor podía purgarlo desde los logs públicos. | **ALTA** | **CORREGIDO** |
| **AUD-09** | Filtro de Palabras | [`wordFilter.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/automod/wordFilter.ts) | Evasión de filtros mediante Unicode invisible y Hangul Fillers (`\u3164`, `\u115F`), y falsos positivos en palabras con guiones. | **MEDIA** | **CORREGIDO** |
| **AUD-10** | Filtro de Enlaces | [`linkProtector.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/linkProtector.ts) | Evasión de dominios phishing mediante subdominios arbitrarios (`login.steamcomminuty.com`) por comprobación estricta de host. | **MEDIA** | **CORREGIDO** |
| **AUD-11** | Concurrencia Spam | [`automodState.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/automod/automodState.ts) | Ráfaga masiva de spam (10 msgs en 100ms) disparaba múltiples eliminaciones y avisos duplicados por pausa asíncrona. | **MEDIA** | **CORREGIDO** |
| **AUD-12** | Seguridad de Logs | [`LocalStorage.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Security/Logger/LocalStorage.ts) | Fuga potencial de credenciales (tokens de Discord, API keys, Webhooks) en metadatos serializados a `logs/*.jsonl`. | **MEDIA** | **CORREGIDO** |
| **AUD-13** | UX / Discord API | [`cases.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/cases.ts) | Desbordamiento de descripción en `/cases` (>4096 caracteres) arrojando `DiscordAPIError[50035]`. | **BAJA** | **CORREGIDO** |
| **AUD-14** | Calidad de Pruebas | [`tests/unit/`](file:///home/hanna/HannaeX/tests/unit/) | Tests anteriores utilizaban mocks secuenciales ciegos que enmascaraban colisiones y condiciones de carrera. | **ALTA** | **CORREGIDO** |

---

## 4. Vulnerabilidades Confirmadas y Corregidas

1. **Bypass de Jerarquía por Fallo de Gateway (AUD-02):**
   - *Vulnerabilidad:* Un moderador malicioso o un comando `/mass-ban` disparado durante inestabilidad del Gateway de Discord causaba que `guild.members.fetch()` arrojara timeout o error 500. El código asumía que el usuario "no estaba en el servidor" y procedía a solicitar a la API de Discord el baneo directo del ID, eludiendo `canModerateTarget` y permitiendo expulsar administradores.
   - *Mitigación:* Se implementó discriminación estricta: únicamente el código `10007 (Unknown Member)` permite proceder con el baneo externo; cualquier otro código suspende el baneo y reporta fallo de comprobación.

2. **Vector de Inyección de Malware y Backdoor Permanente en `forgive` (AUD-03):**
   - *Vulnerabilidad:* Al pulsar el botón "Falso Positivo", el bot reenviaba el contenido íntegro y sin sanitizar del mensaje borrado al canal original con menciones activas. Además, añadía al usuario a `serverConfig.whitelistedUsers`, eximiéndolo indefinidamente de cualquier control de AutoMod.
   - *Mitigación:* Se reemplazó la persistencia en `whitelistedUsers` por una marca de seguridad en memoria temporal (`markUserSafe` por 2 horas), se neutralizan enlaces (`[enlace neutralizado]`) y se inhabilitan menciones (`allowedMentions: { parse: [] }`).

3. **Evasión de Jerarquía en Desmuteo (AUD-06):**
   - *Vulnerabilidad:* Un moderador de rango inferior podía utilizar `/unmute` o el botón interactivo para levantar el silencio aplicado por un administrador superior o por el Dueño.
   - *Mitigación:* Se incluyó `canModerateTarget` y validación de `target.moderatable` antes de invocar `target.timeout(null)`.

4. **Purga Remota No Autorizada de Canales Ocultos (AUD-08):**
   - *Vulnerabilidad:* Si un usuario era sancionado en un canal privado (al que el moderador en turno no tenía acceso), el moderador podía pulsar "Purgar Msgs" desde el canal público `#mod-logs` y borrar hasta 50 mensajes de dicho canal confidencial.
   - *Mitigación:* Se valida que el moderador posea explícitamente `ViewChannel` y `ManageMessages` en el canal destino de la infracción antes de autorizar la purga.

---

## 5. Problemas Funcionales Confirmados y Corregidos

1. **Colisión de Identificadores y Corrupción de Casos (AUD-01):**
   - Bajo tráfico simultáneo o sanciones concurrentes por AutoMod, la consulta tradicional `lastCase.caseId + 1` generaba el mismo ID para dos casos, abortando la persistencia con `E11000 duplicate key error`.
   - *Solución:* Implementación del sub-modelo atómico [`GuildSequenceModel`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts) con `$inc: { seq: 1 }` nativo de MongoDB, inicialización fluida y bucle de reintento con backoff y resincronización automática.

2. **Desbaneo Accidental de Sanciones Renovadas en TempModeration (AUD-04):**
   - Si un usuario suspendido temporalmente era renovado o sancionado permanentemente en base de datos mientras el cron ejecutaba su ciclo, el cron llamaba a `guild.bans.remove()` basándose en su copia en memoria y luego eliminaba el registro nuevo con `record.deleteOne()`.
   - *Solución:* Eliminación condicional atómica previa con `TempModeration.findOneAndDelete({ _id: record._id, expiresAt: record.expiresAt, status: "pending" })`. Si devuelve `null`, la revocación en Discord se aborta.

3. **Duplicación por Doble Clic en Componentes (AUD-07):**
   - Dos clics rápidos generaban dos casos disciplinarios y dos mensajes duplicados en los canales de logs.
   - *Solución:* Implementación de bloqueo de concurrencia en memoria con `LocalCacheService` bajo la clave `lock:btn:${guildId}:${action}:${targetId}` (TTL 10s).

4. **Desbordamiento de Embeds en `/cases` (AUD-13):**
   - Al listar 25 casos con razones extensas, la descripción excedía los 4096 caracteres permitidos por la API de Discord, arrojando error 50035.
   - *Solución:* Truncado dinámico seguro a 4000 caracteres con indicador explicativo `"... y X casos más"`.

---

## 6. Correcciones Realizadas (Archivo por Archivo)

- [`apps/hoshiko/src/Database/moderation/case.model.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts):
  - Creación del sub-esquema y modelo `GuildSequenceModel` indexado por `{ guildId: 1, name: 1 }` único.
  - Implementación de [`getNextCaseId`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts#L82) con `$inc: { seq: 1 }` atómico y migración transparente de numeración existente.
  - Envoltura de [`createCase`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts#L121) con reintentos progresivos ante colisiones `E11000` y emisión de logs estructurados `AUDIT_CASE_PERSISTENCE` sin silenciar errores.
  - Ordenamiento determinista `{ createdAt: -1, caseId: -1 }` en [`getCasesByUser`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts#L195) y [`getRecentCases`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts#L213).
- [`apps/hoshiko/src/Commands/SlashCmds/Moderation/cases.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/cases.ts):
  - Truncamiento preventivo en descripción de Embed a 4000 caracteres para evitar `BASE_TYPE_MAX_LENGTH`.
- [`apps/hoshiko/src/Commands/SlashCmds/Moderation/mass-ban.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/mass-ban.ts):
  - Captura granular en `members.fetch`: solo se autoriza ban externo si `fetchErr.code === 10007`. Todo fallo transitorio aborta el baneo para ese ID.
- [`apps/hoshiko/src/Commands/SlashCmds/Moderation/unmute.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/unmute.ts):
  - Incorporación de `canModerateTarget` y `target.moderatable` antes de invocar `target.timeout(null)`.
- [`apps/hoshiko/src/Events/Client/handlers/components.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/handlers/components.ts):
  - Mutex de memoria con `LocalCacheService` en botones (`lock:btn:${guildId}:${action}:${targetId}`).
  - Control de jerarquía y error 10007 en `modlog_act:ban`.
  - Validación de jerarquía estricta en `modlog_act:unmute`.
  - Validación de permisos `ViewChannel` y `ManageMessages` en canal origen para `modlog_act:purge`.
  - Neutralización de URLs, límites de longitud y supresión de menciones en `modlog_act:forgive`, sustituyendo la whitelist permanente por marca en memoria temporal.
- [`apps/hoshiko/src/Services/TempModerationService.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Services/TempModerationService.ts):
  - Eliminación condicional atómica previa (`findOneAndDelete({ _id, expiresAt, status: "pending" })`).
  - Aislamiento de excepciones por registro dentro del bucle del cron de vencimientos.
- [`apps/hoshiko/src/Features/automod/wordFilter.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/automod/wordFilter.ts):
  - Eliminación de invisibles Unicode, Hangul Fillers y caracteres bidi en `normalizeText`.
  - Preservación de límites en palabras compuestas con guiones normales.
- [`apps/hoshiko/src/Features/linkProtector.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/linkProtector.ts):
  - Detección recursiva de subdominios maliciosos basada en dominios padre.
- [`apps/hoshiko/src/Features/automod/automodState.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/automod/automodState.ts):
  - Control de ráfagas concurrentes con `isSpamActionInProgress` para evitar acciones duplicadas.
- [`apps/hoshiko/src/Security/Logger/LocalStorage.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Security/Logger/LocalStorage.ts):
  - Función recursiva `sanitizeSecrets` para ofuscar tokens de Discord, Webhooks y API keys en disco.

---

## 7. Pruebas Añadidas

Se añadieron **18 pruebas unitarias reales y aisladas**, distribuidas en 3 archivos independientes:

1. **[`tests/unit/audit-lote-a.test.cjs`](file:///home/hanna/HannaeX/tests/unit/audit-lote-a.test.cjs) (6 pruebas):**
   - Concurrencia masiva: 10 llamadas paralelas (`Promise.all`) a `createCase` generan IDs correlativos únicos `[1..10]` sin colisión.
   - Inicialización de secuencia a partir del `caseId` más alto registrado.
   - Reintento y resincronización ante error `E11000`.
   - Registro estructurado `AUDIT_CASE_PERSISTENCE` y propagación de error tras agotar reintentos.
   - Truncado seguro a 4000 caracteres en `/cases`.
   - Orden determinista `{ createdAt: -1, caseId: -1 }`.

2. **[`tests/unit/audit-lote-b.test.cjs`](file:///home/hanna/HannaeX/tests/unit/audit-lote-b.test.cjs) (7 pruebas):**
   - Discriminación en `mass-ban` entre código `10007` y error transitorio de red `500`.
   - Aborto seguro en `modlog_act:ban` ante fallos de Gateway.
   - Neutralización de enlaces y ausencia de backdoor permanente en `modlog_act:forgive`.
   - Bloqueo de jerarquía en `/unmute` sobre superiores.
   - Bloqueo de jerarquía en botón `modlog_act:unmute`.
   - Bloqueo de concurrencia y doble clic en componentes.
   - Rechazo de `modlog_act:purge` si el moderador no tiene permisos en el canal destino.

3. **[`tests/unit/audit-lote-c.test.cjs`](file:///home/hanna/HannaeX/tests/unit/audit-lote-c.test.cjs) (5 pruebas):**
   - Eliminación condicional en `TempModerationService`: aborta si la sanción fue extendida o modificada.
   - Purga de caracteres invisibles y Hangul Fillers en `wordFilter`.
   - Detección de subdominios maliciosos en `linkProtector`.
   - Prevención de acciones duplicadas ante ráfagas concurrentes de spam en `automodState`.
   - Sanitización recursiva de secretos en `LocalStorage`.

---

## 8. Resultados de Todas las Verificaciones

| Validación | Comando | Resultado | Código de Salida |
| :--- | :--- | :---: | :---: |
| **Typecheck Estático** | `npx tsc --noEmit` | **0 errores** | `0` |
| **Compilación Global** | `npm run build` | **Exitoso (`apps/hoshiko` + `apps/hoshiko-security` + symlink)** | `0` |
| **Pruebas de Auditoría** | `node --test tests/unit/audit-lote-*.test.cjs` | **18/18 pruebas aprobadas** | `0` |
| **Suite Completa del Monorepo** | `npm test` | **216/216 pruebas aprobadas (0 fallos)** | `0` |

---

## 9. Riesgos Pendientes

No se identificaron riesgos que comprometan la seguridad, estabilidad o integridad del sistema en producción. Las mitigaciones implementadas operan con fallbacks locales y aislamiento estricto de recursos.

---

## 10. Limitaciones Conocidas del Sistema de Moderación Actual

1. **Dependencia de la API de Discord para Acciones Externas:**
   - Si la API de Discord experimenta degradación severa (devolviendo errores HTTP 500 continuos), los comandos de moderación y la desaplicación de silencios temporales reintentarán o abortarán de forma segura sin corromper la base de datos, pero la acción física en Discord permanecerá a la espera de estabilidad del servicio.
2. **Historial de Mensajes Purgados en Memoria:**
   - La funcionalidad de restauración o inspección de mensajes borrados por AutoMod reside en la caché LRU en memoria (`automodState`). Si el bot se reinicia antes de que un moderador pulse "Falso Positivo", el mensaje original ya no podrá ser recuperado, aunque la infracción podrá ser perdonada normalmente.

---

## 11. Archivos Modificados Durante Esta Fase

1. [`apps/hoshiko/src/Database/moderation/case.model.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts)
2. [`apps/hoshiko/src/Commands/SlashCmds/Moderation/cases.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/cases.ts)
3. [`apps/hoshiko/src/Commands/SlashCmds/Moderation/mass-ban.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/mass-ban.ts)
4. [`apps/hoshiko/src/Commands/SlashCmds/Moderation/unmute.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Commands/SlashCmds/Moderation/unmute.ts)
5. [`apps/hoshiko/src/Events/Client/handlers/components.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/handlers/components.ts)
6. [`apps/hoshiko/src/Services/TempModerationService.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Services/TempModerationService.ts)
7. [`apps/hoshiko/src/Features/automod/wordFilter.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/automod/wordFilter.ts)
8. [`apps/hoshiko/src/Features/linkProtector.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/linkProtector.ts)
9. [`apps/hoshiko/src/Features/automod/automodState.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Features/automod/automodState.ts)
10. [`apps/hoshiko/src/Security/Logger/LocalStorage.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Security/Logger/LocalStorage.ts)
11. [`tests/unit/audit-lote-a.test.cjs`](file:///home/hanna/HannaeX/tests/unit/audit-lote-a.test.cjs) *(nuevo)*
12. [`tests/unit/audit-lote-b.test.cjs`](file:///home/hanna/HannaeX/tests/unit/audit-lote-b.test.cjs) *(nuevo)*
13. [`tests/unit/audit-lote-c.test.cjs`](file:///home/hanna/HannaeX/tests/unit/audit-lote-c.test.cjs) *(nuevo)*
14. [`MODERATION_AUDIT_REPORT.md`](file:///home/hanna/HannaeX/MODERATION_AUDIT_REPORT.md) *(nuevo entregable)*

---

## 12. Evaluación Final de Preparación Operativa

# **`APPROVED`**

### Justificación:
1. **Integridad Atómica Garantizada:** Cero condiciones de carrera demostradas en la generación de `caseId` bajo concurrencia masiva gracias a secuencias nativas de MongoDB `$inc`.
2. **Jerarquía Blindada contra Fallos de Red:** Los permisos de Discord y la jerarquía de roles se respetan estrictamente aun ante caídas o timeouts transitorios del Gateway.
3. **Alineación con Filosofía Ponytail:** Todas las soluciones fueron implementadas con la menor cantidad de código posible, reutilizando contratos existentes y evitando dependencias innecesarias o sobre-ingeniería.
4. **Verificación Empírica Real con Código 0:** 216 pruebas unitarias aprobadas, compilación exitosa sin advertencias y 0 errores de TypeScript.
