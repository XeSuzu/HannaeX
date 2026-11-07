# Política de Privacidad de Hoshiko

**Título:** Política de Privacidad de Hoshiko  
**Identificador de Versión:** `HOSHIKO-PUB-PRIV-2.0.0`  
**Fecha de Elaboración:** 6 de noviembre de 2026  
**Fecha de Última Revisión:** 7 de noviembre de 2026  
**Estado:** `PUBLICATION-READY` *(Auditada técnicamente y verificada contra el código fuente de Hoshiko v2.0.0)*  
**Alcance:** Aplicación principal de Discord **Hoshiko** (`apps/hoshiko`). Las funciones de defensa perimetral (`apps/hoshiko-security`) operan como software desacoplado e independiente.  
**Referencias:** [Términos de Servicio](./TERMS_OF_SERVICE.md), [Licencia del Proyecto](../LICENSE)  

---

Esta Política de Privacidad describe de forma transparente y verificable cómo **Hoshiko** (en adelante, el **"Bot"** o el **"Servicio"**) recopila, procesa, almacena, transfiere y elimina datos cuando interactúa con usuarios y servidores en Discord. Cada declaración de este documento corresponde al comportamiento real del software.

## 1. Identificación del Responsable del Tratamiento

- **Responsable:** Janner Garcia, conocido públicamente como **v.sxn**, persona natural.
- **Correo para Solicitudes de Privacidad y Ejercicio de Derechos:** [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).
- **Marco Normativo:** Ley Orgánica de Protección de Datos Personales de la República del Ecuador (LOPDP) y su Reglamento General, las [Políticas para Desarrolladores de Discord](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy) y las normativas internacionales de protección de datos cuando resulten aplicables (como el RGPD).

---

## 2. Datos que Procesa Hoshiko y su Origen

Hoshiko obtiene datos únicamente a través de la API y el Gateway de Discord (eventos del servidor e interacciones de los usuarios). **El Bot no solicita ni recopila documentos de identidad civil, direcciones postales, números telefónicos, contraseñas ni datos de tarjetas bancarias, y no graba ni recibe flujos de audio de los canales de voz.**

Según los módulos habilitados en cada servidor y los comandos utilizados, Hoshiko procesa las siguientes categorías de datos:

### 2.1. Identificadores y Configuración del Servidor
- **Datos:** Identificadores de Discord (`userId`, `guildId`, `channelId`, `roleId`, `messageId`), prefijo del servidor, configuración de módulos de seguridad (`securityModules`), reglas del servidor (`serverRules`), canales de registro (`logChannels`), vocabulario/cultura configurada del servidor y ajustes de roles por estado o reacción.
- **Origen:** Eventos de Discord y comandos de administración (`/setup`, `/setup-automod`, `/wordfilter`, `/setup-logs`, `/setup-status`).

### 2.2. Progresión de Niveles (Texto y Voz), Rachas y Perfiles Sociales
- **Datos:**
  - **Nivel Local (`LocalLevel`):** `userId`, `guildId`, puntos de experiencia (`xp`), nivel, contador de mensajes (`messagesSent`), experiencia de voz (`voiceXp`, `voiceLevel`), minutos totales en voz (`voiceMinutes`), contadores semanales y marcas de tiempo de enfriamiento anti-abuso.
  - **Nivel y Perfil Global (`GlobalLevel`, `GlobalProfile`):** `userId`, experiencia y nivel global de texto, racha global, logros, reputación, temas/fondos desbloqueados de tarjeta y lista de servidores donde ya se mostró el aviso de primer borrado de Snipe (`snipeNotifiedGuilds`).
  - **Sesiones Activas de Voz (`ActiveVoiceSession`):** `userId`, `guildId`, `channelId`, hora de inicio (`start`, `originalStart`) y marca de apagado para contabilizar el tiempo de conexión en canales de voz activos. **No se procesa ni almacena audio de voz.**
  - **Comunidad y Rachas (`StreakGroup`, `StreakMember`, `Couple`, `Suggestion`, `Afk`):** Miembros de grupos de racha diaria, historial de rupturas de racha, instantáneas del Salón de la Fama (100 días con `userId`, `username` y `avatarUrl`), parejas virtuales (`users`, `kisses`), sugerencias enviadas y motivo de estado `/afk`.

### 2.3. Confesiones Comunitarias
- **Datos (`Confession`):** `guildId`, número de confesión (`confessionId`), contenido del texto, URL de imagen opcional, estado (`isAnonymous`, `isDeleted`), IDs de mensaje en Discord y **datos internos de autoría (`authorId` y `authorTag`)**.
- **Aviso importante:** Aunque el usuario elija publicar una confesión en modo anónimo para el canal público, el Bot registra internamente su `authorId` y `authorTag` para evitar el uso impune de la herramienta en actividades ilícitas, permitir al personal del servidor bloquear abusos (`/confession-ban`) o auditar infracciones.

