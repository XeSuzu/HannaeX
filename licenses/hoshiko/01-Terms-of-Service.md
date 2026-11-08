# 01 — Terms of Service (Internal Reference Dossier)

**Título:** Expediente Interno de Términos de Servicio — Hoshiko Principal  
**Identificador de Versión:** `HOSHIKO-INT-TOS-3.1.0`  
**Fecha de Elaboración:** 2026-11-06  
**Fecha de Última Revisión:** 2026-11-08  
**Estado:** `INTERNALLY-APPROVED`  
**Alcance:** `apps/hoshiko` (Bot Principal de Gestión Comunitaria, Interacción Social, Niveles, AutoMod e IA)  
**Referencias:** `DATA-INVENTORY.md`, `LEGAL-REVIEW.md`, `Public/Terms-of-Service.md`  

---

## 1. Identificación del Servicio y Titularidad
- **Nombre del Producto:** Hoshiko (`apps/hoshiko`).
- **Titular y Operador:** Janner Garcia, conocido públicamente como `v.sxn`, persona natural.
- **Contacto Oficial:** `janneralexandergg@gmail.com`.
- **Relación con la Licencia de Código:** Estos términos regulan el uso del bot alojado; el código fuente es propietario (*All Rights Reserved*) según `licenses/LICENSE`.

## 2. Alcance Funcional Verificado en Código (`apps/hoshiko`)
A diferencia de documentos antiguos que incluían funciones eliminadas o no implementadas, el alcance real vigente de `apps/hoshiko` comprende exclusivamente:
1. **Inteligencia Artificial Conversacional, Memoria Adaptativa y Cifrado (`Features/aiHandler.ts`, `Services/gemini.ts`, `PersonalMemoryService.ts`, `conversation.model.ts`):**
   - Respuestas en canal por mención (`@Hoshiko`), respuesta directa, prefijo (`hoshi ask`, `x ask`) o intervención espontánea configurable.
   - Búsqueda web asistida por herramienta `googleSearch` de Gemini con ilusión de trabajo de 10s en 5 etapas progresivas (charlas casuales y locales con 0ms de espera).
   - Traducción de texto (`/translate`).
   - **Memoria Personal Soberana Cifrada (AES-256-GCM):** Hasta 20 hechos y dinámicas de trato (`dynamic`, `biography`, `preference`) por usuario (`PersonalMemory`), aislados estrictamente por `userId`.
   - **Historial de Conversación Cifrado (`Conversation`):** Historial activo de hasta 40 turnos aislado por `{ userId, guildId }`, cifrado con AES-256-GCM y TTL de 30 días.
   - **Memoria Comunitaria con Gatekeeper Anti-Drama (`ServerEntityMemory`):** Filtro estricto que descarta chismes, insultos y funas, con regla de cero espontaneidad en charlas casuales.
   - **Cuotas Diarias:** 20 investigaciones y 40 conversaciones por usuario, con reinicio a las 00:00 hora de Ecuador (`America/Guayaquil`), auditables y gestionables en `/ai panel` y `/ai usage`.
2. **Sistema de Niveles, Experiencia (Texto y Voz) y Perfil Global (`Features/levelHandler.ts`, `Database/leveling/`):**
   - XP local por mensajes (`LocalLevel`) y XP global de texto (`GlobalLevel`).
   - XP local por permanencia en canales de voz activos (`voiceManager.ts`, `ActiveVoiceSession`), midiendo únicamente tiempo de conexión y estado de micrófono/auriculares (**sin grabar ni recibir paquetes de audio de voz**).
   - Tarjetas gráficas generadas con `@napi-rs/canvas` (`/rank`, `/leaderboard`, `/profile`, `/post-twitter`, `/post-instagram`, actividad de Spotify/Roblox).
3. **Módulos Comunitarios y Sociales (`Database/community/`, `Database/streaks/`):**
   - Confesiones anónimas o públicas (`/confess`, `ConfessionManager.ts`), donde el `authorId` y `authorTag` se registran internamente para prevención de abusos (`/confession-ban`, `/confession-check`).
   - Sugerencias (`/suggest`), vínculos afectivos y parejas (`/ship`, `/pareja`, `couple.model.ts`) y rachas diarias dúo o grupales (`/crear-racha`, `/racha`, `StreakService.ts`).
   - Roles por estado personalizado (`presenceUpdate.ts`, `StatusConfig`) y roles por reacción (`reactionRoles.models.ts`).
4. **Moderación Manual y AutoMod Convencional (`Commands/SlashCmds/Moderation/`, `Features/automod/`):**
   - Comandos manuales: `/warn`, `/warnings`, `/mute`, `/unmute`, `/kick`, `/ban`, `/unban`, `/tempban`, `/massban`, `/purge`, `/case`, `/cases`, `/historial`, `/lock`, `/unlock`, `/slowmode`.
   - AutoMod en `apps/hoshiko`: Filtro de palabras con normalización anti-bypass y homóglifos (`wordFilter.ts`), protección de enlaces y anti-phishing (`linkProtector.ts`), anti-spam y juez de IA (`aiJudge.ts` en modos `shadow` o `enforce`).
   - Recuperación efímera de mensajes borrados (`/snipe`, `SnipeService.ts`) y canales de auditoría (`HoshikoLogger.ts`).
5. **Información e Historial de Usuario (`Commands/SlashCmds/Information/`):**
   - Consulta de letras musicales (`/lyrics` vía Genius, LRCLIB, Lyrics.ovh e iTunes).
   - Visualización de historial de avatares (`/avatars`), nombres/tags (`/users`) y actividad (`/activity`) recolectados en servidores compartidos.

> **Exclusiones verificadas:**
> - **Módulos de Seguridad Perimetral (`Anti-Raid`, `Anti-Nuke`, `Honeypot`, `Sentinel`):** Fueron segregados fuera de `apps/hoshiko` hacia `apps/hoshiko-security` (verificado por test `SEP-01` en `tests/unit/security-separation.test.cjs`). No forman parte de los Términos de Hoshiko Principal.
> - **Streaming de Música por Voz (Lavalink) y Monedas de Economía:** No están implementados en el código actual (`NOT IMPLEMENTED`).

## 3. Responsabilidades de Administradores y Usuarios
- **Administradores:** Quien invita y configura a Hoshiko declara contar con permisos legítimos (`ManageGuild` / `Administrator`). Es responsable de informar a su comunidad cuando activa módulos como Snipe, registros de mensajes eliminados (`#message-log`), roles por estado o moderación automática en modo `enforce`.
- **Usuarios:** Deben respetar los Términos y Directrices de la Comunidad de Discord, no utilizar confesiones ni comandos para actividades ilícitas o *doxxing*, y no abusar de las cuotas de IA.

## 4. Estado de Modalidad Premium
- El código contiene verificación de fecha de expiración (`PremiumManager.isPremium` en `Database/guild/PremiumManager.ts` y comando de propietario `/give-premium`), pero **no existe pasarela de cobro activa ni venta pública**. Se documenta como función futura o asignada administrativamente sin cobro actual.
