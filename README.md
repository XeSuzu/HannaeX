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

| Comando                 | Uso |
| ----------------------- | --- |
| `npm run deploy:dev`    | Deploy de slash commands a desarrollo |
| `npm run deploy:guild`  | Deploy de slash commands a staging |
| `npm run deploy:global` | Deploy global de slash commands |
| `npm run start:staging` | Reinicia staging en PM2 |
| `npm run start:prod`    | Reinicia produccion en PM2 |

---

## Arquitectura del proyecto

El codigo se organiza en modulos claros:

- `src/index.ts` -> arranque, carga de entorno, MongoDB, servidor Express y login de Discord.
- `src/Handlers/` -> carga de comandos y eventos.
- `src/Commands/` -> comandos slash y prefix.
- `src/Services/` -> integraciones con Gemini, MongoDB, busqueda y APIs externas.
- `src/Features/` -> moderacion, IA, memes, automod y mas.
- `src/Security/` -> logger, monitorizacion y manejo de fallos.
- `src/Utils/` -> helpers y utilidades generales.

Para mas detalle operativo, consulta `Hoshiko_Dev.md`.

---

## Seguridad y buenas practicas

- No subas archivos `.env*` al repositorio.
- Protege los secretos en staging y produccion.
- Verifica `NODE_ENV` antes de ejecutar el bot.
- Revisa los logs de PM2 con `npm run logs:staging` o `npm run logs:prod`.
- Mantiene dependencias y permisos de Discord actualizados.

---

## Docker

```bash
docker build -t hoshiko .
docker run --env-file .env.development hoshiko
```

---

## Scripts utiles

| Comando                 | Descripcion |
| ----------------------- | --- |
| `npm run dev`           | Ejecuta en local con hot reload |
| `npm run build`         | Compila TypeScript -> `dist/` |
| `npm run deploy:guild`  | Deploy de comandos en staging |
| `npm run deploy:dev`    | Deploy de comandos en desarrollo |
| `npm run deploy:global` | Deploy global de slash commands |
| `npm run start:staging` | Inicia el proceso PM2 de staging |
| `npm run start:prod`    | Inicia el proceso PM2 de produccion |
| `npm run logs:staging`  | Ver logs de staging |
| `npm run logs:prod`     | Ver logs de produccion |
| `npm run monit`         | Mostrar monitor PM2 |

---

## Licencia

Proyecto privado. No distribuir sin autorizacion del autor.

**Creado por [v.sxn]**
