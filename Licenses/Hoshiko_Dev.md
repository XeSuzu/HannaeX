# 🌸 Hoshiko — Guía de Desarrollo

## Requisitos previos

- Node.js 20+
- npm
- MongoDB
- Una aplicación en Discord Developer Portal con un bot de pruebas

---

## Correr en local

```bash
npm install
npm run dev
```

`nodemon` + `ts-node` ejecutan `src/index.ts` directamente y reinician el bot al guardar cambios. No es necesario compilar para desarrollo.

El bot carga `.env.development` cuando `NODE_ENV` no está definido.

---

## Variables de entorno

El bot carga el archivo `.env.${NODE_ENV}` según el entorno. No se usa `.env` plano por defecto.

| Archivo            | Entorno    | Uso                     |
| ------------------ | ---------- | ----------------------- |
| `.env.development` | Local      | `npm run dev`           |
| `.env.staging`     | Staging    | `npm run start:staging` |
| `.env.production`  | Producción | `npm run start:prod`    |

### Variables recomendadas

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
GENIUS_API_KEY=
GOOGLE_SEARCH_API_KEY=
SEARCH_ENGINE_ID=
SERPER_API_KEY=
SAY_LOGS_WEBHOOK_URL=
LOG_WEBHOOK_COMMANDS=
LOG_WEBHOOK_SYSTEM=
LOG_WEBHOOK_SECURITY=
SUGGESTION_WEBHOOK_URL=
REPORT_WEBHOOK_URL=
ERROR_WEBHOOK_URL=
LOGS_WEBHOOK_URL=
BOT_STAFF_IDS=
SUPPORT_SERVER_INVITE=
BANNER_URL=
```

> Mantén las credenciales privadas en cada ambiente. No versionar los archivos `.env.*`.

---

## Flujo de trabajo: local → staging → producción

### 1. Desarrollo local

- Trabaja en una rama de feature.
- Prueba cambios con `npm run dev`.
- Haz commit y push cuando tu feature esté lista.

```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nombre-feature
```

### 2. Merge a main

- Haz merge a `main` cuando la feature esté validada.

```bash
git checkout main
git merge feature/nombre-feature
git push origin main
```

### 3. Actualizar la VM

```bash
cd /root/HannaeX
git pull
npm install # solo si cambiaron dependencias
npm run build
```

### 4. Deploy con PM2

**Staging:**

```bash
npm run start:staging
# o
pm2 startOrRestart ecosystem.config.js --only Hoshiko-Staging
```

**Producción:**

```bash
npm run start:prod
# o
pm2 startOrRestart ecosystem.config.js --only Hoshiko-Production --update-env
```

### 5. Verificar deployment

```bash
pm2 status
pm2 logs Hoshiko-Production
pm2 logs Hoshiko-Staging
```

---

## Scripts útiles

| Comando                 | Descripción                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Ejecuta en modo desarrollo con hot reload    |
| `npm run build`         | Compila TypeScript y copia assets            |
| `npm run deploy:guild`  | Deploy de slash commands a staging           |
| `npm run deploy:global` | Deploy global de slash commands              |
| `npm run start:staging` | Inicia/reinicia staging en PM2               |
| `npm run start:prod`    | Inicia/reinicia producción en PM2            |
| `npm run logs:staging`  | Ver logs de staging                          |
| `npm run logs:prod`     | Ver logs de producción                       |
| `npm run monit`         | Ver monitor de PM2                           |
| `npm run check:reply`   | Ejecuta script de verificación de respuestas |

---

## Estructura de carpetas

```
src/
├── index.ts
├── Interfaces/
├── Handlers/
│   ├── cmdHandler.ts
│   ├── eventHandler.ts
│   ├── databaseHandler.ts
│   └── Buttons/
├── Commands/
│   ├── SlashCmds/
│   └── PrefixCmds/
├── Events/
│   └── Client/
│       └── Guilds/
├── Models/
├── Database/
├── Services/
├── Features/
├── Security/
├── Utils/
├── scripts/
├── Tests/
└── assets/
```

---

## Notas de desarrollo

- El `src/index.ts` inicializa el cliente y arranca un servidor Express de salud.
- El proyecto usa `dotenv` para cargar `.env.${NODE_ENV}`.
- `Hoshiko_Dev.md` es la guía de desarrollo; `README.md` es el overview del proyecto.
- Asegúrate de que las variables de entorno sensibles no se expongan.
