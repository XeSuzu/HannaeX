# ACCIONES REQUERIDAS DE INTERVENCIÓN HUMANA - CHECKLIST PARA AMY (RONDA 2)

Este checklist contiene las decisiones operativas, de seguridad y de negocio que **no pueden ni deben resolverse de forma automatizada por un agente**, requiriendo la acción directa de la responsable del proyecto (Amy / XeSuzu).

---

## 🚨 1. Seguridad Crítica Inmediata (Top Prioridad)

- [ ] **Rotación de Credenciales Reales de MongoDB (`[SEC-02]`):**
  - **Evidencia confirmada:** En el commit `f71c79295e8f1ca585f36ff7849fb98626f21558:migrar-meme.js:6` se expuso una cadena de conexión `mongodb+srv://` real con el usuario `AmyXs` y una contraseña alfanumérica de 16 caracteres hacia MongoDB Atlas (`kissdatabase.apzliex.mongodb.net`), **no un placeholder**.
  - **Acción:** Ingresar inmediatamente a MongoDB Atlas, cambiar la contraseña del usuario de base de datos, actualizarla en el `.env.production` local del servidor y reiniciar el bot.
- [ ] **Gestión y Cifrado de Volcados en `backups/` (`[SEC-01]`):**
  - **Evidencia confirmada:** La carpeta `backups/production-KissDataBase-2026-10-17T02-05-51-440Z/` contiene 11.8 MB de datos personales reales sin cifrar en disco (historial de usuarios, avatares, confesiones, advertencias y memorias de IA).
  - **Acción:** Mover estos respaldos a una ubicación externa segura (o volumen cifrado con GPG / permisos `0700` restringido a root) y borrarlos del sistema de archivos local para cumplir con GDPR y Discord Developer Policy.
- [ ] **Revisión de Secretos en Variables de Entorno:**
  - **Motivo:** Múltiples variables (`BOT_OWNER_ID`, `ERROR_WEBHOOK_URL`, `GEMINI_API_KEY`) no están en el esquema Zod `envSchema.ts` y se leen directamente de `process.env`.
  - **Acción:** Confirmar que en `.env.production` del servidor todas estas variables estén correctamente definidas y no contengan valores por defecto.

---

## ⚙️ 2. Infraestructura y Despliegue en la VM (PM2)

- [ ] **Corrección de Rutas y Timeout en `ecosystem.config.js` (`[OPS-01]`, `[LIF-01]`):**
  - **Evidencia confirmada:** Las líneas 11, 23 y 39 tienen hardcodeado `cwd: "/root/HannaeX"`, mientras que la VM corre bajo el usuario `hanna` (`/home/hanna/HannaeX`). Además, falta `kill_timeout: 10000`, provocando que PM2 envíe `SIGKILL` a los 1.6s antes de que el bot termine de cerrar Mongo/Redis/Discord.
  - **Acción:** Aprobar la corrección de `cwd` a `__dirname` y la adición de `kill_timeout: 10000`.
- [ ] **Decisión sobre `hoshiko-worker` y BullMQ (`[OPS-02]`):**
  - **Motivo:** `hoshiko-worker` está configurado con `WORKER_ENABLED: "false"` y `autorestart: false`.
  - **Acción:** Decidir si en la próxima fase se activará el procesamiento asíncrono con Redis/BullMQ. Si no se usará aún, eliminarlo temporalmente de PM2 para evitar confusión en los monitores.
- [ ] **Exposición de Puerto 8080 (`healthServer`) (`[OPS-03]`):**
  - **Acción:** Verificar en el firewall de la VM (`ufw status`) o Security Group que el puerto 8080 no esté abierto a todo internet, o aprobar el cambio en código para enlazarlo exclusivamente a `127.0.0.1`.

---

## ⚖️ 3. Términos Legales y Discord Developer Policy (`[LEG-01]`)

- [ ] **Formalización de `Licenses/PRIVACY.md` y `Licenses/TERMS.md`:**
  - **Motivo:** Ambos documentos legales están incompletos y llenos de anotaciones `[TODO: VALIDAR ...]`.
  - **Acción:** Redactar la información final de contacto, entidad responsable y plazos de retención de datos.
- [ ] **Alineación con Funcionalidades Reales:**
  - Declarar en la Política de Privacidad el uso de Google Gemini para procesamiento conversacional y la extracción de memorias del usuario (`userMemory`).
  - Enlazar la versión final en el Discord Developer Portal para proteger la verificación del bot.

---

## 🌸 4. Funcionalidad, Concurrencia y Experiencia de Usuario

- [ ] **Decisión sobre Comandos de Prefijo Clásicos (`[CMD-01]`):**
  - **Motivo:** Comandos como `xping`, `xsay`, `xtranslate`, `xuserinfo` y `xprefix` no se ejecutan porque `messageCreate.ts` solo maneja `snipe` y `afk`.
  - **Acción:** Decidir si HannaeX mantendrá soporte de comandos de prefijo clásicos (lo que requiere una línea de dispatch en `messageCreate.ts`) o si se deprecian definitivamente en favor de los Slash Commands.
- [ ] **Aprobación de Aislamiento de Memoria IA entre Servidores (`[AI-01]`):**
  - **Motivo:** Actualmente el historial de Gemini (`Conversation`) es global por usuario.
  - **Acción:** Aprobar la migración para que las conversaciones se aíslen por `{ userId, guildId }`, impidiendo que el bot mezcle charlas de servidores privados en servidores comunitarios.
- [ ] **Aprobación de Modelo Oficial de Google Gemini (`[AI-03]`):**
  - **Motivo:** Se utiliza `"gemini-2.5-flash-lite"` / `"gemini-2.5-flash"`.
  - **Acción:** Confirmar la migración a los identificadores oficiales de Google (`gemini-2.0-flash` o `gemini-2.0-flash-lite`).

---

## 📝 5. Verificación de Master vs Producción

- [ ] **Confirmar qué commit exacto está corriendo en producción ahora mismo:**
  - En la VM, ejecutar `pm2 describe hoshiko-bot` y verificar la fecha/commit del build desplegado para asegurar que no se pise ninguna configuración al compilar y reiniciar tras la auditoría. *(Actualmente clasificado como `NO VERIFICADO` por aislamiento de sandbox)*.
