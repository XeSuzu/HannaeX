# 🌸 Hoshiko Discord Bot - Manual Técnico y Kawaii 🌸

¡Bienvenido al mundo de **Hoshiko**!  
Un bot de Discord adorable, profesional y ultra completo, listo para ronronear en tu servidor.  
Desarrollado en Node.js, Hoshiko combina moderación, interacción social, utilidades informativas y la magia de la inteligencia artificial Gemini, todo con un toque neko irresistible.  

---

## ✨ Estructura del Proyecto

```
/HannaeX
│
├── Commands/                # Comandos organizados por tipo
│   ├── SlashCmds/           # Comandos de barra (slash commands)
│   │   ├── Afk/
│   │   ├── Fun/
│   │   ├── Information/
│   │   ├── Interactions/
│   │   ├── Moderation/
│   │   ├── Profiles/
│   │   └── Leaderboards/
│   └── PrefixCmds/          # Comandos clásicos con prefijo
│
├── Database/                # Persistencia y lógica de datos (memes, conversación IA, etc)
├── Events/                  # Eventos de Discord (Client, Guild, etc)
│   └── Client/
├── Handlers/                # Cargadores automáticos de comandos/eventos
├── Models/                  # Modelos de datos para MongoDB (memes, AFK, configuración, etc)
├── Services/                # Integraciones externas (ej: Gemini AI)
├── .env                     # Variables de entorno (¡no subir!)
├── index.js                 # Punto de entrada principal
└── README.md                # Este archivo tan bonito
```

---

## 🛠️ Tecnologías y Dependencias

- **Node.js**: Motor principal, rápido y eficiente.
- **discord.js**: API moderna para bots de Discord.
- **mongoose**: ODM para MongoDB, ideal para datos persistentes (AFK, memes, historial...).
- **@google/generative-ai**: Conexión con Google Gemini para IA conversacional.
- **dotenv**: Gestión segura de variables de entorno.

---

## 🌟 Características Destacadas

### 🎮 Comandos Slash y Prefijo
- **Slash**: Modernos, organizados y fáciles de usar (`/help`, `/ping`, `/avatar`, `/userinfo`, `/hug`, `/tempmute`, `/mute`, `/unmute`, `/strike`, `/strikes`, `/config-strikes`, `/setup-memes`, `/meme-top`, `/memes-top`, `/mi-reputacion`, etc).
- **Prefijo**: Compatibilidad con comandos clásicos (`!userinfo`, `!ping`...).

### 🛡️ Moderación Inteligente
- **/mute** y **/unmute**: Silencia y reactiva usuarios usando el rol Muted (mute permanente).
- **/tempmute**: Silencia usuarios temporalmente con rol y desmuteo automático.
- **AFK**: Marca y detecta estados AFK persistentes.
- **/strike** y **/strikes**: Sistema de advertencias por puntos. Añade, consulta y limpia el historial de strikes de un usuario.
- **Acciones Automáticas**: Configura acciones automáticas (timeout, kick, ban) que se activan cuando un usuario alcanza un número de puntos de strike.

### 💞 Interacciones Sociales
- **/hug**, **/kiss**: Abrazos y besos interactivos, con botones y respuestas kawaii.
- **Memes**: Canal especial para memes, con sistema de votos y ranking.

### 📚 Utilidades Informativas
- **/userinfo** y `!userinfo`: Muestra datos completos de usuarios, roles y permisos.
- **/avatar**: Visualiza avatares en HD.
- **/info**: Estadísticas del bot, sistema y su creador.

### 🤖 Inteligencia Artificial Gemini
- **Responde a menciones**: Usa IA de Google Gemini, recordando contexto y manteniendo seguridad.
- **Historial**: Recuerda las últimas interacciones para respuestas coherentes y naturales.

### ⚙️ Sistema de Handlers Modular
- **Carga automática** de comandos y eventos, ideal para crecer y mantener el código limpio.

### 🗄️ Base de Datos MongoDB
- **Persistencia**: Estados AFK, configuración de servidores, memes y conversaciones IA.