### 2.4. Inteligencia Artificial, Cuotas y Memoria Soberana del Usuario
- **Resolución Local sin Transmisión Externa (`LocalIntentService`):**
  - Saludos habituales, despedidas, preguntas frecuentes sobre la bot y consultas básicas de identidad se resuelven directamente en el motor local de Hoshiko. **Estos mensajes nunca se transmiten a Google Gemini ni a ningún proveedor externo.**
- **Enrutamiento Seguro y Gateway (`Gemini Relay`):**
  - Toda consulta conversacional compleja o solicitud explícita se enruta de forma exclusiva a través de un gateway seguro centralizado (`Gemini Relay`). No existe bypass directo ni conexión desprotegida a APIs externas.
- **Contexto Conversacional Transitorio:**
  - Cuando se requiere invocar al modelo de IA, el Bot remite únicamente el mensaje actual, una ventana deslizante de diálogo reciente (10 a 15 mensajes del canal, filtrados para omitir menciones masivas y tokens) y, cuando corresponda, el bloque de perfil soberano autorizado.
- **Memoria Personal Soberana (`PersonalMemory`):**
  - El usuario posee control absoluto sobre lo que Hoshiko recuerda mediante el comando `/memory`. Los recuerdos se organizan por categorías y se aíslan estrictamente dentro de bloques `<user_profile>` con sanitización anti-inyección de instrucciones (*prompt injection*).
  - **Zero-Knowledge Logging:** En los archivos de registro técnico (`.jsonl`) y consolas del servidor no se escribe en texto plano el contenido de los recuerdos personales ni las conversaciones privadas; los identificadores de auditoría se protegen mediante resúmenes criptográficos SHA-256.
- **Administración de Cuotas en Ciclo Deslizante de 24 Horas (`QuotaManager`):**
  - Para garantizar un acceso equitativo y prevenir sobrecostos de infraestructura, cada usuario dispone de depósitos de cuotas para conversación e investigación web. El saldo se descuenta por consumo y se repone automáticamente al cumplirse exactamente 24 horas de cada uso. Los usuarios pueden auditar su saldo en tiempo real mediante `/ai usage` y `/ai panel`.
- **Validación Anti-SSRF en Imágenes (`ImageValidator`):**
  - Antes de evaluar imágenes adjuntas para análisis visual, el sistema comprueba estrictamente que las URLs apunten a dominios seguros de Discord y bloquea cualquier intento de sondeo hacia redes locales o direcciones IP privadas.

### 2.5. Moderación, Casos Disciplinarios, Snipe y Canales de Registro
- **Casos y Advertencias (`Case`, `Warning`, `TempModeration`):** Número secuencial de caso (`caseId`), `guildId`, `userId` sancionado, `modId` (moderador o `"system"`), acción (`warn`, `timeout`, `kick`, `ban`, `unban`, `purge`, `unmute`), motivo (`reason`), fuente (`manual`, `automod`, `ai`, `antiraid`), regla infringida y fecha de expiración en sanciones temporales.
- **Evaluación de AutoMod e IA (`wordFilter`, `linkProtector`, `aiJudge`, `/historial`):** El contenido de los mensajes se analiza en tiempo real para detectar palabras prohibidas, enlaces de phishing o spam. Cuando el módulo de moderación por IA está activo o un moderador ejecuta `/historial`, el texto del mensaje sospechoso o el resumen de hasta 15 casos previos del usuario se envía a Google Gemini para clasificación o análisis de reincidencia.
- **Recuperación de Mensajes Eliminados (`Snipe`) y Registros (`#message-log`):**
  - Si un servidor habilita el módulo **Snipe**, cuando un usuario elimina un mensaje el Bot guarda en caché de memoria y en la colección `Snipe` el contenido del mensaje, nombre, `authorId`, avatar, URL de imagen adjunta (si existía) y hora de borrado (hasta 100 entradas por canal). La primera vez que un usuario borra un mensaje en un servidor con Snipe activo, el Bot envía un aviso informativo sobre esta función.
  - Si el administrador configuró un canal de auditoría de mensajes (`#message-log`), el Bot envía a dicho canal privado del servidor un registro con el autor, canal, contenido (hasta 1000 caracteres) y enlaces de adjuntos del mensaje eliminado o editado.

