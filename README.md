<div align="center">

# Hoshiko

**Un bot de Discord con moderacion inteligente, interacciones sociales y magia de IA.**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/mongodb-mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## Que es Hoshiko?

Hoshiko es un bot de Discord construido en TypeScript y Node.js. Combina moderacion por puntos, interacciones sociales, soporte de memes, comandos prefix y respuesta de IA conversacional con Google Gemini.

---

## Instalacion rapida

### Requisitos

- Node.js 20+
- MongoDB (local o Atlas)
- Una aplicacion en Discord Developer Portal
- API Key de Google Gemini

### 1. Clonar el repositorio

```bash
git clone https://github.com/XeSuzu/HannaeX.git
cd HannaeX
npm ci
```

### 2. Configurar variables de entorno

El proyecto carga variables desde `.env.${NODE_ENV}`.

- `.env.development` -> desarrollo
- `.env.staging` -> staging
- `.env.production` -> produccion

Si `NODE_ENV` no esta definido, el bot usa `development`.

Ejemplo minimo para `.env.development`:

```env
PORT=8080
TOKEN=
BOT_ID=
BOT_OWNER_ID=
PREFIX=x
DEFAULT_PREFIX=x
GUILD_ID=
GUILD_IDS=
MONGO_URI=
GEMINI_API_KEY=
```

> Nunca subas archivos de entorno a un repositorio publico.

### 3. Compilar y desplegar comandos

```bash
npm run build
npm run deploy:dev
npm run deploy:guild
npm run deploy:global
```

### 4. Ejecutar

```bash
npm start
npm run dev
```

- `npm start` ejecuta `dist/index.js`.
- `npm run dev` ejecuta `src/index.ts` con `nodemon` y `ts-node`.

---

## Variables de entorno importantes

Estas variables son usadas directamente por el codigo y las integraciones del bot:

- `PORT`
- `TOKEN`
- `BOT_ID`
- `BOT_OWNER_ID`
- `PREFIX`
- `DEFAULT_PREFIX`
- `GUILD_ID`
- `GUILD_IDS`
- `MONGO_URI`
- `GEMINI_API_KEY`
- `GENIUS_API_KEY`
- `GOOGLE_SEARCH_API_KEY`
- `SEARCH_ENGINE_ID`
- `SERPER_API_KEY`
- `SAY_LOGS_WEBHOOK_URL`
- `LOG_WEBHOOK_COMMANDS`
- `LOG_WEBHOOK_SYSTEM`
- `LOG_WEBHOOK_SECURITY`
- `SUGGESTION_WEBHOOK_URL`
- `REPORT_WEBHOOK_URL`
- `ERROR_WEBHOOK_URL`
- `LOGS_WEBHOOK_URL`
- `BOT_STAFF_IDS`
- `SUPPORT_SERVER_INVITE`
- `BANNER_URL`

> Algunos valores son opcionales segun las funcionalidades que uses.

---

## Estado de la funcionalidad `snipe`

La implementación de `snipe` está completa y estable para el uso actual.

### Qué se completó

- Actualizado el límite a `100` entradas por canal.
- Centralizada la lógica en `src/Services/SnipeService.ts`.
- Eliminado el código duplicado del handler de `messageDelete`.
- `getSnipeEntry(channelId, position)` limpia snipes expirados y devuelve solo datos válidos.
- `buildSnipeEmbed(...)` genera embeds consistentes y gestiona contenido largo o imágenes.
- El comando slash y el comando de texto usan la misma lógica y mensajes.

### Reglas actuales

- Máximo `100` snipes por canal.
- Cada snipe expira después de `1 hora`.
- Los snipes expirados se limpian automáticamente al consultarlos.

### Archivos clave

- `src/Services/SnipeService.ts`
- `src/Utils/snipe.ts`
- `src/Commands/SlashCmds/Fun/snipe.ts`
- `src/Events/Client/messageCreate.ts`
- `src/Events/Client/Guilds/messageDelete.ts`

> No es necesario tocar esta funcionalidad por ahora, a menos que se necesite un cambio o mejora específica.

## Deployment y entornos

Para un proyecto privado y global, el repositorio distingue tres ambientes:

- `development` -> `.env.development`
- `staging` -> `.env.staging`
- `production` -> `.env.production`

Cada ambiente debe tener sus propios secretos y configuraciones.

### Flujo recomendado

1. Desarrolla en una rama de feature local.
2. Prueba cambios en `development` con `npm run dev`.
3. Despliega a `staging` y valida antes de produccion.
4. Actualiza produccion con `npm run start:prod`.

### Comandos de despliegue

| Comando                 | Uso                                   |
| ----------------------- | ------------------------------------- |
| `npm run deploy:dev`    | Deploy de slash commands a desarrollo |
| `npm run deploy:guild`  | Deploy de slash commands a staging    |
| `npm run deploy:global` | Deploy global de slash commands       |
| `npm run start:staging` | Reinicia staging en PM2               |
| `npm run start:prod`    | Reinicia produccion en PM2            |

---

## Arquitectura del Monorepo

El repositorio organiza dos aplicaciones independientes bajo npm workspaces:

