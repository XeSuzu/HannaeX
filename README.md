<div align="center">

# ✨ HannaeX — Documento Maestro del Ecosistema

**Arquitectura, operaciones, seguridad y guía de desarrollo integral para colaboradores.**

[![Node.js](https://img.shields.io/badge/node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![MongoDB](https://img.shields.io/badge/mongodb-mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Redis](https://img.shields.io/badge/redis-bullmq-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)

> 🔒 **Documento Confidencial de Uso Interno.**  
> Este repositorio contiene el código fuente, la lógica propietaria de inteligencia artificial, la persistencia y la infraestructura de defensa activa de HannaeX. Queda estrictamente prohibida su exposición pública, duplicación externa o la extracción de credenciales fuera de la infraestructura autorizada.

</div>

---

## 🌸 Presentación de Hoshiko

Hola. Si tienes este archivo en pantalla, es porque hemos decidido abrirte la puerta a nuestro entorno de trabajo. Me alegra tenerte aquí.

HannaeX no se construyó como un bot tradicional de Discord ni como un script monolítico improvisado. Es un ecosistema vivo, distribuido y diseñado para procesar miles de interacciones concurrentes con latencia mínima, coherencia en base de datos y tolerancia estricta a fallos. Como verás en el código, cada módulo responde a un propósito claro: desde la calidez y memoria contextual de mis conversaciones, hasta la firmeza matemática de mis algoritmos de moderación y la defensa perimetral de mi centinela de seguridad.

Al ser este un repositorio privado, tenemos la ventaja de documentar todo con absoluta transparencia técnica. Este documento no es un simple resumen: es la **puerta de entrada definitiva y la fuente de verdad técnica** para que comprendas cómo estoy construida, cómo debes configurar tu máquina, cuáles son los estándares innegociables de código y cómo desplegar cambios sin poner en riesgo la producción.

Tómate el tiempo de leerlo con atención. En este proyecto la elegancia técnica y la atención al detalle marcan la diferencia entre un sistema que simplemente funciona y uno verdaderamente excepcional.

— **Hoshi**

---

## 📑 Tabla de Contenidos

1. [Filosofía y Principios de Diseño](#1-filosofía-y-principios-de-diseño)
2. [Arquitectura del Monorepo](#2-arquitectura-del-monorepo)
   - [A. apps/hoshiko (Bot Principal)](#a-appshoshiko-bot-principal)
   - [B. apps/hoshiko-security (Defensa Activa)](#b-appshoshiko-security-defensa-activa)
3. [Pila Tecnológica y Decisiones de Ingeniería](#3-pila-tecnológica-y-decisiones-de-ingeniería)
4. [Requisitos del Sistema](#4-requisitos-del-sistema)
5. [Guía de Puesta en Marcha (Setup Paso a Paso)](#5-guía-de-puesta-en-marcha-setup-paso-a-paso)
6. [Diccionario Exhaustivo de Variables de Entorno](#6-diccionario-exhaustivo-de-variables-de-entorno)
7. [Estándares de Código y Patrones de Arquitectura](#7-estándares-de-código-y-patrones-de-arquitectura)
8. [Flujo de Trabajo Git y Protocolo de Pull Requests](#8-flujo-de-trabajo-git-y-protocolo-de-pull-requests)
9. [Seguridad en Profundidad y Privacidad (GDPR)](#9-seguridad-en-profundidad-y-privacidad-gdpr)
10. [Operaciones, Despliegue en Servidor y PM2](#10-operaciones-despliegue-en-servidor-y-pm2)
11. [Catálogo Completo de Scripts NPM](#11-catálogo-completo-de-scripts-npm)
12. [Estructura Física del Repositorio](#12-estructura-física-del-repositorio)
13. [Referencias y Documentación Complementaria](#13-referencias-y-documentación-complementaria)

---

## 1. Filosofía y Principios de Diseño

El desarrollo en HannaeX se rige por cuatro axiomas inmutables:

1. **Idempotencia y Tolerancia a Fallos:**  
   Las conexiones del Gateway de Discord pueden desconectarse, reintentar eventos o duplicar payloads. Ningún handler debe asumir que un evento ocurre exactamente una vez. Las operaciones críticas en base de datos deben ser atómicas e idempotentes.
2. **Cero Magia Oculta (No Barriles Globales en DB):**  
   Los modelos de datos nunca se exportan en un archivo barril gigante (`index.ts`). Cada dominio (`moderation`, `leveling`, `ai`, etc.) mantiene su aislamiento. Quien requiera un modelo debe importarlo explícitamente desde su ruta canónica.
3. **Respeto Absoluto a la Latencia del Usuario:**  
   Discord exige una respuesta a cualquier interacción en menos de **3 segundos**. Si un cálculo gráfico (Canvas), una consulta compleja o una llamada a la API de Gemini va a demorar más de 500 ms, la interacción **debe diferirse (`deferReply`) de inmediato**.
4. **Defensa en Profundidad:**  
   El bot nunca confía ciegamente en los datos recibidos de Discord. Toda entrada se valida mediante esquemas tipados con **Zod**, los permisos se verifican en el servidor y las operaciones destructivas exigen doble confirmación o auditoría estricta.

---

## 2. Arquitectura del Monorepo

El repositorio está organizado como un **Monorepo gestionado por npm workspaces**. No todo corre bajo el mismo proceso: separamos las responsabilidades cotidianas de la defensa de alta criticidad.

```
HannaeX (Monorepo)
 ├── apps/hoshiko           -> Núcleo comunitario, social, IA y moderación
 └── apps/hoshiko-security  -> Sentinel, Anti-Raid, Anti-Nuke y Honeypots
```

---

### A. [`apps/hoshiko`](apps/hoshiko) (Bot Principal)

Es la aplicación central que convive directamente con los usuarios en los servidores:

* **Asistente de IA Conversacional (Google Gemini):**  
  Implementa una memoria contextual por usuario (`userMemory.model.ts`) y compresión de historial en MongoDB. Gestiona cuotas de interacción, colas FIFO por canal para evitar condiciones de carrera en respuestas continuas y personalidades dinámicas respetando siempre mi identidad base.
* **Moderación Disciplinaria y AutoMod Heurístico:**  
  - **Sistema de Casos Secuenciales:** Cada sanción (`/case`, ban, kick, mute, warn) genera un identificador incremental único por servidor con metadatos completos (moderador, objetivo, motivo, evidencia y duración).
  - **AutoMod Convencional:** Algoritmos de análisis de entropía de texto (detección de strings aleatorios), control de flood con ventana deslizante y filtrado de menciones masivas.
  - **Herramienta `snipe` Ética:** Almacén volátil de mensajes eliminados y editados recientes. Límite estricto de 100 registros por canal con expiración automática garantizada a los 60 minutos y depuración pasiva.
* **Sistema de Niveles y Experiencia O(1):**  
  - Fórmulas de progresión polinomial calculadas matemáticamente en memoria sin requerir consultas acumulativas pesadas.
  - Seguimiento de actividad por texto y voz con control de presencia y detección de ensordecimiento/muteo.
  - Renderizado gráfico de tarjetas de rango (`/rank`, `/vcrank`) utilizando `@napi-rs/canvas`, con soporte tipográfico multi-script y composición glassmorphic.
* **Comunidad, Economía y Vínculos:**  
  Gestión de confesiones anónimas con panel de aprobación de staff, encuestas, parejas (`marry`), sistema de rachas de mensajes (`streaks`) y registro de cambios de avatar y nombres de usuario.
* **Procesamiento en Segundo Plano (Workers & Redis):**  
  Las tareas pesadas (generación masiva de tarjetas, sincronización periódica de estadísticas, limpieza de logs) se delegan a workers (`worker.ts`) coordinados mediante **BullMQ** e **ioredis**.

---

### B. [`apps/hoshiko-security`](apps/hoshiko-security) (Defensa Activa)

Una aplicación completamente desacoplada y autónoma. Posee su propio token de Discord, permisos elevados e infraestructura independiente:

* **Módulo Sentinel:**  
  Red colaborativa de detección de amenazas. Si una cuenta maliciosa o bot atacante es identificado ejecutando patrones de raid en un servidor de la red, Sentinel alerta o bloquea proactivamente su ingreso en los demás servidores protegidos.
* **Anti-Raid Heurístico:**  
  Monitoreo del ratio de uniones por segundo. Si se detecta un pico anómalo, activa cuarentena automática, retiene a los usuarios en un rol de aislamiento y notifica al staff de guardia.
* **Anti-Nuke con Detección de Fuga de Credenciales:**  
  Supervisa las acciones del registro de auditoría (*Audit Log*) de Discord. Si una cuenta de moderador o bot con privilegios comienza a eliminar canales, roles o expulsar miembros de forma masiva en una ventana corta de tiempo, Hoshiko Security revoca inmediatamente sus permisos administrativos y congela el servidor.
* **Canales Honeypot y Modo Lockdown:**  
  Creación de canales invisibles para usuarios reales que actúan como trampa para auto-bots de scraping o spammers; al interactuar con ellos, el atacante es expulsado o baneado en el acto.

---

## 3. Pila Tecnológica y Decisiones de Ingeniería

| Tecnología | Rol en el Sistema | ¿Por qué se eligió? |
| :--- | :--- | :--- |
| **Node.js (20+)** | Runtime | Soporte LTS moderno, rendimiento del motor V8 y compatibilidad con APIs nativas de Fetch y Test Runner. |
| **TypeScript (5.x)** | Lenguaje | Tipado estático en modo estricto (`strict: true`), previniendo errores en tiempo de ejecución en Discord.js. |
| **Discord.js (v14)** | Interacción Gateway | Cliente maduro, soporte completo de API REST v10, componentes interactivos y Slash Commands tipados. |
| **Mongoose (8.x) + MongoDB** | Persistencia | Modelado orientado a documentos idóneo para perfiles, configuraciones dinámicas de servidores y auditorías. |
| **Redis + BullMQ** | Colas y Caché | Descongestiona el bucle de eventos principal (Event Loop) moviendo renderizados y crons a procesos auxiliares. |
| **@napi-rs/canvas** | Renderizado Gráfico | Enlace nativo en Rust con Cairo. Hasta 5x más rápido que node-canvas clásico, sin memory leaks nativos. |
| **Google Gemini API** | Inteligencia Artificial | Modelo de lenguaje natural con ventana de contexto extendida, latencia reducida y excelente seguimiento de rol. |
| **Zod (v4)** | Validación de Esquemas | Asegura que las variables de entorno y los payloads de entrada cumplan la especificación antes de ejecutarse. |
| **PM2** | Gestor de Procesos | Monitoreo en servidor, reinicios automáticos ante fallos y gestión de logs en disco. |

---

## 4. Requisitos del Sistema

Para levantar el entorno local sin inconvenientes, comprueba que tu máquina disponga de:

1. **Sistema Operativo:** Linux (Ubuntu 22.04+ recomendado), macOS o Windows con WSL2.
2. **Node.js:** Versión `>= 20.10.0` (verificable con `node -v`).
3. **MongoDB:** Servicio local en ejecución (`mongodb://127.0.0.1:27017`) o clúster MongoDB Atlas.
4. **Redis Server:** Servicio local activo (`redis-server`, verificable con `redis-cli ping` ➔ `PONG`).
5. **Discord Applications:**
   - 1 Bot para Hoshiko Principal con los Intents privilegiados habilitados (`Server Members`, `Message Content`, `Presence`).
   - 1 Bot para Hoshiko Security con permisos administrativos dedicados.
6. **Paquetes del Sistema para Canvas (si compilas en Linux crudo):**
   ```bash
   sudo apt update && sudo apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev fonts-noto-cjk fonts-noto-color-emoji
   ```

---

## 5. Guía de Puesta en Marcha (Setup Paso a Paso)

Sigue esta secuencia exacta para levantar el ecosistema en tu entorno de pruebas:

### Paso 1: Clonado e instalación limpia

```bash
# Clonar el repositorio mediante SSH o tu método autenticado
git clone git@github.com:XeSuzu/HannaeX.git
cd HannaeX

# Instalar dependencias respetando el package-lock del monorepo
npm ci
```

> **Nota:** Emplea siempre `npm ci` en lugar de `npm install` para respetar las versiones fijadas en `package-lock.json`.

### Paso 2: Configuración de Variables de Entorno

Ambas aplicaciones requieren sus archivos de entorno locales:

#### 1. Configuración de Hoshiko (`.env.development`)
Crea un archivo llamado `.env.development` en la raíz de `HannaeX`:

```env
# ==========================================
# ENTORNO Y RED LOCAL
# ==========================================
NODE_ENV=development
PORT=8080
HEALTH_HOST=127.0.0.1

# ==========================================
# DISCORD: BOT PRINCIPAL (DESARROLLO)
# ==========================================
TOKEN=tu_token_de_discord_para_pruebas
BOT_ID=tu_application_id_para_pruebas
PREFIX=x
DEFAULT_PREFIX=x
BOT_OWNER_ID=tu_discord_user_id

# Servidor exclusivo de pruebas para registrar comandos slash
DEV_GUILD_ID=id_de_tu_servidor_de_pruebas
GUILD_ID=id_de_tu_servidor_de_pruebas

# ==========================================
# BASES DE DATOS & CACHÉ
# ==========================================
MONGO_URI=mongodb://localhost:27017/hoshiko_dev
DATABASE_ENCRYPTION_KEY=clave_secreta_de_32_caracteres_minimo_dev
REDIS_ENABLED=false
REDIS_URL=redis://127.0.0.1:6379
WORKER_ENABLED=false

# ==========================================
# INTELIGENCIA ARTIFICIAL & SERVICIOS
# ==========================================
GEMINI_API_KEY=tu_gemini_api_key
GEMINI_MODERATION_API_KEY=tu_gemini_api_key
SUPPORT_SERVER_INVITE=https://discord.gg/ejemplo
```

#### 2. Configuración de Hoshiko Security (`.env.security`)
Copia la plantilla dentro de la carpeta de la app de seguridad:

```bash
cp apps/hoshiko-security/.env.security.example apps/hoshiko-security/.env.security
```
Edita `apps/hoshiko-security/.env.security` e introduce el token y client ID de tu segundo bot de pruebas.

### Paso 3: Compilación del Monorepo

Antes de ejecutar el bot o desplegar comandos, compila todo el proyecto TypeScript:

```bash
npm run build
```
*Este comando limpia `dist/`, compila `apps/hoshiko`, compila `apps/hoshiko-security`, copia fuentes y assets gráficos, y enlaza el acceso directo `./dist -> apps/hoshiko/dist`.*

### Paso 4: Despliegue de Slash Commands Locales

```bash
npm run deploy:dev
```
> ⚠️ **Atención:** Utiliza **únicamente** `npm run deploy:dev`. Este script registra los comandos instantáneamente en tu servidor de pruebas (`DEV_GUILD_ID`). No utilices `deploy:global` en local, ya que la propagación global de Discord tarda hasta una hora y afectaría a otros entornos.

### Paso 5: Ejecución en Modo Desarrollo

Levanta las aplicaciones que necesites utilizando terminales independientes:

```bash
# Terminal 1: Bot Principal (con hot-reload vía nodemon y ts-node)
npm run dev

# Terminal 2: Bot de Seguridad (opcional, si estás probando Sentinel/Anti-Raid)
npm run dev:security
```

---

## 6. Diccionario Exhaustivo de Variables de Entorno

| Variable | Tipo | Aplicación | Obligatoria | Descripción / Uso Técnico |
| :--- | :---: | :---: | :---: | :--- |
| `NODE_ENV` | Enum | Ambas | **Sí** | Define el ambiente de ejecución: `development`, `staging`, `production` o `test`. |
| `TOKEN` | String | Hoshiko | **Sí** | Token secreto de autenticación de Discord para la app principal. |
| `BOT_ID` | String | Hoshiko | **Sí** | Snowflake ID de la aplicación de Discord del bot principal. |
| `BOT_OWNER_ID` | String | Hoshiko | **Sí** | Snowflake ID del propietario del bot para comandos de administración de emergencia. |
| `MONGO_URI` | String | Ambas | **Sí** | Cadena de conexión a MongoDB. En staging/producción incluye credenciales y authSource. |
| `DATABASE_ENCRYPTION_KEY` | String | Hoshiko | **Sí** | Semilla de cifrado para campos sensibles en reposo almacenados en la base de datos. |
| `PORT` | Number | Hoshiko | No (8080) | Puerto para el servidor interno HTTP de salud (`/health`). |
| `HEALTH_HOST` | String | Hoshiko | No | Host de enlace para el servidor HTTP de salud (`127.0.0.1`). |
| `HEALTH_DETAILS_TOKEN`| String | Hoshiko | No | Token Bearer para autorizar la visualización de métricas detalladas en `/health`. |
| `REDIS_ENABLED` | Boolean | Ambas | No (false) | Activa la conexión con la infraestructura Redis y el uso de colas. |
| `REDIS_URL` | String | Ambas | Condicional| URI de conexión a Redis (obligatoria si `REDIS_ENABLED=true`). |
| `WORKER_ENABLED` | Boolean | Hoshiko | No (false) | Activa los procesos trabajadores de BullMQ para renderizado y tareas en segundo plano. |
| `DEV_GUILD_ID` | String | Hoshiko | Dev | ID del servidor de pruebas donde `deploy:dev` publicará los slash commands. |
| `GUILD_ID` | String | Hoshiko | Staging | ID del servidor de staging utilizado por `deploy:guild`. |
| `GEMINI_API_KEY` | String | Hoshiko | No | Clave de Google AI Studio para el asistente conversacional. |
| `GEMINI_MODERATION_API_KEY`| String | Hoshiko | No | Clave específica para clasificaciones heurísticas de texto por IA. |
| `HOSHIKO_SECURITY_TOKEN` | String | Security | **Sí** (Sec) | Token independiente de Discord exclusivo para Hoshiko Security. |
| `HOSHIKO_SECURITY_CLIENT_ID`| String | Security | **Sí** (Sec) | Client ID exclusivo para Hoshiko Security. |
| `SECURITY_PORT` | Number | Security | No (8082) | Puerto HTTP para chequeos de salud de Hoshiko Security. |

---

## 7. Estándares de Código y Patrones de Arquitectura

Para que el proyecto mantenga su coherencia arquitectónica, sigue estas directrices estrictas:

### 1. Convenciones en Base de Datos (Mongoose)
* **Aislamiento por Dominio:** Los esquemas y modelos residen en `apps/hoshiko/src/Database/<dominio>/`.
* **Prohibición de Barriles:** Está expresamente prohibido crear archivos `index.ts` que reexporten todos los modelos. Esto evita dependencias circulares y registros tardíos en Mongoose.
* **Importación Explícita:**
  ```typescript
  // ✅ Correcto:
  import { CaseModel } from "@/Database/moderation/case.model";
  import { UserMemoryModel } from "@/Database/ai/userMemory.model";

  // ❌ Incorrecto:
  import { CaseModel, UserMemoryModel } from "@/Database";
  ```

### 2. Ciclo de Vida de Interacciones en Discord
* Si una operación toma más de medio segundo (llamada a Gemini, render de Canvas, consulta pesada a Mongo), debes diferir la respuesta inmediatamente:
  ```typescript
  await interaction.deferReply({ ephemeral: isPrivate });
  ```
* Envuelve siempre las llamadas a la API de Discord en bloques `try/catch` estructurados para evitar caídas del proceso por errores de permisos (como intentar mutear a un usuario con jerarquía superior).

### 3. Validación de Entradas con Zod
* Nunca asumas que los datos que vienen del cliente o de un webhook son correctos. Valida la estructura y tipado mediante Zod antes de pasarlos a la capa de servicios o base de datos.

### 4. Responsabilidad Única
* **Handlers:** Solo coordinan y escuchan eventos de Discord.
* **Services / Features:** Alojan la lógica de negocio, validaciones y matemáticas.
* **Database Managers:** Alojan consultas específicas a la base de datos y control de concurrencia.

---

## 8. Flujo de Trabajo Git y Protocolo de Pull Requests

La rama `master` representa el estado funcional en producción. Nadie comitea directamente sobre `master`.

### 1. Creación de ramas de trabajo
Crea ramas locales con nombres semánticos:
```bash
git checkout master
git pull origin master
git checkout -b <tipo>/<descripcion-corta>
```
* **Prefijos permitidos:** `feat/`, `fix/`, `refactor/`, `perf/`, `security/`, `docs/`.  
  *Ejemplo:* `feat/leveling-weekly-reset`, `fix/snipe-cache-leak`.

### 2. Mensajes de Commit (Conventional Commits)
Redacta mensajes claros en minúsculas, especificando el ámbito entre paréntesis:
```bash
git commit -m "feat(ai): integrate token compression for long memory threads"
git commit -m "fix(moderation): correct exponential backoff on repeat warnings"
```

### 3. Verificación Previa Obligatoria (Local)
Antes de empujar tus cambios o abrir un PR, tu código **debe superar estas tres pruebas sin emitir advertencias**:

```bash
# 1. Comprobación estricta de tipos de TypeScript
npx tsc --noEmit

# 2. Compilación completa del Monorepo
npm run build

# 3. Suite de tests unitarios
npm test
```

### 4. Checklist para el Pull Request
Cuando abras el PR hacia la rama `master`, completa la siguiente plantilla en la descripción:

```markdown
### 📝 Resumen del Cambio
- Explica qué añade, soluciona o refactoriza este cambio.

### 🔍 Pruebas Realizadas
- [ ] `npx tsc --noEmit` superado sin errores de tipado.
- [ ] `npm run build` ejecutado y validado.
- [ ] `npm test` ejecutado exitosamente.
- [ ] Probado manualmente en el servidor de desarrollo local.

### 🛡️ Seguridad & Variables
- [ ] Confirmo que ningún archivo `.env*`, token o dato sensible fue añadido.
- [ ] ¿Introduce nuevas variables de entorno?: [Sí / No] (Especificar en caso afirmativo).
```

---

## 9. Seguridad en Profundidad y Privacidad (GDPR)

La confianza de las comunidades que usan a Hoshiko se basa en la custodia rigurosa de sus datos:

1. **Gestión de Secretos:**  
   - Ninguna clave privada o token debe llegar al historial de Git. El archivo `.gitignore` ya excluye `.env*`, pero es tu responsabilidad no forzar commits con banderas `-f`.
   - Si detectas una fuga accidental, comunícalo de inmediato para revocar el token en Discord Developer Portal y generar una nueva clave de base de datos.
2. **Cifrado en Repositorio (`DATABASE_ENCRYPTION_KEY`):**  
   - Los datos de usuario calificados como información privada (memorias de IA, contenido de confesiones anónimas antes de ser aprobadas) se almacenan cifrados.
3. **Derecho al Olvido y Retención:**  
   - Toda funcionalidad que recolecte datos debe respetar el comando `/forget-me` o las solicitudes de borrado según la política descrita en [`licenses/hoshiko/04-Data-Retention-and-Deletion.md`](licenses/hoshiko/04-Data-Retention-and-Deletion.md).
   - Los mensajes eliminados en el módulo `snipe` tienen una vida útil máxima e inmutable de 1 hora. Pasado ese tiempo, los registros se purgan pasiva y activamente.

---

## 10. Operaciones, Despliegue en Servidor y PM2

En el servidor de producción (Ubuntu VM), las aplicaciones corren bajo el gestor de procesos **PM2** con configuraciones definidas en [`ecosystem.config.js`](ecosystem.config.js) y [`ecosystem.security.config.js`](ecosystem.security.config.js).

### Procesos gestionados por PM2

| Nombre del Proceso | Aplicación | Archivo Fuente | Entorno | Rol |
| :--- | :---: | :---: | :---: | :--- |
| `hoshiko-bot` | Hoshiko | `dist/index.js` | `production` | Proceso principal activo de producción. |
| `Hoshiko-Staging` | Hoshiko | `dist/index.js` | `staging` | Instancia de pre-producción para validación. |
| `hoshiko-worker` | Hoshiko | `dist/worker.js`| `production` | Trabajador de colas en segundo plano (BullMQ). |
| `Hoshiko-Security`| Security| `apps/hoshiko-security/dist/index.js` | `production` | Proceso independiente de seguridad y defensa. |

### Consejos Críticos de Despliegue

* **Recarga de Variables con `--update-env`:**  
  Al reiniciar un proceso en producción tras modificar variables de entorno, es obligatorio pasar la bandera `--update-env`. De lo contrario, PM2 reutilizará las variables cacheadas en memoria:
  ```bash
  npm run start:prod
  # Equivalente a: pm2 startOrRestart ecosystem.config.js --only hoshiko-bot --update-env
  ```
* **Despliegue global de comandos slash:**  
  `npm run deploy:global` registra los comandos en la API de Discord de manera global. Recuerda que la propagación global en Discord puede demorar hasta una hora; para pruebas inmediatas, utiliza `deploy:dev` en un servidor específico.
* **Observabilidad y Salud:**  
  - Inspecciona los logs en vivo: `npm run logs:prod` o `npm run logs:security`.
  - Monitorea memoria y CPU: `npm run monit`. El bot tiene configurado un límite seguro de `max_memory_restart: 1G`. Si observas un incremento sostenido de RAM, investiga posibles fugas de memoria en buffers de Canvas o listeners de eventos sin desuscribir.
  - El bot expone un servidor de métricas y salud en el puerto `8080` (endpoint `/health`), protegido mediante `HEALTH_DETAILS_TOKEN`.

---

## 11. Catálogo Completo de Scripts NPM

A continuación tienes la referencia completa de comandos disponibles en la raíz del proyecto:

### Entorno de Desarrollo y Ejecución
- `npm run dev`: Inicia Hoshiko en local con recarga en caliente vía `nodemon` y `ts-node`.
- `npm run dev:security`: Inicia Hoshiko Security en local con recarga en caliente.
- `npm start`: Ejecuta el bot compilado desde `dist/index.js`.
- `npm run start:security`: Ejecuta Hoshiko Security compilado.

### Compilación y Limpieza
- `npm run build`: Pipeline completo de compilación de ambas aplicaciones + enlace de distribución.
- `npm run build:hoshiko`: Compila únicamente la aplicación principal `apps/hoshiko`.
- `npm run build:security`: Compila únicamente la aplicación de seguridad `apps/hoshiko-security`.
- `npm run clean`: Elimina todas las carpetas `dist/` en la raíz y en cada workspace.
- `npm run copy:assets`: Copia tipografías, banners y recursos visuales a las carpetas `dist/`.

### Verificación y Calidad de Código
- `npm test`: Ejecuta los tests unitarios automatizados (`bash scripts/test.sh`).
- `npx tsc --noEmit`: Realiza el chequeo estricto de tipos de TypeScript sin generar archivos.
- `npm run check:reply`: Script de diagnóstico para validar el estado de respuestas e interacciones.

### Despliegue de Comandos de Discord (Slash Commands)
- `npm run deploy:dev`: Registra comandos únicamente en tu servidor de desarrollo (`DEV_GUILD_ID`).
- `npm run deploy:guild`: Registra comandos en el servidor de pruebas de staging (`GUILD_ID`).
- `npm run deploy:global`: Publica los comandos globalmente en Discord (Demora hasta 1 hora en propagar).

### Operaciones con PM2 (Servidor)
- `npm run start:staging`: Inicia o reinicia el proceso `Hoshiko-Staging`.
- `npm run start:prod`: Inicia o reinicia el bot de producción `hoshiko-bot` con `--update-env`.
- `npm run start:security:prod`: Inicia o reinicia `Hoshiko-Security` con `--update-env`.
- `npm run stop:security`: Detiene el bot de seguridad en PM2.
- `npm run stop:all`: Detiene todos los procesos administrados por PM2.
- `npm run logs:prod`: Muestra los logs en vivo del bot de producción.
- `npm run logs:staging`: Muestra los logs en vivo de staging.
- `npm run logs:security`: Muestra los logs en vivo del bot de seguridad.
- `npm run monit`: Abre la consola interactiva de monitorización en tiempo real de PM2.

### Automatización y Utilidades
- `npm run full-deploy:staging`: Pipeline unificado: Build + Deploy Comandos Staging + Reinicio PM2 + Logs.
- `npm run full-deploy:prod`: Pipeline unificado: Build + Deploy Comandos Global + Reinicio PM2 + Logs.
- `npm run generate-licenses`: Genera el manifiesto de licencias de dependencias en `licenses/ATTRIBUTIONS.md`.
- `npm run sync:web-docs`: Sincroniza términos de servicio y políticas públicas con el repositorio web de Hoshiko.

---

## 12. Estructura Física del Repositorio

```text
HannaeX/
├── apps/
│   ├── hoshiko/                             # NÚCLEO PRINCIPAL
│   │   ├── src/
│   │   │   ├── App/                         # Configuración central y esquemas Zod
│   │   │   ├── bootstrap/                   # Inicializadores de ciclo de vida
│   │   │   ├── client/                      # Cliente Discord.js personalizado (HoshikoClient)
│   │   │   ├── Commands/                    # Comandos slash (SlashCmds/) y prefijo (PrefixCmds/)
│   │   │   ├── Database/                    # Modelos y Gestores Mongoose por Dominio
│   │   │   │   ├── ai/                      # Memoria conversacional y perfiles de IA
│   │   │   │   ├── community/               # Confesiones, sugerencias, matrimonios y roles
│   │   │   │   ├── guild/                   # Configuraciones por servidor, caché y premium
│   │   │   │   ├── leveling/                # Niveles de texto y voz, configuraciones O(1)
│   │   │   │   ├── moderation/              # Casos, sanciones, advertencias y registros de snipe
│   │   │   │   ├── streaks/                 # Rachas de actividad comunitaria
│   │   │   │   ├── system/                  # Parámetros del sistema y buffers de escritura
│   │   │   │   └── tracking/                # Historial de avatares, nombres y estados AFK
│   │   │   ├── Events/                      # Listeners de eventos de Discord (idempotentes)
│   │   │   ├── Features/                    # Lógica de negocio (asistente de IA, niveles, AutoMod)
│   │   │   ├── Handlers/                    # Cargadores de comandos, eventos y tareas cron
│   │   │   ├── http/                        # Servidor HTTP para chequeos de salud (/health)
│   │   │   ├── Renderers/                   # Motores gráficos Canvas para tarjetas de perfil y nivel
│   │   │   ├── Services/                    # Integraciones externas (Gemini, Mongo, etc.)
│   │   │   ├── Utils/                       # Utilidades generales y formateadores
│   │   │   ├── index.ts                     # Punto de entrada y orquestador del bot principal
│   │   │   └── worker.ts                    # Trabajador de colas en segundo plano (BullMQ)
│   │   └── package.json                     # Definición de dependencias de Hoshiko
│   │
│   └── hoshiko-security/                    # DEFENSA ACTIVA Y CENTINELA
│       ├── src/
│       │   ├── config/                      # Configuración de seguridad independiente
│       │   ├── modules/                     # Sentinel, Anti-Raid, Anti-Nuke, Lockdown, Honeypots
│       │   └── index.ts                     # Punto de entrada de Hoshiko Security
│       ├── .env.security.example            # Plantilla de variables para seguridad
│       └── package.json                     # Definición de dependencias de Hoshiko Security
│
├── docs/                                    # Documentación técnica, arquitecturas y auditorías
│   ├── architecture/                        # Planos y especificaciones de logs y eventos
│   ├── audits/                              # Reportes de auditoría de seguridad y monorepo
│   └── development/                         # Guías de desarrollo en profundidad
├── licenses/                                # Términos de servicio, privacidad y licencias
├── scripts/                                 # Scripts de testing y utilidades operativas
├── tests/                                   # Batería de pruebas unitarias
├── ecosystem.config.js                      # Configuración de despliegue PM2 para Hoshiko
├── ecosystem.security.config.js             # Configuración de despliegue PM2 para Hoshiko Security
├── package.json                             # Configuración raíz del Monorepo (Workspaces)
└── tsconfig.json                            # Configuración global del compilador TypeScript
```

---

## 13. Referencias y Documentación Complementaria

Para profundizar en áreas específicas del proyecto, consulta los documentos especializados:

* **Estándares y Directrices para Agentes de Código:** [`AGENTS.md`](AGENTS.md)
* **Guía Operativa de Desarrollo de Hoshiko:** [`docs/development/Hoshiko_Dev.md`](docs/development/Hoshiko_Dev.md)
* **Especificación Oficial de Logs y Auditoría:** [`docs/architecture/hoshiko-logs-specification.md`](docs/architecture/hoshiko-logs-specification.md)
* **Reporte de Migración a Monorepo:** [`docs/audits/MONOREPO_MIGRATION_REPORT.md`](docs/audits/MONOREPO_MIGRATION_REPORT.md)
* **Términos de Servicio y Privacidad:** [`licenses/public/`](licenses/public/)

---

<div align="center">

*Cuidemos cada línea de código con el mismo rigor y cariño con el que construimos esta comunidad.*  
**Hoshiko Team** — Confidencial & Privado

</div>