### 2.6. Historial de Avatares, Nombres de Usuario y Presencias
- **Datos (`AvatarHistory`, `UserHistory`, `PresenceHistory`):** A través de los eventos del Gateway de Discord (`userUpdate`, `presenceUpdate`, `guildMemberAdd` y cambios de perfil en el servidor), Hoshiko registra en su base de datos los cambios de URL de avatar/banner, nombres de usuario (`username`, `tag`, `displayName`) y el último estado de presencia y actividad (como canciones en reproducción de Spotify, partidas de Roblox u otros juegos visibles en Discord) de los miembros de los servidores donde el Bot está presente.
- **Finalidad:** Estos registros alimentan exclusivamente los comandos informativos `/avatars`, `/users` y `/activity` dentro de los servidores.

### 2.7. Registros Técnicos Operativos
- **Datos (`LocalStorage`):** El servidor genera archivos de registro técnico (`logs/hoshiko-YYYY-MM-DD.jsonl`) con fecha, nivel de alerta, contexto del módulo, mensaje técnico, `guildId`, `userId` (cuando aplica) y metadatos con filtrado automático de tokens y claves secretas.

---

## 3. Finalidades y Bases Jurídicas del Tratamiento

Conforme a la LOPDP de Ecuador (Art. 7) y estándares internacionales equivalentes (Art. 6.1 RGPD), Hoshiko trata estos datos bajo las siguientes bases jurídicas:

1. **Ejecución de Funciones Solicitadas por el Usuario o la Comunidad:** Atender comandos interactivos (`/rank`, `/confess`, `/suggest`, `/racha`, `/ship`, `/afk`, `/translate`, `/lyrics`, consultas a la IA y generación de tarjetas visuales).
2. **Interés Legítimo de Seguridad, Moderación y Prevención de Abusos:** Operar los filtros de AutoMod, bloquear enlaces de phishing, mantener el registro de casos disciplinarios (`Case`, `Warning`), conservar el `authorId` interno en confesiones para impedir abusos impunes y generar registros técnicos de diagnóstico.
3. **Configuración Comunitaria e Interés Funcional del Servidor:** Progresión de experiencia, roles por estado/reacción, Snipe (con aviso en el primer borrado) y comandos de historial de perfil/actividad en servidores compartidos, respetando siempre el derecho del usuario a solicitar la eliminación de sus datos.

> **No venta de datos ni entrenamiento propio:** El responsable de Hoshiko **no vende datos personales a terceros** ni utiliza los mensajes o conversaciones de los usuarios para entrenar modelos de inteligencia artificial propios.

---

## 4. Almacenamiento, Conservación y Plazos de Eliminación

Los datos persistentes se almacenan en **MongoDB** y las cachés temporales en **Redis** y en la **memoria RAM** del proceso, alojados en una máquina virtual contratada con el proveedor **CubePath** en **Miami, Florida, Estados Unidos**.

### 4.1. Plazos de Expiración Automática Verificados en Código
- **Cachés en Memoria RAM (`LocalCacheService`):**
  - Cooldowns de usuario en IA: **3 segundos**.
  - Mensajes procesados por IA y bloqueos de interacción (`InteractionLock` en MongoDB): **15 segundos**.
  - Caché de configuración de niveles: **60 segundos**.
  - Caché L1 de configuración de servidor: **5 minutos**.
  - Caché de veredictos de moderación IA: **1 hora**.
  - Contadores de presupuesto diario de IA por servidor: **24 horas**.
- **Caché Redis (L2):** Cuando Redis está habilitado, las configuraciones de servidor en caché tienen una expiración (`TTL`) de **10 minutos**.
- **Sesiones Activas de Voz (`ActiveVoiceSession`):** Se eliminan al salir el usuario del canal de voz o automáticamente tras **24 horas** mediante índice TTL en MongoDB.
- **Mensajes de Snipe (`Snipe`):**
  - El comando `/snipe` filtra y deja de mostrar cualquier mensaje eliminado una vez transcurrida **1 hora (60 minutos)** desde su borrado.
  - En MongoDB, el documento de Snipe del canal tiene un índice TTL de **1 hora (`3600 segundos`)** sobre su última actualización (`updatedAt`). Dado que el documento agrupa las entradas por canal, nuevos mensajes borrados en el mismo canal pueden renovar la fecha de actualización del contenedor en la base de datos hasta que transcurra 1 hora sin borrados en ese canal, aunque las entradas de más de 1 hora no se muestran nunca en el comando.
  - **Diferencia con `#message-log`:** Si el servidor activó el canal `#message-log`, el mensaje enviado a ese canal de Discord no expira a la hora y permanece en Discord bajo el control de los administradores del servidor.
