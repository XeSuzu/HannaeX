# 🛡️ Sistema de Moderación Convencional de Hoshiko

**Aplicación:** `apps/hoshiko`  
**Versión:** Consolidada (Post-Lotes 1, 2, 3 y 4)  
**Estado:** ✅ Verificado y en producción (198/198 tests passing)

---

## 1. Arquitectura del Sistema

El sistema de moderación de Hoshiko opera íntegramente dentro de `apps/hoshiko`, completamente desacoplado de la suite de defensa perimetral (`apps/hoshiko-security`).

```text
apps/hoshiko/src/
├── Commands/SlashCmds/Moderation/    # Comandos slash de moderación (Slash-Only)
│   ├── ban.ts, kick.ts, softban.ts, tempban.ts
│   ├── Mute.ts, tempmute.ts, unmute.ts
│   ├── warn.ts, warnings.ts, unban.ts, purge.ts, mass-ban.ts
│   ├── case.ts, cases.ts             # Libro de casos unificado
│   ├── setup.ts, setup-automod.ts, setup-logs.ts
├── Events/Client/
│   ├── messageCreate.ts              # Pipeline síncrono de AutoMod en mensajes nuevos
│   ├── Guilds/
│   │   ├── messageUpdate.ts          # Re-evaluación preventiva en mensajes editados
│   │   ├── messageDelete.ts          # Registro de borrados en messagelog
│   │   └── guildBanAdd.ts            # Registro de bans manuales externos
│   └── handlers/
│       ├── command.ts                # Lock distribuido (NX EX 15s) y adaptador deferral
│       └── components.ts             # Centro de Comando interactivo de modlog y revisión IA
├── Features/automod/                 # Lógica de negocio de AutoMod
│   ├── automodState.ts               # Estrés L1/L2 (-1 pt/s), muros de texto, flood
│   ├── linkProtector.ts              # Detección de phishing, allowlist, invites
│   ├── wordFilter.ts                 # Transliteración homóglifa, regex y flexión morfológica
│   ├── aiModeration.ts / aiJudge.ts  # Moderación IA, circuit breaker, modos shadow/enforce
├── Database/moderation/              # Persistencia Mongoose por dominio
│   ├── case.model.ts                 # Libro canónico de casos (#1, #2...)
│   ├── warning.model.ts              # Historial acumulativo de advertencias
│   └── tempModeration.model.ts       # Sanciones temporales (ban y mute)
└── Security/Logger/                  # Sistema de auditoría
    ├── HoshikoLogger.ts              # Batching, embeds y botones de acción rápida
    └── LocalStorage.ts / SecurityLogger.ts # Almacenamiento local JSONL y webhooks
```

---

## 2. Funcionamiento de AutoMod Convencional

El pipeline de AutoMod se ejecuta en [`messageCreate.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/messageCreate.ts) y [`messageUpdate.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Events/Client/Guilds/messageUpdate.ts) con las siguientes capas:

### 2.1 AntiSpam
- **Frecuencia excesiva y repetición:** Control en memoria (L1) y Redis (L2) con huellas normalizadas NFKC.
- **Estrés del servidor:** Medidor que acumula puntos por infracciones y se disipa a razón de -1 punto por segundo.
- **Muros de texto y menciones masivas:** Límites configurables por servidor en `serverconfigs`.
- **Exenciones:** Roles y canales configurados en whitelist no generan incremento de estrés.

### 2.2 AntiLinks
- **Sincronización:** Base de dominios maliciosos sincronizada periódicamente cada 6 horas contra *sinking.yachts*.
- **Allowlist por servidor:** Dominios aprobados (`linkAllowlist.ts`) y control estricto de invitaciones de Discord no autorizadas.
- **Acciones:** Eliminación inmediata del mensaje con alerta enriquecida al canal `modlog`.

### 2.3 WordFilter
- **Transliteración de Homóglifos:** Mapeo de caracteres cirílicos y griegos idénticos a latinos (`а`->`a`, `е`->`e`, `о`->`o`, etc.) antes de la normalización.
- **Prevención de Falsos Positivos:** Protección léxica de palabras cotidianas cortas (`as`, `is`, `si`) previniendo que el colapso de letras dobles clasifique erróneamente términos como *"as usual"*.
- **Flexión Morfológica:** Soporte de sufijos en español (plurales, aumentativos, diminutivos).

### 2.4 AI Moderation (Juez de IA)
- **Evaluación Contextual:** Análisis semántico de toxicidad, acoso y estafas complejas.
- **Presupuesto Diario:** Máximo 200 solicitudes/día por servidor para evitar sobrecostes.
- **Circuit Breaker:** 3 fallos consecutivos activan un enfriamiento de 5 minutos, degradando a filtros heurísticos locales sin interrumpir el resto de AutoMod.
- **Modos Operativos:** `shadow` (solo registra para calibración) y `enforce` (aplica acciones y emite tarjeta de revisión al Centro de Logs).

---

## 3. Moderación Manual y Guardas de Jerarquía

Tras la decisión de consolidación arquitectónica, la moderación opera **exclusivamente mediante Slash Commands** (`/`), erradicando los riesgos de bypass presentes en implementaciones por prefijo.

### 3.1 Guardas Centralizadas (`moderationGuards.ts`)
Cada comando ejecuta obligatoriamente:
1. `checkModeratorPermissions`: Comprueba que el ejecutor tenga el permiso requerido de Discord.
2. `checkBotPermissions`: Comprueba que Hoshiko tenga los permisos de Discord necesarios para ejecutar la acción.
3. `canModerateTarget`:
   - Prohíbe auto-sanciones (`target.id === executor.id`).
   - Protege al dueño del servidor (`target.id === guild.ownerId`).
   - Protege al propio bot (`target.id === client.user.id`).
   - Verifica jerarquía estricta de roles: `executor.roles.highest.position > target.roles.highest.position` y `bot.roles.highest.position > target.roles.highest.position`.

