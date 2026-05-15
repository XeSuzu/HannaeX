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

## Nuevas Features a Implementar

Basado en el analisis del codebase actual, aqui se proponen nuevas funcionalidades para expandir las capacidades de Hoshiko. Estas sugerencias se derivan de los modulos existentes como moderacion, IA, niveles, confesiones, streaks y servicios de busqueda.

### 1. Sistema de Economia

- **Moneda virtual**: Implementar un sistema de puntos/monedas que los usuarios puedan ganar mediante interacciones, niveles o eventos.
- **Tienda**: Permitir comprar items virtuales, roles temporales o beneficios premium.
- **Juegos de azar**: Comandos para apostar monedas en juegos simples (dados, ruleta).
- **Transferencias**: Enviar monedas entre usuarios con confirmacion.

### 2. Integracion Completa de Musica

- **Reproductor de audio**: Expandir el servicio de Lyrics para reproducir musica en canales de voz.
- **Colas de reproduccion**: Gestionar listas de canciones con comandos para agregar, saltar, pausar.
- **Busqueda de musica**: Integrar APIs como YouTube o Spotify para buscar y reproducir tracks.
- **Controles avanzados**: Volumen, efectos de audio, playlists personalizadas.

### 3. Comandos Personalizados por Usuario

- **Creacion de comandos**: Permitir a usuarios premium crear comandos personalizados con respuestas fijas o scripts simples.
- **Gestion de comandos**: Interfaz para editar, eliminar o compartir comandos personalizados.
- **Libreria de comandos**: Compartir comandos populares entre servidores.

### 4. Sistema de Encuestas y Votaciones

- **Encuestas interactivas**: Crear encuestas con opciones multiples, temporizadores y resultados en tiempo real.
- **Votaciones democraticas**: Para decisiones del servidor, como cambios de reglas o elecciones de moderadores.
- **Resultados y estadisticas**: Mostrar graficos de votos usando Canvas (ya integrado).

### 5. Gestion Avanzada de Roles

- **Roles automaticos**: Asignar roles basados en niveles, actividad o eventos.
- **Reacciones de roles**: Mensajes con reacciones para auto-asignar roles.
- **Roles temporales**: Asignar roles con expiracion automatica.
- **Permisos dinamicos**: Ajustar permisos segun el contexto (ej. en eventos).

### 6. Eventos y Sorteos

- **Sorteos automaticos**: Crear sorteos con entradas, ganadores aleatorios y premios.
- **Eventos programados**: Anuncios de eventos futuros, recordatorios y gestion de participantes.
- **Calendario de eventos**: Integrar con calendarios externos o mostrar eventos activos.

### 7. Integraciones Adicionales con APIs

- **Clima y noticias**: Comandos para obtener pronosticos del tiempo o noticias recientes.
- **Traduccion**: Expandir el traductor existente para mas idiomas y deteccion automatica.
- **Imagenes y memes**: Generar memes personalizados o buscar imagenes via APIs.
- **Juegos externos**: Integrar con APIs de juegos como trivia, quiz o puzzles.

### 8. Dashboard Web

- **Panel de administracion**: Interfaz web para gestionar configuraciones del bot sin comandos.
- **Estadisticas en tiempo real**: Ver logs, usuarios activos, comandos usados.
- **Configuracion por servidor**: Ajustar settings via web para moderadores.

### 9. Mejoras en IA y Conversacion

- **Generacion de imagenes**: Usar APIs como DALL-E o Stable Diffusion para crear imagenes basadas en prompts.
- **Reconocimiento de voz**: Integrar voz a texto para comandos o moderacion.
- **Personalizacion de IA**: Permitir usuarios entrenar o personalizar respuestas de Gemini.
- **Modo conversacional avanzado**: Mantener contexto en conversaciones largas.

### 10. Soporte Multi-Idioma y Localizacion

- **Traducciones dinamicas**: Cambiar idioma del bot por servidor o usuario.
- **Comandos localizados**: Mensajes de error y ayuda en diferentes idiomas.
- **Deteccion de idioma**: Automatica para respuestas de IA.

Estas features pueden implementarse gradualmente, priorizando las que mas valor agreguen a la comunidad. Cada una deberia incluir pruebas unitarias y documentacion actualizada.

---

## Licencia

Proyecto privado. No distribuir sin autorizacion del autor.

**Creado por [v.sxn]**
