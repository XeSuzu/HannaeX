# Ficha Técnica de Partner Oficial: Comunidad

Documento de auditoría técnica y perfil de integración para la plataforma **HoshikoWeb**.

---

## 1. Identificación Principal

| Campo | Valor Verificado | Notas Técnicas / Fuente |
| :--- | :--- | :--- |
| **Nombre Exacto en Discord** | `🎄 Comunidad` | Obtenido vía Discord API `Routes.guild()` |
| **Guild ID** | `1299943363088355428` | Discord Snowflake |
| **Estado del Servidor** | **Disponible / Operativo** | Código HTTP 200 en Discord REST v10 |
| **Estado de Presencia del Bot** | **Presente / Conectado** | Miembro activo con roles asignados |
| **Fecha de Creación del Servidor** | `2024-10-27T03:50:49.540Z` | 27 de octubre de 2024 (Extraído de Snowflake ID) |
| **Fecha de Entrada de Hoshiko** | `2026-11-11T03:27:07.362Z` | 11 de noviembre de 2026 (Discord `guildMember.joined_at`) |
| **Propietario (Owner ID)** | `798965856204750898` | Usuario registrado en Discord API |
| **Cantidad Actual de Miembros** | **1,286** | `approximate_member_count` (Discord API v10) |
| **Miembros en Línea Aproximados** | **~73 - 74** | `approximate_presence_count` (Discord API v10) |
| **Invitación Pública Autorizada** | `https://discord.gg/comunidad-1299943363088355428` | Vanity URL oficial (`comunidad-1299943363088355428`), 411 usos registrados |

---

## 2. Recursos Gráficos y Multimedia

- **Icono del Servidor:**
  - Hash de Icono: `2bd7b1f860be5579f554e183b036a277`
  - URL Directa (CDN): [Icono de Comunidad](https://cdn.discordapp.com/icons/1299943363088355428/2bd7b1f860be5579f554e183b036a277.png?size=1024)
- **Banner del Servidor:**
  - Hash de Banner: `4a2eacbe008b5145df061016e88b2cb9`
  - URL Directa (CDN): [Banner de Comunidad](https://cdn.discordapp.com/banners/1299943363088355428/4a2eacbe008b5145df061016e88b2cb9.png?size=1024)
- **Splash de Invitación (Invite Splash):**
  - Hash de Splash: `4dae560fdaf070f51ae74883202de16b`
  - URL Directa (CDN): [Splash de Comunidad](https://cdn.discordapp.com/splashes/1299943363088355428/4dae560fdaf070f51ae74883202de16b.png?size=1024)

---

## 3. Características de la Comunidad e Información Pública

- **Descripción Pública (Discord Guild Description):**
  > *"ola si somos una comunidad"*
- **Idioma Predominante / Locale:**
  `es-419` (Español Latinoamericano). Evidencia técnica: campo nativo `preferred_locale` en Discord API y canales públicos de interacción en idioma español.
- **Categoría / Temática:**
  Comunidad social general de habla hispana, centrada en charla, convivencia, multimedia y entretenimiento.
- **Nivel de Verificación de Seguridad Discord:**
  Nivel 1 (Bajo: debe tener correo electrónico verificado en su cuenta de Discord).
- **Características / Features Nativas Detectadas en Discord:**
  - `COMMUNITY` (Habilitado como Servidor Comunitario oficial)
  - `DISCOVERABLE` (Comunidad descubrible en el directorio público de Discord)
  - `PREVIEW_ENABLED` (Permite previsualización de canales antes de unirse)
  - `GUILD_ONBOARDING` & `GUILD_SERVER_GUIDE` (Flujo de bienvenida e incorporación guiada de usuarios)
  - `AUTO_MODERATION` (Soporte activo para reglas de AutoMod)
  - `BANNER`, `ANIMATED_ICON`, `INVITE_SPLASH`, `ROLE_ICONS` (Capacidades avanzadas por nivel de impulsos)
  - `NEWS` (Canales de anuncios configurados)

---

## 4. Estado Operativo de Hoshiko en la Comunidad

Datos auditados directamente de la base de datos `KissDataBase` (MongoDB):

- **Configuración de Servidor (`serverconfigs`):**
  - Prefijo personalizado: `x`
  - Modo de Inteligencia Artificial: `aiMode: "libre"` | Nivel de seguridad de IA: `aiSafety: "relaxed"`
  - Personalidad de IA: `mode: "assistant"`
- **Módulos de Seguridad Activos en DB:**
  - `antiSpam`: **Habilitado**
  - `antiRaid`: **Habilitado**
  - `antiAlt`: **Habilitado**
  - `snipe`: **Habilitado**
  - `antiNuke`: Deshabilitado
  - `antiLinks`: Deshabilitado
- **Canales de Auditoría y Logs Centralizados (`logChannels`):**
  - ModLog (`modlog`): Configurado (`1569471073093943299`)
  - Registro de Servidor (`serverlog`): Configurado (`1569034623168675993`)
  - Registro de Mensajes (`messagelog`): Configurado (`1569471093511815229`)
  - Revisión de Mensajes (`messagereview`): Configurado (`1569471113627705394`)
  - Enlaces (`linkslog`): Configurado (`1569471136276676768`)
  - Actividad de Voz (`voicelog`): Configurado (`1569471169940426872`)
  - Entradas y Salidas (`joinlog`): Configurado (`1462198822603198722`)
  - General (`all`): Configurado (`1462198822603198722`)
- **Métricas Acumuladas en Hoshiko:**
  - Casos de moderación registrados (`cases`): **14 casos**
  - Advertencias formales registradas (`warnings`): **21 advertencias**
  - Usuarios registrados en el sistema de niveles (`locallevels`): **125 usuarios**

---

## 5. Clasificación de Datos para HoshikoWeb

| Tipo de Dato | Clasificación | Recomendación para HoshikoWeb |
| :--- | :---: | :--- |
| Nombre (`Comunidad`) | **Pública** | Apto para mostrar como título del Partner. |
| Icono y Banner Oficial | **Pública** | Apto para mostrar en tarjetas de Partner. |
| Conteo de Miembros (`1,286`) | **Pública** | Apto para mostrar como métrica de alcance. |
| Enlace de Invitación (Vanity) | **Pública** | Apto para el botón "Unirse a la Comunidad". |
| Descripción pública | **Pública** | Apto para mostrar (o acompañar de texto editorial aprobado). |
| ID de Propietario / Staff | **Interna / Exclusiva** | **No exponer**. Debe mantenerse reservado. |
| IDs de Canales de Logs | **Interna / Exclusiva** | **No exponer**. Pertenecen a la seguridad privada del servidor. |
| Historial detallado de Casos | **Interna / Exclusiva** | Solo exponer cifra agregada (p. ej. "14 sanciones aplicadas"). |

---

## 6. Metadatos de la Recopilación

- **Fecha y Hora de Auditoría:** `2026-11-14T09:14:19Z` (14 de noviembre de 2026, 09:14 UTC).
- **Auditor:** Agente Antigravity sobre entorno de producción local del host.
- **Trazabilidad:** Verificado contra Discord API v10 y MongoDB local `KissDataBase`.
