<div align="center">

# 🌸 Hoshiko

**Un bot de Discord con moderación inteligente, interacciones sociales y magia de IA.**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/mongodb-mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## ✨ ¿Qué es Hoshiko?

Hoshiko es un bot de Discord completo con personalidad kawaii, construido en TypeScript sobre Node.js. Combina moderación por puntos, interacciones sociales, un sistema de memes con ranking y respuestas de IA conversacional powered by Google Gemini.

---

## 🚀 Instalación

### Requisitos

- Node.js 20+
- MongoDB (local o Atlas)
- Una aplicación de Discord en el [Developer Portal](https://discord.com/developers/applications)
- API Key de Google Gemini

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/hoshiko.git
cd hoshiko
npm ci
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
TOKEN=                  # Token del bot de Discord
BOT_ID=                 # Application ID del bot
GUILD_ID=               # ID(s) de servidor, separados por coma
PREFIX=                 # Prefijo para comandos legacy (ej: !)
MONGO_URI=              # URI de conexión a MongoDB
GEMINI_API_KEY=         # API Key de Google Gemini
```

> **Nunca subas tu `.env` a un repositorio público.**

### 3. Compilar y desplegar comandos

```bash
# Compilar TypeScript
npm run build

# Registrar slash commands en Discord
npm run deploy
```

### 4. Iniciar el bot

```bash
# Producción
npm start

# Desarrollo (hot reload)
npm run dev
```

---

## 🐳 Docker

```bash
docker build -t hoshiko .
docker run --env-file .env hoshiko
```

---

## 📋 Comandos

### 🛡️ Moderación

| Comando | Descripción |
|---|---|
| `/strike <usuario> [puntos] [razón]` | Añade una advertencia a un usuario |
| `/strikes <usuario> [clear]` | Consulta o limpia el historial de strikes |
| `/config-strikes view` | Muestra la configuración de acciones automáticas |
| `/config-strikes add <puntos> <acción> [duración]` | Añade una regla automática (timeout / kick / ban) |
| `/config-strikes remove <puntos>` | Elimina una regla automática |
| `/config-strikes set-log-channel <canal>` | Define el canal de logs de moderación |
| `/mute <usuario>` | Silencia permanentemente a un usuario |
| `/unmute <usuario>` | Reactiva a un usuario silenciado |
| `/tempmute <usuario> <duración>` | Silencio temporal con desmuteo automático |

### 🐾 Memes

| Comando | Descripción |
|---|---|
| `/setup-memes <canal>` | Configura el canal de memes del servidor |
| `/meme-top` | Muestra el meme más votado del canal configurado |
| `/memes-top` | Top 10 de usuarios por reputación de memes |
| `/mi-reputacion` | Tu meme más votado y tu reputación total |

### 💞 Interacciones

| Comando | Descripción |
|---|---|
| `/hug <usuario>` | Abraza a alguien con respuesta kawaii |
| `/kiss <usuario>` | Beso interactivo con botones |
| `/afk [razón]` | Activa el modo AFK con mensaje personalizado |

### 📚 Información

| Comando | Descripción |
|---|---|
| `/userinfo [usuario]` | Muestra datos completos de un usuario |
| `/avatar [usuario]` | Visualiza el avatar en alta resolución |
| `/serverinfo` | Estadísticas del servidor |
| `/info` | Información del bot y su creador |
| `/ping` | Latencia del bot |
| `/help` | Lista de comandos disponibles |

---

## ⚙️ Sistema de Strikes

Hoshiko incluye un sistema de moderación por puntos. Al añadir strikes con `/strike`, el bot notifica al usuario por DM y registra el moderador responsable y la razón.

Con `/config-strikes add` puedes definir acciones automáticas que se disparan al alcanzar un umbral de puntos:

```
/config-strikes add points:5 action:timeout duration:1h
/config-strikes add points:10 action:kick
/config-strikes add points:15 action:ban
```

---

## 🤖 IA con Gemini

Mencionando al bot en cualquier canal, Hoshiko responderá usando Google Gemini con memoria de las últimas interacciones para mantener coherencia en la conversación.

---

## 📜 Licencia

Proyecto privado. No distribuir sin autorización del autor.

**Creado por [Hoshiko Developer](https://discordapp.com/users/727583213253558373)**
