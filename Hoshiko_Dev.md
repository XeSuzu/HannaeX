# 🌸 Hoshiko — Guía de Desarrollo

## Requisitos previos

- Node.js (recomendado: v18+)
- npm
- MongoDB (URI en `.env.development`)
- Una cuenta en Discord Developer Portal con un bot de pruebas

---

## Correr en local

```bash
# 1. Instalar dependencias (solo la primera vez o si cambiaron)
npm install

# 2. Levantar el bot en modo desarrollo
npm run dev
```

`nodemon` + `ts-node` se encargan de correr `src/index.ts` directamente y reiniciar el bot cada vez que guardas un archivo. No necesitas compilar.

El bot cargará automáticamente `.env.development` porque `NODE_ENV` no está seteado (cae al default `"development"`).

---

## Variables de entorno

El bot carga el archivo `.env.{NODE_ENV}` según el entorno. Nunca usa el `.env` plano — ese sobra y puede borrarse.

| Archivo            | Entorno       | Cuándo se usa           |
| ------------------ | ------------- | ----------------------- |
| `.env.development` | Local         | `npm run dev` en tu PC  |
| `.env.staging`     | VM staging    | `npm run start:staging` |
| `.env.production`  | VM producción | `npm run start:prod`    |

### Variables requeridas

```env
# Bot / Server Core
PORT=8080
TOKEN=                        # Token del bot de Discord
BOT_ID=                       # ID de la aplicación
PREFIX=x
BOT_OWNER_ID=                 # Tu user ID de Discord

# Guild / Deployment
GUILD_ID=                     # ID de tu servidor de pruebas (staging/dev)
GUILD_IDS=                    # Lista de IDs separados por coma

# Base de datos
MONGO_URI=                    # URI de conexión a MongoDB Atlas

# APIs externas
SERPER_API_KEY=               # Google Search (Serper)
GENIUS_API_KEY=               # Letras de canciones
GEMINI_API_KEY=               # Google Gemini AI
GOOGLE_SEARCH_API_KEY=        # Google Search API
SEARCH_ENGINE_ID=             # ID del motor de búsqueda personalizado

# Webhooks de Discord (canales de logs)
SAY_LOGS_WEBHOOK_URL=
LOG_WEBHOOK_COMMANDS=
LOG_WEBHOOK_SYSTEM=
LOG_WEBHOOK_SECURITY=
SUGGESTION_WEBHOOK_URL=
REPORT_WEBHOOK_URL=

# Canales específicos
SUGGESTION_CHANNEL_ID=
REPORT_CHANNEL_ID=
```

---

## Flujo: local → staging → producción

### 1. Desarrollo local

- Trabaja en una rama de features, por ejemplo `feature/nombre-feature`.
- Prueba con `npm run dev` en tu PC.
- Haz commit cuando esté listo.

```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nombre-feature
```

### 2. Merge a main / producción

- Merge la rama a `main` (o la rama que uses para la VM).

```bash
git checkout main
git merge feature/nombre-feature
git push origin main
```

### 3. Actualizar la VM

Desde la VM:

```bash
cd /root/HannaeX
git pull
npm install          # solo si cambiaron dependencias
npm run build        # compila TypeScript → dist/
```

### 4. Deploy con PM2

**Staging:**

```bash
npm run start:staging
# o directamente:
pm2 startOrRestart ecosystem.config.js --only Hoshiko-Staging
```

**Producción:**

```bash
npm run start:prod
# o directamente:
pm2 startOrRestart ecosystem.config.js --only Hoshiko-Production --update-env
```

### 5. Verificar el deploy

```bash
pm2 status                    # ver que el proceso esté "online"
pm2 logs Hoshiko-Production   # revisar errores en tiempo real
pm2 logs Hoshiko-Staging
```

---

## Estructura de carpetas

```
src/
├── index.ts                  # Entry point — carga env, cliente, handlers
├── Interfaces/               # Tipos TypeScript (Command, etc.)
├── Handlers/                 # Loaders de comandos y eventos
│   ├── cmdHandler.ts
│   ├── eventHandler.ts
│   ├── databaseHandler.ts
│   └── Buttons/
├── Commands/
│   ├── SlashCmds/            # Comandos slash organizados por categoría
│   │   ├── Fun/              # ping, snipe, racha, translate...
│   │   ├── Moderation/       # warn, mute, automod, setup-logs...
│   │   ├── Confessions/      # confess, setup-confessions...
│   │   ├── Canvas/           # post-instagram, post-twitter
│   │   ├── Information/      # avatar, userinfo, serverinfo...
│   │   ├── Interactions/     # hug, kiss
│   │   ├── Leaderboards/
│   │   ├── Profiles/
│   │   ├── Setups/
│   │   ├── Utility/
│   │   ├── Afk/
│   │   ├── Love/
│   │   ├── Performance/
│   │   ├── Owner/            # Comandos privados del owner
│   │   └── Privado/
│   └── PrefixCmds/           # Comandos de prefijo (x!)
├── Events/
│   └── Client/               # ready, messageCreate, interactionCreate...
│       └── Guilds/           # guildMemberAdd, logs, antiNuke...
├── Models/                   # Esquemas de Mongoose
├── Database/                 # Managers (cache, settings, premium, IA...)
├── Services/                 # mongo, gemini, streak, snipe, search...
├── Features/                 # Handlers de features (automod, AI, memes...)
├── Security/                 # Logger, monitor, defensa, antiraid...
├── Utils/                    # Helpers (antiCrash, streakTier, logger...)
├── scripts/                  # cronJobs, deploy-commands, checkReply...
├── Tests/                    # Scripts de debug y pruebas
└── assets/                   # Fuentes e imágenes
```

---

## Scripts útiles

| Comando                 | Descripción                                     |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Corre en local con hot-reload                   |
| `npm run build`         | Compila TypeScript → `dist/`                    |
| `npm run deploy:guild`  | Deploy de slash commands al servidor de pruebas |
| `npm run deploy:global` | Deploy de slash commands globalmente            |
| `npm run logs:staging`  | Logs en vivo de staging                         |
| `npm run logs:prod`     | Logs en vivo de producción                      |
| `pm2 status`            | Estado de todos los procesos PM2                |
| `pm2 monit`             | Monitor interactivo de PM2                      |

---

## Notas

- El `.env` plano nunca se carga — el bot siempre busca `.env.{NODE_ENV}`. Puede borrarse.
- El staging **no necesita estar siempre prendido**. Prenderlo solo cuando vayas a probar antes de subir a producción.
- En producción, el bot corre en modo `cluster` con `instances: max` para aprovechar todos los núcleos de la VM.
- En staging corre en modo `fork` (un solo proceso).
