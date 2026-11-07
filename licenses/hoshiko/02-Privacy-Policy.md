# 02 — Privacy Policy (Internal Reference Dossier)

**Título:** Expediente Interno de Privacidad e Ingeniería de Datos — Hoshiko Principal  
**Identificador de Versión:** `HOSHIKO-INT-PRIV-3.0.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-06  
**Estado:** `INTERNALLY-APPROVED`  
**Alcance:** `apps/hoshiko` (Bot Principal)  
**Referencias:** `DATA-INVENTORY.md`, `LEGAL-REVIEW.md`, `04-Data-Retention-and-Deletion.md`, `Public/Privacy-Policy.md`  

---

## 1. Identificación del Responsable del Tratamiento
- **Responsable:** Janner Garcia (`v.sxn`), persona natural.
- **Correo para Ejercicio de Derechos:** `janneralexandergg@gmail.com`.
- **Marco Normativo Principal:** Ley Orgánica de Protección de Datos Personales de la República del Ecuador (LOPDP), su Reglamento General, las Políticas para Desarrolladores de Discord (*Discord Developer Policy*) y principios internacionales aplicables (RGPD).

## 2. Intents de Discord y Datos Recibidos del Gateway
Según `apps/hoshiko/src/client/HoshikoClient.ts:42-51`, el bot se suscribe exactamente a:
- `GatewayIntentBits.Guilds`
- `GatewayIntentBits.GuildMessages`
- `GatewayIntentBits.MessageContent` (Intent privilegiado)
- `GatewayIntentBits.GuildMembers` (Intent privilegiado)
- `GatewayIntentBits.GuildPresences` (Intent privilegiado)
- `GatewayIntentBits.GuildMessageReactions`
- `GatewayIntentBits.GuildVoiceStates`

### 2.1. Uso de los 3 Intents Privilegiados (Evidencia en Código)
1. **`MessageContent` (`messageCreate.ts`, `messageUpdate.ts`, `messageDelete.ts`):**
   - Evaluación de filtros AutoMod (`wordFilter.ts`, `linkProtector.ts`, `aiJudge.ts`).
   - Detección de comandos con prefijo (`prefix`, `hoshi ask`, `x img`, letras de canciones) y menciones a la IA (`aiHandler.ts`).
   - Contabilización de experiencia de texto (`textXp.ts`).
   - Registro en `#message-log` y captura temporal en Snipe (`SnipeService.ts`) cuando el servidor lo habilita.
2. **`GuildMembers` (`guildMemberAdd.ts`, `guildMemberRemove.ts`, `userUpdate.ts`, `avatarHistoryGuildMemberUpdate.ts`):**
   - Bienvenidas, despedidas y `#join-log`.
   - Verificación de jerarquía de roles en moderación (`moderationGuards.ts`).
   - Actualización de `UserHistory` y `AvatarHistory` en servidores compartidos.
3. **`GuildPresences` (`presenceUpdate.ts`):**
   - Asignación de roles automáticos por texto en el estado personalizado (`StatusConfig`).
   - Registro del último estado y actividades (Spotify, Roblox, juegos) en `PresenceHistory` para el comando `/activity`.

## 3. Bases Legitimadoras del Tratamiento (Art. 7 LOPDP / Art. 6.1 RGPD)
No se presume consentimiento general e indiscriminado por el solo hecho de compartir un servidor con el bot. Las bases aplicables por categoría son:
1. **Ejecución de funciones solicitadas por el usuario o la comunidad:** Comandos interactivos (`/rank`, `/confess`, `/suggest`, `/racha`, `/ship`, `/afk`, consultas directas a la IA).
2. **Interés legítimo de seguridad y moderación comunitaria:** Filtros de palabras prohibidas, bloqueo de enlaces de phishing (`linkProtector`), casos disciplinarios (`CaseModel`, `Warning`), auditoría de moderación y retención del `authorId` en confesiones para impedir abusos impunes.
3. **Ajustes comunitarios e información pública de perfil en Discord:** Progresión de niveles e historial de perfil/presencia dentro de los servidores compartidos, sujeto siempre al derecho de oposición y eliminación del titular.
