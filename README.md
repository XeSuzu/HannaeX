# 🌸 Hoshiko Discord Bot 🌸

![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v20-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Persistencia-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-Integrado-8E75B2?style=for-the-badge&logo=google&logoColor=white)

¡Bienvenido al mundo de **Hoshiko**! ✨  
Un bot de Discord adorable, profesional y ultra completo, listo para ronronear en tu servidor. Desarrollado en Node.js y TypeScript, Hoshiko combina moderación avanzada, interacción social, utilidades visuales y la magia de la inteligencia artificial Gemini, todo con un toque neko irresistible.

---

## ✨ Características Principales

### 🎮 Comandos Híbridos
- **Slash Commands (`/`)**: Modernos, organizados y fáciles de usar (`/help`, `/avatar`, `/hug`, `/strike`, `/setup-memes`, etc).
- **Prefix Commands (`!`)**: Compatibilidad total con comandos clásicos para los más nostálgicos.

### 🛡️ Moderación Inteligente
- **Gestión de Usuarios**: `/mute`, `/unmute` y `/tempmute` con asignación automática de roles y desmuteo programado.
- **Sistema AFK**: Marca y detecta estados AFK persistentes de los usuarios.
- **Auto-Moderación**: Configura acciones automáticas (timeout, kick, ban) que se activan cuando un usuario alcanza un límite de infracciones.

### 💞 Interacciones Sociales & Multimedia
- **Roleplay**: `/hug`, `/kiss` y más, con botones interactivos, respuestas kawaii y generación visual.
- **Perfil Estético**: Visualiza avatares en HD y obtén información detallada con `/userinfo`.

### 🤖 Inteligencia Artificial (Gemini)
- **Conversación Natural**: Responde a menciones usando la IA de Google Gemini.
- **Memoria de Contexto**: Recuerda las últimas interacciones para mantener respuestas coherentes, divertidas y seguras.

---

## 🐾 Sistemas Exclusivos

### 🎭 El Rincón de los Memes
Un ecosistema completo para los amantes del humor:
- Configura un canal exclusivo con `/setup-memes`.
- Cada meme recibe botones de votación (👍 / 👎) en tiempo real.
- Revisa quién es el rey de la comedia con `/meme-top`, `/memes-top` y `/mi-reputacion`.

### ⚖️ Sistema de Strikes (Advertencias)
Un sistema de moderación basado en puntos, transparente y justo:
- **`/strike`**: Añade advertencias con motivos y puntos personalizados.
- **`/strikes`**: Consulta el historial completo o límpialo si el usuario merece una segunda oportunidad.
- **`/config-strikes`**: (Para Admins) Define reglas automáticas, como silenciar a alguien 1 hora si acumula 3 strikes, y asigna un canal de *ModLogs*.

---

## 🚀 Instalación y Uso Rápido

Para invitar a Hoshiko a tu entorno local y despertarla, necesitas configurar sus variables de entorno. 

Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:

```env
TOKEN=tu_token_de_discord
BOT_ID=id_de_tu_bot
GUILD_ID=id_de_tu_servidor_de_pruebas
PREFIX=!
GEMINI_API_KEY=tu_api_key_de_google_gemini
MONGO_URI=tu_conexion_a_mongodb

🛠️ Documentación Técnica (Para Developers)

¿Eres desarrollador y quieres ver las entrañas de Hoshiko? Revisa cómo compila, la estructura completa de archivos, la configuración de la base de datos y cómo contribuir en nuestra Documentación Técnica de Arquitectura (Añade aquí el enlace a tu archivo docs).
💖 Créditos y Comunidad

    Creador/a: Hoshiko Developer

    Inspiración: La hermosa comunidad de Discord y los desarrolladores de bots open-source.

    Agradecimientos: A todos los que aportan ideas, interactúan con Hoshiko y reportan bugs. ¡Gracias por hacerla crecer!

📜 Licencia

Este proyecto es de uso privado y su código fuente no debe ser distribuido ni replicado sin la autorización expresa del autor original.