- **[`apps/hoshiko`](apps/hoshiko):** Bot principal de Discord que gestiona Community Management, AutoMod convencional, moderación disciplinaria, filtros, niveles y experiencia (texto y voz con tarjetas personalizables en Canvas), interacciones y asistente de IA conversacional.
  - `src/index.ts`: Arranque y coordinación general.
  - `src/Commands/`: Comandos slash (`SlashCmds/`) y de prefijo (`PrefixCmds/`).
  - `src/Events/`: Listeners de eventos de Discord con control de concurrencia e idempotencia.
  - `src/Database/`: Persistencia Mongoose modularizada por dominios (`ai/`, `community/`, `guild/`, `leveling/`, `moderation/`, `streaks/`, `system/`, `tracking/`).
  - `src/Features/`: Lógica de negocio (asistente de IA, niveles, AutoMod, rachas).
  - `src/Renderers/` y `src/Utils/levelBanners/`: Motor gráfico con `@napi-rs/canvas` y tipografías multi-script.

- **[`apps/hoshiko-security`](apps/hoshiko-security):** Aplicación especializada e independiente enfocada en la defensa activa del servidor:
  - `src/index.ts`: Punto de entrada del bot de seguridad.
  - `src/modules/`: Sentinel (red de amenazas global), Anti-Raid, Anti-Nuke, Lockdown y Honeypot.

Para más detalle operativo y guías de arquitectura, consulta la carpeta [`docs/`](docs/) y especialmente [`docs/development/Hoshiko_Dev.md`](docs/development/Hoshiko_Dev.md).

---

## Seguridad y buenas practicas

- No subas archivos `.env*` al repositorio.
- Protege los secretos en staging y produccion.
- Verifica `NODE_ENV` antes de ejecutar el bot.
- Revisa los logs de PM2 con `npm run logs:staging` o `npm run logs:prod`.
- Mantiene dependencias y permisos de Discord actualizados.

---

## Scripts utiles

| Comando                 | Descripcion                         |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | Ejecuta en local con hot reload     |
| `npm run build`         | Compila TypeScript -> `dist/`       |
| `npm run deploy:guild`  | Deploy de comandos en staging       |
| `npm run deploy:dev`    | Deploy de comandos en desarrollo    |
| `npm run deploy:global` | Deploy global de slash commands     |
| `npm run start:staging` | Inicia el proceso PM2 de staging    |
| `npm run start:prod`    | Inicia el proceso PM2 de produccion |
| `npm run logs:staging`  | Ver logs de staging                 |
| `npm run logs:prod`     | Ver logs de produccion              |
| `npm run monit`         | Mostrar monitor PM2                 |

---

## Módulos Principales de Hoshiko

Hoshiko ofrece un ecosistema integral y modular para comunidades de Discord:

### 1. Moderación y AutoMod Heurístico
- **AutoMod convencional**: Detección de spam, flood, menciones masivas y análisis de entropía de texto.
- **Acciones disciplinarias**: Sistema de casos secuenciales (`/case`), advertencias, silenciamientos temporales con reintentos exponenciales y auditoría detallada.
- **Herramienta Snipe**: Recuperación ética de mensajes eliminados recientes con control de privacidad y consentimiento.

### 2. Asistente Conversacional e IA
- **Identidad nativa**: Respuestas cálidas, naturales, reflexivas y coherentes impulsadas por Google Gemini.
- **Memoria de usuario**: Recordación de preferencias e historial sin romper el aislamiento por servidor.
- **Sesiones privadas y control de cuotas**: Gestión de límites por servidor con compresión de temas y colas FIFO por canal.

### 3. Niveles y Experiencia (XP de Texto y Voz)
- **Fórmulas matemáticas O(1)**: Cálculo instantáneo y atómico sin sobrecargar la base de datos.
- **Tarjetas gráficas con Canvas**: Renderizado glassmorphic de `/rank` y `/vcrank` con anillos dinámicos según el podio.
- **Personalización por servidor**: Ajuste de temas, imagen de fondo propia (`object-fit: cover`) y textos editables con Live Preview en `/setup-levels card`.
- **Leaderboards unificados**: Alternancia interactiva entre Texto, Voz y Semanal con temporizador relativo de reset.

### 4. Funciones Sociales y Comunidad
- **Confesiones y Sugerencias**: Publicaciones anónimas o públicas con aprobación y tarjetas renderizadas.
- **Rachas de actividad**: Seguimiento de compromiso continuo en canales designados.
- **Interacciones expresivas**: Abrazos, besos y tarjetas sociales interactivas.

---

## Marco Legal, Privacidad y Términos de Servicio

La documentación legal, de privacidad, tratamiento de datos y licenciamiento del proyecto se encuentra centralizada exclusivamente bajo [`licenses/`](licenses/):

- **Documentos Públicos Oficiales:**
  - [Términos de Servicio (`licenses/public/TERMS_OF_SERVICE.md`)](licenses/public/TERMS_OF_SERVICE.md)
  - [Política de Privacidad (`licenses/public/PRIVACY_POLICY.md`)](licenses/public/PRIVACY_POLICY.md)
- **Licenciamiento y Dependencias:**
  - [Licencia Propietaria del Proyecto (`licenses/LICENSE`)](licenses/LICENSE)
  - [Resumen de Licencias de Terceros (`licenses/THIRD_PARTY_LICENSES.md`)](licenses/THIRD_PARTY_LICENSES.md)
  - [Manifiesto de Atribuciones (`licenses/ATTRIBUTIONS.md`)](licenses/ATTRIBUTIONS.md)
- **Expedientes Internos de Auditoría Técnica:**
  - Hoshiko Principal: [`licenses/hoshiko/`](licenses/hoshiko/)
  - Hoshiko Security: [`licenses/hoshiko-security/`](licenses/hoshiko-security/)

---

## Licencia y Atribuciones

Proyecto privado. Todos los derechos reservados. Consulte [`licenses/LICENSE`](licenses/LICENSE) y [`licenses/ATTRIBUTIONS.md`](licenses/ATTRIBUTIONS.md).

**Creado por [v.sxn]**