---

## 🚀 ¿Cómo funciona Hoshiko?

1. **Inicialización**: `index.js` valida variables, conecta a MongoDB y carga handlers/eventos.
2. **Carga dinámica**: Los handlers recorren carpetas y registran comandos/eventos automáticamente.
3. **Interacción**: El bot responde a slash, prefijo y menciones, gestionando permisos y contexto.
4. **Persistencia**: Los modelos de Mongoose almacenan datos para funcionalidades persistentes.

---

## ⚡ Variables de Entorno

Crea un archivo `.env` con:

```
TOKEN=             # Token del bot de Discord
BOT_ID=            # ID del bot
GUILD_ID=          # IDs de servidores separados por coma
PREFIX=            # Prefijo para comandos tradicionales
GEMINI_API_KEY=    # API Key de Google Gemini
MONGO_URI=         # URI de conexión a MongoDB
```

---

## 🧩 Extensibilidad y Buenas Prácticas

- **Agregar comandos**: Crea un archivo JS en la categoría adecuada bajo `Commands/SlashCmds/` o `Commands/PrefixCmds/`.
- **Agregar eventos**: Añade archivos en `Events/Client/` y se cargarán automáticamente.
- **Nuevos modelos**: Define en `Models/` y úsalo donde lo necesites.
- **Seguridad**: El bot valida permisos antes de ejecutar acciones sensibles y filtra respuestas de IA para evitar contenido inapropiado.
- **Handlers robustos**: Previenen la carga de archivos mal estructurados.

---

## 🐾 Sistema de Memes

- **Configuración:** Usa `/setup-memes` para definir el canal de memes por servidor.
- **Guardado:** Los memes se guardan con información de autor, canal, puntos y URL.
- **Votación:** Cada reacción 👍 o 👎 suma o resta puntos al meme en tiempo real.
- **Ranking:**  
  - `/meme-top`: Muestra el meme más votado del canal configurado.
  - `/memes-top`: Muestra el top 10 de usuarios por reputación de memes.
  - `/mi-reputacion`: Muestra tu meme más votado y tu reputación total.
- **Migración:** Incluye script para migrar memes antiguos sin campo `channelId`.

---

## 🐾 Sistema de Strikes

Hoshiko incluye un sistema de moderación basado en puntos para gestionar el comportamiento de los usuarios de forma gradual y transparente.

- **Añadir Strikes**: Usa `/strike` para añadir una advertencia a un usuario.
    - Puedes especificar la cantidad de **puntos** (por defecto 1).
    - Puedes añadir una **razón** para documentar la infracción.
    - El moderador que aplica el strike queda registrado.
- **Consultar Historial**: Usa `/strikes` para ver el historial completo de un usuario.
    - Muestra un resumen con los puntos totales y cada strike individual (razón, moderador, fecha).
    - Si un usuario está limpio, ¡el bot lo celebra!
- **Limpiar Strikes**: Con el comando `/strikes` y la opción `clear:True`, los moderadores pueden borrar todo el historial de strikes de un usuario, dándole un nuevo comienzo.
- **Notificación al Usuario**: Al recibir un strike, Hoshiko intenta enviar un mensaje directo al usuario afectado, informándole de la sanción, la razón y sus puntos totales.

### ⚙️ Configuración de Acciones Automáticas

Hoshiko permite a los administradores de cada servidor definir sus propias reglas de moderación automática basadas en los puntos de strike. ¡Totalmente personalizable!

Usa el comando `/config-strikes` (requiere permiso de `Gestionar Servidor`):

- **/config-strikes view**: Muestra la configuración actual, incluyendo el canal de logs y todas las reglas automáticas.
- **/config-strikes add**: Añade una nueva regla.
    - `points`: El número de puntos que activará la acción.
    - `action`: Elige entre `timeout` (silencio), `kick` (expulsión) o `ban` (baneo).
    - `duration`: Si la acción es `timeout`, especifica la duración (ej: `10m`, `1h`, `7d`).