- **Registros Técnicos en Disco (`.jsonl`):** Un proceso programado diario (`cleanOldLogs` a las 03:00) elimina automáticamente los archivos de log técnico que superen los **14 días** de antigüedad.

### 4.2. Datos de Conservación Indefinida y Qué Sucede al Retirar el Bot
- **Colecciones sin expiración automática:** Los perfiles y niveles (`LocalLevel`, `GlobalLevel`, `GlobalProfile`), configuraciones del servidor (`ServerConfig`, `StatusConfig`), memoria de hechos de IA (`UserMemory`), confesiones (`Confession`), sugerencias (`Suggestion`), parejas (`Couple`), rachas (`StreakGroup`, `StreakMember`), historiales de perfil (`AvatarHistory`, `UserHistory`, `PresenceHistory`) y registros de moderación (`Case`, `Warning`) **no tienen fecha de caducidad automática en MongoDB** y se conservan mientras sean necesarios para la función correspondiente o hasta que se solicite su eliminación.
- **Cuando el Bot sale de un servidor:** Al retirar a Hoshiko de un servidor, el Bot deja inmediatamente de recibir eventos de esa comunidad y las cachés en memoria/Redis expiran en minutos. Sin embargo, **el software actual no ejecuta un borrado automático de la base de datos al salir del servidor**. Los administradores o usuarios que deseen eliminar los datos almacenados de su servidor o cuenta pueden utilizar los comandos disponibles o solicitar la supresión al correo de contacto del responsable.
- **Copias de seguridad:** La eliminación en la base de datos principal, la expiración de cachés y la eventual rotación de copias de seguridad de la infraestructura pueden no ocurrir de manera simultánea.

---

## 5. Proveedores Externos y Transferencias Internacionales

Para ejecutar sus funciones, Hoshiko interactúa con los siguientes servicios externos, lo que implica transferencias internacionales de datos (principalmente hacia **Estados Unidos**):

