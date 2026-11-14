# Ficha Técnica de Partner Oficial: Rockstar House

Documento de auditoría técnica y perfil de integración para la plataforma **HoshikoWeb**.

---

## 1. Identificación Principal

| Campo | Valor Verificado | Notas Técnicas / Fuente |
| :--- | :--- | :--- |
| **Nombre Exacto en Discord** | `₊⋆〜 🎸𝙍𝙤𝙘𝙠𝙨𝙩𝙖𝙧 • 𝙃𝙤𝙪𝙨𝙚 🥁〜⋆₊ Moderation by Hoshiko Ai﹕ #0.30k` | Obtenido vía Discord API `Routes.guild()` |
| **Guild ID** | `1481138795029069836` | Discord Snowflake |
| **Estado del Servidor** | **Disponible / Operativo** | Código HTTP 200 en Discord REST v10 |
| **Estado de Presencia del Bot** | **Presente / Conectado** | Miembro activo con roles asignados |
| **Fecha de Creación del Servidor** | `2026-03-11T03:56:46.963Z` | 11 de marzo de 2026 (Extraído de Snowflake ID) |
| **Fecha de Entrada de Hoshiko** | `2026-11-07T19:52:12.520Z` | 7 de noviembre de 2026 (Discord `guildMember.joined_at`) |
| **Propietario (Owner ID)** | `1094515910624170034` | Usuario registrado en Discord API |
| **Cantidad Actual de Miembros** | **325** | `approximate_member_count` (Discord API v10) |
| **Miembros en Línea Aproximados** | **~49** | `approximate_presence_count` (Discord API v10) |
| **Invitación Pública Autorizada** | `https://discord.gg/hdq6pYyfGS` | Invitación permanente activa (692 usos acumulados, creada por `profetequila`) |
| **Invitación Alternativa / Respaldo** | `https://discord.gg/SAeenufcUB` | Invitación permanente activa (109 usos acumulados, creada por `profetequila`) |

---

## 2. Recursos Gráficos y Multimedia

- **Icono del Servidor:**
  - Hash de Icono: `9ff9b8c735faadc2255a7289997bedc5`
  - URL Directa (CDN): [Icono de Rockstar House](https://cdn.discordapp.com/icons/1481138795029069836/9ff9b8c735faadc2255a7289997bedc5.png?size=1024)
- **Banner del Servidor:**
  - **No disponible (`null`)**. El servidor no cuenta con banner configurado ni con nivel de impulsos suficiente para banner estático/animado.
- **Splash de Invitación (Invite Splash):**
  - **No disponible (`null`)**. No tiene imagen de bienvenida personalizada configurada.

---

## 3. Características de la Comunidad e Información Pública

- **Descripción Pública (Discord Guild Description):**
  > *"Rockstar House es un servidor exclusivo de latam para hacer amigos y pasarla lo mejor posible, tematizado en gatos, anime y ¡Musica y show! ¡Si buscas un lugar comodo, sano, y bien pendejo este es tu lugar!."*
- **Idioma Predominante / Locale:**
  `es-ES` / Español latinoamericano. Evidencia técnica: campo nativo `preferred_locale: "es-ES"` en Discord API, descripción explícita de "exclusivo de latam" y canales de interacción en español.
- **Categoría / Temática:**
  Comunidad de entretenimiento, música, anime, cultura de gatos y socialización juvenil de América Latina. En el propio nombre público del servidor destaca: `"Moderation by Hoshiko Ai"`.
- **Nivel de Verificación de Seguridad Discord:**
  Nivel 1 (Bajo: debe tener correo electrónico verificado en su cuenta de Discord).
- **Características / Features Nativas Detectadas en Discord:**
  - `COMMUNITY` (Habilitado como Servidor Comunitario oficial)
  - `AUTO_MODERATION` (Soporte activo para reglas de AutoMod)
  - `NEWS` (Canales de anuncios configurados)
  - `SOUNDBOARD` (Panel de sonidos activo)
  - `TIERLESS_BOOSTING` (Sistema de impulsos activos)
- **Estado de Vanity URL:**
  No posee Vanity URL propia (código HTTP 403 / Missing Access en Discord API al consultar vanities, lo cual confirma ausencia de nivel 3 de boost o vanity dedicada). Se emplean las invitaciones permanentes autorizadas del equipo de moderación.

---

## 4. Estado Operativo de Hoshiko en la Comunidad

Datos auditados directamente de la base de datos `KissDataBase` (MongoDB):

- **Configuración de Servidor (`serverconfigs`):**
  - Prefijo personalizado: `x`
  - Modo de Inteligencia Artificial: `aiMode: "libre"` | Nivel de seguridad de IA: `aiSafety: "relaxed"`
  - Personalidad de IA: `mode: "assistant"`
- **Módulos de Seguridad Activos en DB:**
  - `aiModeration`: **Habilitado** (Moderación activa mediante IA)
  - `antiLinks`: **Habilitado** (Protección contra enlaces no permitidos)
  - `wordFilter`: **Habilitado** (Filtro de palabras)
  - `antiSpam`: Deshabilitado
  - `antiRaid`: Deshabilitado
- **Canales de Auditoría y Logs Centralizados (`logChannels`):**
  - ModLog (`modlog`): Configurado (`1568727870132461690`)
  - Estado de `logsSetup`: `unconfigured` (configurado mediante canal individual `modlog`)
- **Métricas Acumuladas en Hoshiko:**
  - Casos de moderación registrados (`cases`): **9 casos**
  - Advertencias formales registradas (`warnings`): **1 advertencia**
  - Usuarios registrados en el sistema de niveles (`locallevels`): **1 usuario**

---

## 5. Clasificación de Datos para HoshikoWeb

| Tipo de Dato | Clasificación | Recomendación para HoshikoWeb |
| :--- | :---: | :--- |
| Nombre (`Rockstar House`) | **Pública** | Apto para mostrar como título del Partner (se recomienda simplificar el nombre a "Rockstar House" en la interfaz visual). |
| Icono Oficial | **Pública** | Apto para mostrar en tarjeta o avatar de Partner. |
| Conteo de Miembros (`325`) | **Pública** | Apto para métricas de alcance en la web. |
| Enlace de Invitación (`hdq6pYyfGS`) | **Pública** | Apto para el botón "Unirse a Rockstar House". |
| Descripción pública | **Pública** | Apto para mostrar la temática (gatos, anime, música y show). |
| Banner | **No disponible** | Utilizar fallback visual o placeholder temático en la web. |
| ID de Propietario / Staff | **Interna / Exclusiva** | **No exponer**. Reservado a administración. |
| ID de Canal de ModLog | **Interna / Exclusiva** | **No exponer**. Seguridad interna. |
| Registro de Casos Individuales | **Interna / Exclusiva** | Solo exponer cifra agregada (p. ej. "9 casos gestionados"). |

---

## 6. Metadatos de la Recopilación

- **Fecha y Hora de Auditoría:** `2026-11-14T09:14:19Z` (14 de noviembre de 2026, 09:14 UTC).
- **Auditor:** Agente Antigravity sobre entorno de producción local del host.
- **Trazabilidad:** Verificado contra Discord API v10 y MongoDB local `KissDataBase`.
