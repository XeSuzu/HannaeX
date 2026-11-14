# Inventario General de Servidores — Hoshiko

Auditoría oficial del parque de servidores en los que **Hoshiko** tiene presencia activa.
Fecha de auditoría: **14 de noviembre de 2026**.

---

## 1. Resumen por Categorías

| Categoría | N° Servidores | Miembros Sumados | % Audiencia Bruta | Presencia del Bot |
| :--- | :---: | :---: | :---: | :---: |
| **Partners Oficiales** | **2** | **1,611** | 64.5% | 100% Online |
| **Desarrollo (Development / HQ)** | **3** | **13** | 0.5% | 100% Online |
| **Pruebas (Staging / Testing)** | **1** | **4** | 0.2% | 100% Online |
| **Otros Servidores Instalados** | **12** | **869** | 34.8% | 100% Online |
| **TOTAL** | **18** | **2,497** | 100.0% | 18 / 18 Disponibles |

---

## 2. Categoría 1: Partners Oficiales (2 Servidores)

Son las únicas comunidades con estatus oficial de alianza con el proyecto Hoshiko.

### 1. 🎄 Comunidad
- **Guild ID:** `1299943363088355428`
- **Cantidad de Miembros:** **1,286** (En línea aprox.: 73-74)
- **Disponibilidad:** Disponible (HTTP 200 en API de Discord)
- **Estado de Presencia del Bot:** Activo y conectado con roles de sistema asignados
- **Fecha de Creación:** 2024-10-27T03:50:49.540Z (27/10/2024)
- **Hoshiko se unió:** 2026-11-11T03:27:07.362Z
- **Owner ID:** `798965856204750898`
- **Invitación Pública:** `https://discord.gg/comunidad-1299943363088355428` (Vanity)
- **Características / Features:** `COMMUNITY`, `DISCOVERABLE`, `BANNER`, `ANIMATED_ICON`, `PREVIEW_ENABLED`, `AUTO_MODERATION`
- **Operatividad Hoshiko:** 14 casos de moderación, 21 advertencias, 125 usuarios en niveles, módulos `antiSpam`, `antiRaid`, `antiAlt`, `snipe` activos.

### 2. ₊⋆〜 🎸𝙍𝙤𝙘𝙠𝙨𝙩𝙖𝙧 • 𝙃𝙤𝙪𝙨𝙚 🥁〜⋆₊ Moderation by Hoshiko Ai﹕ #0.30k
- **Guild ID:** `1481138795029069836`
- **Cantidad de Miembros:** **325** (En línea aprox.: 49)
- **Disponibilidad:** Disponible (HTTP 200 en API de Discord)
- **Estado de Presencia del Bot:** Activo y conectado con roles de sistema asignados
- **Fecha de Creación:** 2026-03-11T03:56:46.963Z (11/03/2026)
- **Hoshiko se unió:** 2026-11-07T19:52:12.520Z
- **Owner ID:** `1094515910624170034`
- **Invitación Pública:** `https://discord.gg/hdq6pYyfGS` (Permanente)
- **Características / Features:** `COMMUNITY`, `AUTO_MODERATION`, `NEWS`, `SOUNDBOARD`, `TIERLESS_BOOSTING`
- **Operatividad Hoshiko:** 9 casos de moderación, 1 advertencia, 1 usuario en niveles, módulos `aiModeration`, `antiLinks`, `wordFilter` activos.

---

## 3. Categoría 2: Servidores de Desarrollo (3 Servidores)

Servidores de infraestructura técnica, control de despliegue y desarrollo interno administrados directamente por el desarrollador principal (`BOT_OWNER_ID: 824163470416150528`).

### 1. Hoshiko (Sede Central / HQ)
- **Guild ID:** `1456410842236194925`
- **Mapeo en Configuración:** Configurado explícitamente en variable de entorno `GUILD_IDS=["1456410842236194925"]`. Utilizado por `scripts/deploy-commands.ts` para el despliegue de comandos privados de desarrollador.
- **Cantidad de Miembros:** **9** (En línea aprox.: 1-2)
- **Disponibilidad:** Disponible
- **Estado de Presencia del Bot:** Activo (Unido el 2026-02-02T06:01:21.826Z)
- **Fecha de Creación:** 2026-01-01T22:16:43.594Z
- **Owner ID:** `824163470416150528` (XeSuzu / BOT_OWNER_ID)
- **Operatividad Hoshiko:** Cuenta con infraestructura completa de canales de logs (`logsSetup.status = "configured"`) para `modlog`, `messagelog`, `serverlog`, `voicelog`, `linkslog`, `messagereview`. Módulo `antiSpam` activo.

### 2. Hoshiko V2 (Histórico de Desarrollo)
- **Guild ID:** `1428248646394183793`
- **Rol en el Proyecto:** Servidor histórico creado para la arquitectura y pruebas de Hoshiko V2.
- **Cantidad de Miembros:** **2** (En línea aprox.: 1)
- **Disponibilidad:** Disponible
- **Estado de Presencia del Bot:** Activo (Unido el 2025-10-16T05:12:10.287Z)
- **Fecha de Creación:** 2025-10-16T05:10:12.877Z
- **Owner ID:** `824163470416150528` (XeSuzu / BOT_OWNER_ID)
- **Operatividad Hoshiko:** Documento en `serverconfigs`, módulo `antiSpam` activo.