1. **Discord Inc. (EE. UU.):** Plataforma de mensajería y API necesaria para toda interacción del Bot ([Política de Privacidad de Discord](https://discord.com/privacy)).
2. **CubePath (Miami, Florida, EE. UU.):** Proveedor de alojamiento de la máquina virtual donde operan el Bot, MongoDB y Redis ([Política de CubePath](https://cubepath.com/policy)).
3. **Google LLC — Google Gemini API (EE. UU. / Global):** Recibe los mensajes, contexto reciente del canal (10–15 mensajes), imágenes adjuntas en consultas compatibles, textos de traducción y elementos de moderación asistida o resumen de casos (`/historial`).
   - *Régimen de tratamiento en Google:* Google aplica condiciones distintas según el proyecto opere en el nivel gratuito (*Unpaid Services*, donde Google puede emplear prompts para mejorar sus modelos) o en el nivel facturado (*Paid Services*, donde Google no utiliza los prompts para entrenar sus modelos públicos). El responsable de Hoshiko declara operar con facturación activa; el tratamiento por parte de Google se rige por las [Condiciones de Gemini API](https://ai.google.dev/gemini-api/terms) y la [Política de Privacidad de Google](https://policies.google.com/privacy).
4. **Proveedores de Búsqueda Web e Imágenes (Google Custom Search API y Serper `google.serper.dev`):** Cuando se solicita una búsqueda web o de imágenes, reciben únicamente el término de consulta (filtrado previamente contra términos prohibidos), sin enviar el `userId` del solicitante.
5. **Proveedores de Letras y Metadatos Musicales (Genius, LRCLIB `lrclib.net`, Lyrics.ovh e iTunes Search API):** Cuando se utiliza el comando de letras musicales, reciben únicamente el nombre de la canción o artista consultado.
6. **Proveedores de GIFs y Recursos Gráficos (`nekos.best`, `otakugifs.xyz`, `waifu.im`, `tenor.com`, `i.scdn.co`):** Cuando se ejecutan comandos de reacción o se renderizan tarjetas de actividad/perfil, el servidor descarga la imagen o GIF correspondiente sin transmitir datos personales de los usuarios a dichos catálogos.
7. **Lista Anti-Phishing (`phish.sinking.yachts`):** Hoshiko descarga periódicamente la lista pública de dominios maliciosos para compararla localmente en memoria; no envía mensajes ni datos de usuarios a dicho servicio.

---

## 6. Derechos de los Titulares y Cómo Ejercerlos

De acuerdo con la LOPDP de Ecuador y las normativas de protección de datos aplicables, usted tiene derecho a solicitar el **acceso, rectificación o actualización, eliminación (supresión), oposición y limitación del tratamiento** de sus datos personales.

### 6.1. Controles Directos desde Discord
- **Gestión Soberana de Memoria de IA (`/memory` y `/ai panel`):**
  - Puede ejecutar en cualquier momento `/memory ver` para auditar la totalidad de recuerdos asociados a su cuenta.
  - Puede eliminar recuerdos específicos con `/memory borrar opcion:uno numero:X` o vaciar completamente su perfil con `/memory borrar opcion:todo`.
  - Puede deshabilitar de forma voluntaria la memoria personal con `/memory ajustes estado:desactivada`.
  - En servidores compartidos, el comando `/clearmemory` purga la memoria asociada al canal y `/clearmemoryall` (exclusivo para administradores) restablece la memoria de IA en todo el servidor.
- **Auditoría de Consumo y Cuotas:**
  - Puede consultar en cualquier momento el estado de sus depósitos diarios, cuotas consumidas y tiempo restante exacto para la reposición mediante `</ai usage:0>` o a través del panel interactivo `</ai panel:0>`.

### 6.2. Solicitudes al Responsable (Correo Electrónico)
Para solicitar el acceso o la eliminación de otros datos asociados a su cuenta (como progresión local o global, perfil `GlobalProfile`, historial en `AvatarHistory`, `UserHistory`, `PresenceHistory`, sugerencias, parejas o datos de un servidor retirado):
1. Envíe un correo electrónico a [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com) indicando su **nombre de usuario e ID numérico de Discord (`userId`)**, los servidores o categorías de datos sobre los que realiza la solicitud y la acción deseada.
2. El responsable podrá solicitar una comprobación razonable para verificar que usted es el titular de la cuenta de Discord (o el administrador legítimo del servidor, si solicita borrar la configuración de una comunidad) y atenderá la solicitud conforme a los plazos legales aplicables (en el marco de la LOPDP de Ecuador, dentro de los 15 días siguientes a la recepción completa de la solicitud).
3. En Ecuador, también le asiste el derecho de acudir ante la **Superintendencia de Protección de Datos Personales (SPDP)** ([https://www.spdp.gob.ec/](https://www.spdp.gob.ec/)) o ante la autoridad de control de protección de datos de su jurisdicción.

### 6.3. Excepciones a la Eliminación en Registros de Moderación
Conforme al artículo 18 de la LOPDP y al artículo 17.3.e del RGPD, **los registros de sanciones disciplinarias (`Case`, `Warning`) y los bloqueos por abuso en un servidor no se eliminan a solicitud del usuario sancionado** mientras sean necesarios para proteger la seguridad de esa comunidad y evitar la evasión de sanciones (*ban evasion*). La rectificación o anulación de una sanción en un servidor corresponde a los administradores de dicho servidor mediante los comandos `/warn remove`, `/warnings clear`, `/unban` o `/unmute`.

---

## 7. Seguridad de la Información y Menores

1. **Medidas Técnicas Implementadas:** Hoshiko restringe el puerto de salud interno a `127.0.0.1`, aplica sanitización automática para redactar tokens y claves de API en sus archivos de registro (`.jsonl`), purga dichos registros a los 14 días y restringe el acceso a la máquina virtual y base de datos al responsable del proyecto. Ningún sistema conectado a Internet puede garantizar seguridad absoluta; en caso de detectarse un incidente de seguridad relevante, el responsable lo gestionará y notificará conforme a las obligaciones legales aplicables.
2. **Menores de Edad:** Hoshiko no está dirigido a menores de 13 años. Si el responsable tiene conocimiento verificable de haberse almacenado información personal de un menor de 13 años en contravención de las reglas de Discord, procederá a su eliminación tras recibir el reporte en [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).

---

## 8. Cambios en esta Política

Cualquier actualización de esta Política de Privacidad para reflejar cambios en el código del Bot, nuevos proveedores o exigencias normativas se publicará actualizando la versión y la fecha de revisión en el encabezado de este documento.

---

### Historial de Cambios del Documento
- **`2.0.0` (2026-11-07):** Actualización integral conforme a Hoshiko v2.0.0. Incorporación de la memoria personal soberana (`PersonalMemory`), gateway Gemini Relay, Zero-Knowledge Logging, resolución local de intenciones cotidianas (`LocalIntentService`), ciclo de cuotas de 24 horas (`QuotaManager`), mitigación Anti-SSRF en imágenes y controles interactivos en `/memory` y `/ai panel`.
- **`1.0.0` (2026-11-06):** Reconstrucción forense inicial verificada contra el código de `apps/hoshiko`.
