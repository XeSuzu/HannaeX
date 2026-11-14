# Auditoría de Partners Oficiales, Servidores y Métricas Reales

Este directorio consolida la auditoría técnica integral realizada sobre la infraestructura del bot principal **Hoshiko** (`XeSuzu/HannaeX`), ejecutada con fecha **14 de noviembre de 2026**. Su propósito es proporcionar la base de datos fáctica, verificable y trazable requerida para la integración y visualización de métricas en la futura plataforma **HoshikoWeb**.

---

## 1. Resumen Ejecutivo y Marco Institucional

### Principio de Partners Oficiales
En el ecosistema de Hoshiko, la presencia del bot en un servidor **no** constituye una alianza comercial ni un acuerdo de Partner. Actualmente existen **única y estrictamente DOS (2) servidores autorizados** bajo la categoría de **Partner Oficial**:

1. **Comunidad** (`1299943363088355428`)
2. **Rockstar House** (`1481138795029069836`)

Cualquier otro servidor donde Hoshiko opere —incluyendo servidores de la directiva, entornos de prueba, servidores de desarrollo o comunidades externas— es categorizado exclusivamente como servidor instalado o de desarrollo, y bajo ninguna circunstancia debe ser presentado como Partner en la landing page de HoshikoWeb.

---

## 2. Fuentes de Información y Metodología de Auditoría

Toda la información contenida en esta documentación fue extraída directamente de fuentes de producción activas sin inferencias ni suposiciones:

1. **Discord REST API (v10):**
   - Endpoints consultados con token de bot oficial: `Routes.userGuilds()`, `Routes.guild()`, `Routes.guildMember()`, `Routes.guildVanityUrl()`, `Routes.guildInvites()`.
   - Extracción de marcas de tiempo nativas a través de Discord Snowflake IDs (`(BigInt(id) >> 22n) + 1420070400000n`).
2. **Entorno en Ejecución y Clientes Discord.js:**
   - Proceso PM2 `hoshiko-bot` (PID 32836, Node.js v22.23.3, PM2 ID 0).
   - Comandos internos auditados: `/dev-servers` (`apps/hoshiko/src/Commands/SlashCmds/Owner/dev-servers.ts`), `/servidores` (`apps/hoshiko/src/Commands/SlashCmds/Privado/listar-servers.ts`), `/stats` (`apps/hoshiko/src/Commands/SlashCmds/Performance/stats.ts`).
3. **Configuración de Entorno (`.env.production`):**
   - Variables de infraestructura auditadas: `BOT_OWNER_ID`, `TEST_GUILD_ID`, `GUILD_IDS`, `GUILD_ID`, `PORT`, `NODE_ENV`.
4. **Base de Datos MongoDB (`KissDataBase` @ `127.0.0.1:27017`):**
   - Colecciones consultadas: `serverconfigs`, `levelconfigs`, `cases`, `warnings`, `locallevels`, `globalprofiles`, `userhistories`, `presencehistories`, `avatarhistories`, `confessions`, `suggestions`, `dynamic_keywords`.
5. **Monitor del Sistema y V8:**
   - Métricas en vivo del proceso a través de PM2 `axm_monitor`, `/proc/32836/status`, y librerías internas de rendimiento (`apps/hoshiko/src/Security/Performance/PerformanceMonitor.ts`).

---

## 3. Cifras Clave Consolidadas

| Métrica | Valor Verificado | Estado de Verificación |
| :--- | :---: | :--- |
| **Total de Servidores Conectados** | **18** | Confirmado vía Gateway y Discord REST API |
| **Total de Servidores Disponibles** | **18** | 100% de disponibilidad de acceso |
| **Suma Bruta de Miembros** | **2,497** | Sumatoria de `approximate_member_count` |
| **Miembros en Partners Oficiales** | **1,611** | 64.5% del total de la audiencia |
| **Miembros en Servidores de Desarrollo** | **17** | 0.7% del total de la audiencia |
| **Miembros en Otras Comunidades** | **869** | 34.8% del total de la audiencia |
| **Usuarios Únicos con Actividad de Niveles** | **126** | Documentos `userId` en `locallevels` |
| **Usuarios Rastreados en Historiales** | **776** | Usuarios únicos en `presencehistories` |
| **Partners Oficiales Autorizados** | **2** | `Comunidad` y `Rockstar House` |
| **Servidores de Desarrollo / Pruebas** | **4** | Sede, tests, staging e histórico |
| **Servidores con Seguridad Activa en DB** | **15** | Documentos `serverconfigs.securityModules` |
| **Servidores con AutoMod Sincronizado** | **15** | 109 reglas activas en Discord AutoMod |
| **Servidores con Logs Centralizados** | **3** | `Comunidad`, `Rockstar House`, `Hoshiko HQ` |
| **Casos Totales de Moderación Registrados** | **26** | Colección `cases` |
| **Advertencias Totales Registradas** | **25** | Colección `warnings` |
| **Palabras / Keywords Dinámicas** | **127** | Colección `dynamic_keywords` |

---

## 4. Índice de Documentación

- [Ficha Técnica: Comunidad](file:///home/hanna/apps/HannaeX/docs/partners/comunidad.md) — Información completa del Partner 1.
- [Ficha Técnica: Rockstar House](file:///home/hanna/apps/HannaeX/docs/partners/rockstar-house.md) — Información completa del Partner 2.
- [Inventario General de Servidores](file:///home/hanna/apps/HannaeX/docs/partners/servers-inventory.md) — Clasificación de los 18 servidores por categorías de desarrollo, pruebas, partners y otros.
- [Métricas Globales de Hoshiko](file:///home/hanna/apps/HannaeX/docs/partners/metrics.md) — Desglose metrológico para HoshikoWeb con trazabilidad de código y modelos.
