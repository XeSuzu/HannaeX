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
- **Slash**: Modernos, organizados y fáciles de usar (`/help`, `/ping`, `/avatar`, `/userinfo`, `/hug`, `/tempmute`, `/mute`, `/unmute`, `/setup-memes`, `/meme-top`, `/memes-top`, `/mi-reputacion`, etc).
- **Prefijo**: Compatibilidad con comandos clásicos (`!userinfo`, `!ping`...).

### 🛡️ Moderación Inteligente
- **/mute** y **/unmute**: Silencia y reactiva usuarios usando el rol Muted (mute permanente).
- **/tempmute**: Silencia usuarios temporalmente con rol y desmuteo automático.
- **AFK**: Marca y detecta estados AFK persistentes.

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

## 🐾 Créditos y Comunidad

- **Creador/a**: [Hoshiko Developer](https://discordapp.com/users/727583213253558373)
- **Inspiración**: Comunidad Discord y desarrolladores de bots open-source.
- **Agradecimientos**: A todos los que aportan ideas y reportan bugs, ¡gracias por hacer crecer a Hoshiko!

---

## 📜 Licencia

Este proyecto es privado y no debe ser distribuido sin autorización del autor.

---

> *"Nyaa~ Gracias por confiar en mí. ¡Estoy lista para ronronear y ayudarte en tu servidor!"*  
> — **Hoshiko**