### 3.2 Resolución Limpia de Deferral
Todos los comandos con diferimiento público (`deferReply`) resuelven cualquier fallo de guarda con `await interaction.editReply({ content: reason })`, eliminando la animación "pensando..." permanentemente colgada.

---

## 4. Catálogo de Acciones Disponibles

| Comando / Acción | Permiso Requerido | Descripción | Registro de Caso |
| :--- | :--- | :--- | :--- |
| `/ban <usuario> [razon] [dias]` | `BanMembers` | Banea permanentemente al usuario y purga hasta 7 días de mensajes. | `CaseModel (action: "ban")` |
| `/tempban <usuario> <tiempo> [razon]` | `BanMembers` | Banea temporalmente con programación en `TempModerationService`. | `CaseModel (action: "ban")` |
| `/softban <usuario> [razon]` | `BanMembers` | Banea y desbanea de inmediato para purgar mensajes del usuario. | `CaseModel (action: "ban")` |
| `/unban <userId> [razon]` | `BanMembers` | Desbanea y limpia cualquier tempban pendiente en la BD. | `CaseModel (action: "unban")` |
| `/kick <usuario> [razon]` | `KickMembers` | Expulsa al miembro del servidor. | `CaseModel (action: "kick")` |
| `/mute <usuario> <tiempo> [razon]` | `ModerateMembers` | Aplica Timeout nativo de Discord (hasta 28 días). | `CaseModel (action: "timeout")` |
| `/tempmute <usuario> <tiempo> [razon]` | `ModerateMembers` | Silencia temporalmente con control y backoff progresivo. | `CaseModel (action: "timeout")` |
| `/unmute <usuario> [razon]` | `ModerateMembers` | Retira el silencio y limpia cualquier tempmute pendiente en la BD. | `CaseModel (action: "unmute")` |
| `/warn <usuario> [motivo]` | `ModerateMembers` | Registra exactamente 1 advertencia atómica en `Warning` y DM al usuario. | `CaseModel (action: "warn")` |
| `/warnings <usuario>` | `ModerateMembers` | Muestra el historial de advertencias activas del usuario. | Consulta lectura |
| `/purge <cantidad>` | `ManageMessages` | Purga hasta 100 mensajes en el canal actual respetando 14 días. | `CaseModel (action: "purge")` |
| `/massban <ids> [razon]` | `BanMembers` | Baneo masivo con pool concurrente (5 workers) y fetch estricto. | Estadísticas / Múltiples bans |
| `/case <numero>` | `ModerateMembers` | Consulta los detalles de un caso disciplinario específico (#X). | Consulta lectura |
| `/cases [usuario] [limite]` | `ModerateMembers` | Lista el historial de casos del usuario o los más recientes del servidor. | Consulta lectura |

---

## 5. Unificación en `CaseModel`

Toda acción sancionatoria genera una entrada numerada secuencialmente por servidor (`caseId` 1, 2, 3...) en [`case.model.ts`](file:///home/hanna/HannaeX/apps/hoshiko/src/Database/moderation/case.model.ts):

- **Índices:** `{ guildId: 1, caseId: 1 }` (único) y `{ guildId: 1, userId: 1, createdAt: -1 }`.
- **Estructura:**
  - `caseId`: Número incremental por servidor.
  - `guildId`, `userId`, `modId`: Identificadores de Discord.
  - `action`: `"warn" | "timeout" | "kick" | "ban" | "unban" | "purge" | "unmute"`.
  - `reason`: Motivo especificado (máx 512 caracteres).
  - `source`: `"manual" | "automod" | "ai"`.
  - `durationMs`: Duración en milisegundos si aplica.
  - `createdAt`: Marca temporal ISO.

---

## 6. Sistema de Logs y Centro de Comando

- **`modlog`:** Canal central de auditoría. Presenta tarjetas enriquecidas con el Centro de Comando interactivo de 4 botones:
  - `Aislar 1 hora` (requiere `ModerateMembers` y valida jerarquía).
  - `Banear` (requiere `BanMembers` y valida jerarquía).
  - `Purgar 50 mensajes` (acotado exclusivamente al canal donde ocurrió el incidente).
  - `Perdonar / Falso Positivo` (requiere `ModerateMembers` y levanta silenciados).
- **`messagelog`:** Registro de mensajes editados y eliminados con formateo de citas.
- **Protección contra Fugas:** El manejo de excepciones en botones responde mensajes genéricos seguros sin exponer nombres de tablas, variables ni trazas crudas.

---

## 7. Configuración por Servidor

- `/setup`: Panel general unificado que administra comportamiento, identidad, módulos convencionales y confirmación de snipe.
- `/setup-automod`: Habilita y calibra los 4 módulos de AutoMod (`antiSpam`, `antiLinks`, `wordFilter`, `aiModeration`), allowlist de dominios y lista blanca de miembros exentos.
- `/setup-logs`: Asigna y sincroniza los canales dedicados de auditoría por categoría.

---

## 8. Limitaciones Conocidas y Delimitación

1. **Defensa Perimetral (Anti-Raid, Anti-Nuke, Lockdown, Sentinel):** No forman parte de Hoshiko; son operadas exclusivamente por `apps/hoshiko-security`.
2. **Duración Máxima de Timeout:** La API de Discord limita el Timeout nativo a un máximo estricto de 28 días. Para sanciones mayores a 28 días debe utilizarse `/tempban` o `/ban`.
3. **Límite de Purga:** Discord no permite la eliminación en lote de mensajes con antigüedad mayor a 14 días.