- **/config-strikes remove**: Elimina una regla existente especificando sus puntos.
- **/config-strikes set-log-channel**: Define un canal de texto donde Hoshiko anunciará las acciones automáticas que realice.

**Ejemplo de uso:** `/config-strikes add points:10 action:timeout duration:1h`

---

## 🐾 Créditos y Comunidad

- **Creador/a**: [Hoshiko Developer](https://discordapp.com/users/727583213253558373)
- **Inspiración**: Comunidad Discord y desarrolladores de bots open-source.
- **Agradecimientos**: A todos los que aportan ideas y reportan bugs, ¡gracias por hacer crecer a Hoshiko!

---

## 📜 Licencia

Este proyecto es privado y no debe ser distribuido sin autorización del autor.

---

# Hoshiko — Documentación Técnica (Resumen del codebase)

Resumen rápido
- Proyecto: Hoshiko (alias HannaeX) — Bot de Discord en TypeScript/Node.js.
- Propósito: moderación, social, IA (Gemini), multimedia, utilities.
- Estructura principal: código en `src/`, build a `dist/`, despliegue con `npm run build` y `node dist/index.js` o Docker.

Árbol de archivos (resumen, solo .ts/.js relevantes)
- package.json
- tsconfig.json
- Dockerfile
- README.md
- src/
  - index.ts
  - Handlers/
    - cmdHandler.ts
    - eventHandler.ts
    - databaseHandler.ts
  - Events/
    - Client/
      - interactionCreate.ts
      - messageCreate.ts
      - ready.ts
      - Guilds/
        - guildCreate.ts
  - Commands/
    - SlashCmds/
      - Afk/
        - afk.ts
      - Fun/
        - ping.ts
        - say.ts
        - help.ts
      - Interactions/
        - hug.ts
        - kiss.ts
      - Information/
        - avatar.ts
        - info-creator.ts
        - report.ts
        - serverinfo.ts
        - sugerencia.ts
      - Moderation/
        - strike.ts
        - strikes.ts
        - modconfig.ts
        - setup.ts
        - tempmute.js
      - Profiles/
        - listar-servers.ts
        - mi-reputacion (meme-profile.js)
      - Performance/
        - stats.ts
      - Privado/
        - ver-sugerencias.js
    - PrefixCmds/
      - (cmds legacy, cargadas por cmdHandler)
  - Database/
    - conversation.ts
    - strike.ts
    - serverSettings.ts
    - (otros modelos: meme, suggestion, GuildConfig, AFK, etc.)
    - Services for DB access: SettingsManager, IAConfigManager, PremiumManager
  - Services/
    - gemini.ts
    - strikeActions.ts
    - search.ts
    - mongo.ts
    - gemini integration / stream helpers
  - Features/
    - aiHandler.ts
    - memeHandler.ts
    - afkHandler.ts
    - (otros features)
  - Security/
    - index.ts
    - Logger/
      - HoshikoLogger.ts
      - LocalStorage.ts
    - Defense/
      - Blacklist.ts
      - RateLimiter.ts
      - Sanitizer.ts
    - Performance/
      - PerformanceMonitor.ts
  - Models/
    - (Mongoose models: meme, suggestion, guild config, afk, etc.)
  - Scripts/
    - deploy-commands.ts
  - Tests/
    - test-gemini.js

Dependencias (package.json)
- runtime:
  - discord.js ^14.23.2
  - discord-player ^7.1.0
  - @discord-player/extractor, @discord-player/opus, @discordjs/opus
  - @google/generative-ai ^0.24.1
  - axios, express, mongoose, mongodb, genius-lyrics, play-dl, ytdl-core, ffmpeg-static
  - dotenv
- dev:
  - typescript, ts-node, nodemon, @types/express, @types/node, rimraf, copyfiles

Scripts principales (package.json)
- dev: nodemon --exec ts-node src/index.ts
- build: rimraf dist && tsc
- start: node dist/index.js
- deploy: ts-node --transpile-only src/scripts/deploy-commands.ts
- copy:assets postbuild para mover recursos a dist

TypeScript & build
- tsconfig.json: rootDir: src, outDir: dist, strict: true, forceConsistentCasingInFileNames: true
- Produce .js en dist/ para despliegue; handlers cargan desde src en dev (ts-node) o desde dist en prod.

Variables de entorno relevantes
- TOKEN: Discord bot token
- BOT_ID: Application ID
- GUILD_ID / GUILD_IDS: Guild(s) para deploy o testing
- PREFIX: prefijo de comandos (legacy)
- MONGO_URI: conexión MongoDB
- GEMINI_API_KEY: API Key para Gemini
- GOOGLE_SEARCH_API_KEY / SEARCH_ENGINE_ID: para búsqueda (search service)
- STRIKE_* (opcional): STRIKE_MUTE_THRESHOLD, STRIKE_BAN_THRESHOLD, STRIKE_MUTE_DURATION_MS, STRIKE_MODLOG_CHANNEL_ID
- BOT_OWNER_ID: owner-only commands
- LOGS_WEBHOOK_URL: webhook para logs del HoshikoLogger

Despliegue
- Local / staging:
  1. npm ci
  2. npm run build
  3. node dist/index.js
- Docker:
  - Dockerfile presente (node:20-alpine). Build copia código y ejecuta npm run build y npm start.
- Slash commands: usar `src/scripts/deploy-commands.ts` (deploy) para sincronizar comandos por guild o global.

Puntos técnicos y consideraciones
- Carga dinámica de comandos/ eventos:
  - cmdHandler y eventHandler hacen require() dinámico; en dev usan .ts, en prod .js.
  - Asegurarse de ejecutar `npm run build` antes de deploy para tener `dist/Commands/SlashCmds/...`.
- Seguridad:
  - Sistema Blacklist y RateLimiter implementados (en memoria por defecto; se recomienda Redis para producción).
  - HoshikoLogger guarda localmente y puede enviar a webhook (LOGS_WEBHOOK_URL).
- IA:
  - Integración con Gemini en Services/gemini.ts. Usa streaming; manejo de safety y timeout.
  - Historia de conversación almacenada en Mongo (conversation.ts) con TTL index.
- Moderation:
  - Sistema de strikes (Database/strike.ts), comandos /strike y /strikes, actions automáticas (Services/strikeActions.ts) y settings por servidor (Database/serverSettings.ts).
  - Comando /modconfig y /setup permiten configurar thresholds y modlog channel por servidor.
- Tests:
  - Tests de integración simples (src/Tests/test-gemini.js) — manual.
- Logs & monitoring:
  - PerformanceMonitor (Security/Performance) devuelve ram/cpu/uptime info; usar para /stats.
  - LocalStorage guarda logs en `logs/hoshiko-logs.jsonl`.

Recomendaciones operativas
- Antes de desplegar:
  - Establecer MONGO_URI y GEMINI_API_KEY en env.
  - Ejecutar `npm run build` y revisar `dist/Commands` para confirmar compilación.
  - Ejecutar script deploy para sincronizar slash commands en guilds.
- Producción:
  - Usar PM2 / systemd / container para restart y logs.
  - Configurar backups DB y rotación de logs.
  - Considerar Redis para RateLimiter y blacklist persistente.
- Seguridad:
  - Revisar permisos del bot (ManageRoles, ModerateMembers) en servidores para funciones de moderación.
  - Mantener `forceConsistentCasingInFileNames` activo para evitar errores por casing.

Contacto / Mantenimiento
- Para cambios en comandos o modelo de datos: añadir pruebas y desplegar en servidor de staging antes de producción.
- Para funciones premium (IA frecuencia, features): controlar acceso vía `PremiumManager`.

Fin del resumen técnico — si quieres, genero:
- un README más corto para usuarios finales;
- un documento técnico separado con diagramas (archivos/DB/flows);
- o actualizo automáticamente README.md en repo con este contenido.