### 3. El servidor de ༄ˢᵀ᭄✿It͢͢͢zeℓ.G✿ ࿐ (Entorno Privado Desarrollador)
- **Guild ID:** `1410857158823907390`
- **Rol en el Proyecto:** Servidor privado personal del propietario del bot.
- **Cantidad de Miembros:** **2** (En línea aprox.: 1)
- **Disponibilidad:** Disponible
- **Estado de Presencia del Bot:** Activo (Unido el 2026-11-07T18:26:13.576Z)
- **Fecha de Creación:** 2025-08-29T05:22:39.122Z
- **Owner ID:** `824163470416150528` (XeSuzu / BOT_OWNER_ID)
- **Operatividad Hoshiko:** Documento en `serverconfigs`, módulo `antiSpam` activo.

---

## 4. Categoría 3: Servidores de Pruebas / Testing (1 Servidor)

### 1. Hoshiko Tests (Staging & Testing)
- **Guild ID:** `1475977750392078438`
- **Mapeo en Configuración:** Configurado explícitamente en la variable de entorno `TEST_GUILD_ID=1475977750392078438`. Utilizado para testing de comandos, exenciones de cuota de IA (`AiExemptionService.ts`) y validación de features antes de producción.
- **Cantidad de Miembros:** **4** (En línea aprox.: 2)
- **Disponibilidad:** Disponible
- **Estado de Presencia del Bot:** Activo (Unido el 2026-10-20T23:47:56.753Z)
- **Fecha de Creación:** 2026-02-24T22:08:38.034Z
- **Owner ID:** `824163470416150528` (XeSuzu / BOT_OWNER_ID)
- **Icono:** Hash `6a178f2c0a05895acf1c92b0e5bbc4e9`
- **Operatividad Hoshiko:** Documento en `serverconfigs`, configuración de IA y banco de pruebas funcional.

---

## 5. Categoría 4: Otros Servidores Instalados (12 Servidores)

Servidores comunitarios y privados donde usuarios y administradores han añadido a Hoshiko. **No son Partners ni servidores de desarrollo.**

| # | Nombre del Servidor | Guild ID | Miembros | Online | Owner ID | Creación Servidor | Hoshiko se unió |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **💫 𝘼𝙢𝙮'𝙨 𝙎𝙩𝙖𝙧 𝙂𝙖𝙧𝙙𝙚𝙣 ! (original)** | `1312554919491797132` | 274 | 41 | `914977505067286578` | 2024-11-30 | 2026-02-21 |
| 2 | **ꜱᴇxᴏ ᴢᴏɴᴇ ᴍᴏᴅ** | `1260144979704287232` | 237 | 44 | `1240056582956646401` | 2024-07-09 | 2026-10-21 |
| 3 | **Uma LATAMusume** | `1395131590656655470` | 211 | 35 | `1258923705392959539` | 2025-07-16 | 2026-02-07 |
| 4 | **𝓒𝓵𝓸𝓾𝓭 𝓗𝓪𝓿𝓮𝓷💤** | `1499733453246038148` | 42 | 22 | `1457443264129929236` | 2026-05-01 | 2026-11-08 |
| 5 | **🎄 Monsters Gods** | `966452431934353418` | 34 | 14 | `798965856204750898` | 2022-04-20 | 2026-02-21 |
| 6 | **Las llantas de Anzon** | `1345336430452539433` | 30 | 7 | `943490097704230942` | 2025-03-01 | 2026-02-21 |
| 7 | **Servidor de Minecraft** | `1469500804627959850` | 14 | 1 | `1293606512660447346` | 2026-02-07 | 2026-03-20 |
| 8 | **NPC** | `943163065183113327` | 9 | 8 | `622266853963726858` | 2022-02-15 | 2026-02-21 |
| 9 | **The Infinite World** | `855288657530978315` | 8 | 4 | `622266853963726858` | 2021-06-18 | 2026-02-21 |
| 10 | **El servidor de tronfor456** | `1474916471158083658` | 6 | 5 | `851972421334204479` | 2026-02-21 | 2026-02-21 |
| 11 | **El servidor de c.sxn** | `1474914623634276364` | 2 | 1 | `1453575396237901960` | 2026-02-21 | 2026-02-21 |
| 12 | **El servidor de Aguss** | `1562251599835959299` | 2 | 1 | `798965856204750898` | 2026-10-20 | 2026-10-22 |

---

## 6. Observaciones Técnicas sobre Servidores Inactivos o Desconectados

- **Registro Residual en MongoDB (`1511873318771228682`):**
  En la colección `serverconfigs` existe un documento perteneciente al Guild ID `1511873318771228682`. Sin embargo, el bot **ya no se encuentra presente** en dicho servidor (no devuelto por `Routes.userGuilds()`). Esto ocurre cuando un servidor expulsa al bot antes de la implementación del manejador de purga en tiempo real (`Client/Guilds/guildDelete.ts`).
- **Purga de Cumplimiento en Tiempo Real:**
  Conforme a los Términos de Desarrollador de Discord y el evento auditado en logs (`[Compliance/DataRetention]: Guild-scoped data purged following bot removal from server 1519526265625903274`), el bot elimina los datos contextuales cuando es retirado de un servidor.

---

## 7. Directrices de Seguridad y Privacidad para HoshikoWeb

1. **Aislamiento de Servidores No-Partners:**
   Los 12 servidores instalados y los 4 servidores de desarrollo/pruebas **nunca deben listarse nominalmente** en la landing page pública de HoshikoWeb. Solo se deben utilizar para el contador numérico agregado:
   `"Acompañando a 18 servidores y más de 2,400 usuarios"`.
2. **Protección de IDs y Propietarios:**
   Los identificadores numéricos de Discord (Snowflakes) de propietarios y canales jamás deben exponerse en el frontend público.
