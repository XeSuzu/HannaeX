# Política de Privacidad de Hoshiko

**Título:** Política de Privacidad de Hoshiko  
**Identificador de Versión:** `HOSHIKO-PUB-PRIV-2.1.0`  
**Fecha de Elaboración:** 6 de noviembre de 2026  
**Fecha de Última Revisión:** 9 de noviembre de 2026  
**Estado:** `Vigente`  
**Alcance:** Aplicación principal de Discord **Hoshiko**. Las funciones de defensa perimetral operan como software desacoplado e independiente.  
**Referencias:** [Términos de Servicio](/terms), [Licencia del Proyecto](https://github.com/XeSuzu/HannaeX/blob/master/LICENSE)  

---

Esta Política de Privacidad describe de forma transparente y comprensible cómo **Hoshiko** (en adelante, el **"Bot"** o el **"Servicio"**) recopila, procesa, almacena, transfiere y elimina datos cuando interactúa con usuarios y comunidades en Discord.

## 1. Identificación del Responsable del Tratamiento

- **Responsable:** Janner Garcia, conocido públicamente como **v.sxn**, persona natural.
- **Correo para Solicitudes de Privacidad y Ejercicio de Derechos:** [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).
- **Marco Normativo:** Ley Orgánica de Protección de Datos Personales de la República del Ecuador (LOPDP) y su Reglamento General, las [Políticas para Desarrolladores de Discord](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy) y las normativas internacionales de protección de datos cuando resulten aplicables (como el RGPD).

---

## 2. Datos que Procesa Hoshiko y su Origen

Hoshiko obtiene datos únicamente a través de la API y el Gateway de Discord (eventos del servidor e interacciones de los usuarios). **El Bot no solicita ni recopila documentos de identidad civil, direcciones postales, números telefónicos, contraseñas ni datos de tarjetas bancarias, y no graba ni recibe flujos de audio de los canales de voz.**

Según las funciones habilitadas en cada servidor y los comandos utilizados, Hoshiko procesa las siguientes categorías de datos:

### 2.1. Identificadores y Configuración del Servidor
- **Datos:** Identificadores numéricos de Discord (usuario, servidor, canales, roles y mensajes), prefijo configurado en el servidor, módulos de seguridad y moderación habilitados, reglas internas configuradas por los administradores, canales designados para registros y asignación de roles por estado o reacción.
- **Origen:** Eventos de Discord y comandos de configuración ejecutados por el personal administrativo (`/setup`, `/setup-automod`, `/wordfilter`, `/setup-logs`, `/setup-status`).

### 2.2. Progresión de Niveles (Texto y Voz), Rachas y Perfiles Sociales
- **Datos:**
  - **Nivel en el Servidor:** Identificador de usuario y de servidor, puntos de experiencia acumulados, nivel alcanzado, contador de mensajes enviados, minutos totales de permanencia en canales de voz activos, nivel de voz y marcas de tiempo de control anti-abuso.
  - **Nivel y Perfil Global:** Puntos y nivel global de texto, racha activa, logros desbloqueados, reputación otorgada por la comunidad, personalizaciones visuales de tarjeta de perfil y registro de servidores donde se emitió el aviso informativo de primer uso de recuperación de mensajes.
  - **Sesiones Activas de Voz:** Registro temporal de conexión (hora de inicio y estado de conexión) para calcular el tiempo acumulado mientras el usuario permanezca en canales de voz activos junto a otros miembros. **En ningún caso se graba, intercepta ni almacena audio de voz.**
  - **Dinámicas Sociales y Rachas:** Grupos de racha diaria activa, historial de cumplimiento, miembros destacados del Salón de la Fama comunitaria, vínculos recreativos de pareja virtual, sugerencias aportadas al servidor y estado de ausencia (`/afk`).

### 2.3. Confesiones Comunitarias
- **Datos:** Identificador del servidor, número correlativo de la confesión, texto del mensaje, enlace a imagen opcional, estado de publicación y **los identificadores internos del autor (ID de usuario y nombre de cuenta en Discord)**.
- **Aviso importante:** Aunque la confesión se publique en el canal público bajo la modalidad anónima frente a los demás miembros de la comunidad, el Bot preserva internamente los datos de autoría con la única finalidad de impedir el uso indebido de la herramienta para acoso o conductas ilícitas, permitiendo a los moderadores del servidor aplicar bloqueos locales (`/confession-ban`) ante infracciones.

### 2.4. Inteligencia Artificial, Cifrado en Reposo, Cuotas y Memoria Adaptativa
- **Cifrado en Reposo en Nuestra Base de Datos (AES-256-GCM):**
  - Toda información persistida referente a recuerdos personales y a historiales de conversación se almacena en reposo en la base de datos bajo **cifrado a nivel de campo mediante el algoritmo estándar AES-256-GCM**, empleando vectores de inicialización (`IV`) y etiquetas de autenticación (`AuthTag`) generados de forma independiente para cada entrada.
- **Resolución Local sin Transmisión Externa:**
  - Saludos habituales, despedidas, consultas básicas sobre comandos y preguntas frecuentes de identidad se resuelven directamente en el motor local de Hoshiko. **Estos mensajes cotidianos nunca se transmiten a Google Gemini ni a ningún proveedor externo.**
- **Enrutamiento Seguro y Pasarela Centralizada:**
  - Las consultas conversacionales complejas y solicitudes explícitas que requieren razonamiento profundo se procesan a través de una pasarela segura dedicada, asegurando que las comunicaciones con la API externa cumplan con los estándares de autenticación y formato establecidos.
- **Memoria Personal Soberana y Global por Usuario:**
  - El bot aprende de forma progresiva datos biográficos generales, preferencias de estilo y dinámicas de trato recíprocas compartidas voluntariamente por el usuario.
  - **Alcance Global:** La memoria personal está asociada exclusivamente al identificador de Discord del usuario y tiene carácter global: se aplica de manera consistente en cualquier servidor donde el usuario interactúe con Hoshiko. Los recuerdos de un usuario **jamás se asocian ni se transfieren a otros usuarios**.
  - **Límite y Política de Reemplazo:** Se establece un límite máximo de 20 recuerdos por usuario. Al alcanzar dicha capacidad, los recuerdos aprendidos automáticamente se reemplazan comenzando por el más antiguo (FIFO); los recuerdos introducidos manualmente por el usuario nunca se eliminan automáticamente y solo se suprimen cuando el usuario lo solicita de forma expresa.
  - **Filtro Estricto de Seguridad:** El sistema analiza previamente cada recuerdo potencial y bloquea de forma estricta claves y tokens de API, contraseñas y credenciales, números de tarjetas bancarias (tanto continuos como formateados con espacios o guiones) y términos de diagnósticos o tratamientos de salud críticos, así como intentos de adjudicación de privilegios de administración o moderación.
  - **Transmisión para Contextualización:** Cuando el usuario interactúa activamente con el asistente de IA, los recuerdos personales pertinentes se descifran en memoria volátil y se integran dentro de las instrucciones del sistema transmitidas a Google Gemini API para permitir una respuesta contextualizada y adaptada a sus preferencias.
  - **Gestión Directa por el Usuario (`/ai panel` y `/memory`):** Desde la interfaz de Discord, el usuario puede consultar en todo momento sus recuerdos clasificados por procedencia (`aprendido en chat`, `dinámica de trato`, `añadido manual`), borrar recuerdos individuales por su identificador o posición, pausar la memoria o vaciarla por completo de forma instantánea.
- **Memoria de Entidades del Servidor y Filtro de Convivencia:**
  - En servidores donde interactúa, Hoshiko puede recordar temas comunitarios, roles y proyectos técnicos compartidos. Dispone de un filtro de convivencia que descarta acusaciones personales, conflictos o polémicas entre miembros. Esta información comunitaria **solo se evoca ante preguntas explícitas** del interlocutor y nunca de forma espontánea.
- **Administración de Cuotas Diarias:**
  - Cada usuario dispone de saldos diarios independientes: 20 consultas de investigación web y 40 consultas de conversación general. El saldo se repone diariamente a las **00:00 hora de Ecuador** (`America/Guayaquil`). El estado de consumo y tiempo restante exacto pueden verificarse en tiempo real mediante `/ai usage` y `/ai panel`.
- **Fase de Análisis Progresivo en Búsquedas:**
  - En solicitudes que demanden información web actualizada, Hoshiko aplica un proceso escalonado de 10 segundos para verificar fuentes y mitigar imprecisiones; las conversaciones informales y consultas locales se atienden de inmediato sin esperas añadidas.
- **Protección de Enlaces e Imágenes:**
  - Antes de evaluar imágenes adjuntas para interpretación visual, se valida que los enlaces provengan exclusivamente de fuentes seguras de la infraestructura de Discord, bloqueando cualquier intento de conexión hacia redes privadas o direcciones internas.

### 2.5. Moderación, Casos Disciplinarios, Snipe y Canales de Registro
- **Casos Disciplinarios y Advertencias:** Número correlativo de caso, servidor, usuario sancionado, moderador actuante (o sistema automático), tipo de sanción (`warn`, `timeout`, `kick`, `ban`, `unban`, `purge`, `unmute`), motivo indicado, regla infringida y fecha de vencimiento en penalizaciones temporales.
- **Moderación Asistida y Análisis Heurístico:** Los mensajes se evalúan en tiempo real frente a patrones de palabras prohibidas, enlaces maliciosos o spam masivo. Cuando las funciones de moderación asistida o el comando `/historial` son utilizados por el personal del servidor, el texto del mensaje evaluado o el extracto de casos previos del usuario se procesa con Google Gemini para asistir en la clasificación de la falta.
- **Recuperación Temporal de Mensajes (`Snipe`) y Registros de Auditoría:**
  - En servidores cuyos administradores habiliten voluntariamente el módulo de recuperación (`/setup`), al eliminarse un mensaje se almacena temporalmente su contenido, autor, imágenes/adjuntos y fecha de borrado en memoria volátil de corta duración (hasta un máximo de 100 mensajes por canal). Esta información se conserva con el único fin de permitir su consulta recreativa inmediata mediante `/snipe` dentro del mismo canal y se destruye de forma automática e irreversible al transcurrir un plazo máximo de 1 hora (60 minutos).
  - Si los administradores han configurado canales privados de auditoría, las ediciones y supresiones de mensajes se envían a dichos canales para control interno del personal del servidor.

### 2.6. Historial de Avatares, Nombres de Usuario y Presencias
- **Datos Recopilados:** A través de los eventos del Gateway de Discord ante cambios de perfil o actividad, Hoshiko registra los cambios de URL de avatar y banner, nombres de usuario y apodos, y el estado de actividad reciente (incluyendo presencia en línea, juegos reportados o reproducción multimedia visible en el perfil) de los miembros presentes en los servidores compartidos con el Bot.
- **Finalidad y Alcance:** Estos registros alimentan exclusivamente los comandos informativos y de perfil dentro de la comunidad (`/avatars`, `/users`, `/activity`). Se recopilan pasivamente a nivel de servidor sin distinción de si el usuario ha invocado directamente al Bot y se conservan de forma indefinida hasta su solicitud de supresión.

### 2.7. Registros Técnicos Operativos
- **Datos:** Los servidores del sistema generan registros técnicos rotativos con fecha, nivel de diagnóstico, módulo involucrado y metadatos operativos, aplicando filtros automáticos para impedir el registro de tokens de acceso, claves privadas o contenidos sensibles en dichos archivos.

---

## 3. Finalidades y Bases Jurídicas del Tratamiento

Conforme a la Ley Orgánica de Protección de Datos Personales de Ecuador (Art. 7) y normativas internacionales aplicables (Art. 6.1 RGPD), Hoshiko trata los datos bajo las siguientes bases de legitimación:

1. **Ejecución del Servicio a Solicitud del Usuario:** Atender comandos interactivos, consultas conversacionales, dinámicas sociales, generación de estadísticas, tarjetas de perfil y traducción.
2. **Interés Legítimo de Seguridad y Prevención de Abusos:** Administrar filtros contra spam y enlaces engañosos, registrar casos disciplinarios para preservar la convivencia en las comunidades, mantener la identificación interna en confesiones para impedir conductas lesivas y generar registros técnicos de estabilidad.
3. **Gestión Comunitaria por Administradores de Servidores:** Operar niveles de experiencia, roles automáticos, canales de auditoría y comandos de consulta de perfiles configurados voluntariamente por cada servidor.

> **Sin venta comercial de datos:** El responsable de Hoshiko **no vende datos personales a terceros** ni los cede para fines publicitarios. El procesamiento de fragmentos de conversación y preferencias se orienta **única y exclusivamente a la personalización y memoria individual del propio Servicio hacia el usuario solicitante**, manteniéndose cifrados en reposo en nuestra base de datos (AES-256-GCM) y bajo control soberano del usuario para su eliminación.

---

## 4. Almacenamiento, Conservación y Plazos de Eliminación

Los datos persistentes se alojan en servidores de base de datos y sistemas de almacenamiento temporal contratados con el proveedor de infraestructura **CubePath** en **Miami, Florida, Estados Unidos**.

### 4.1. Plazos de Conservación y Expiración Automática
- **Cachés Temporales en Memoria:** Tiempos de retención de 3 a 15 segundos para prevención de ráfagas e interacción en IA, de 1 a 5 minutos para configuraciones locales de servidor, y de hasta 24 horas para balances de consumo operativo.
- **Sesiones de Voz:** Los registros transitorios de tiempo en canal de voz se liquidan al desconectarse el usuario o tras un plazo de expiración automática de 24 horas.
- **Recuperación de Mensajes (`Snipe`):** Los mensajes borrados dejan de mostrarse en los comandos tras transcurrir **1 hora (60 minutos)** desde su supresión y expiran automáticamente en la base de datos cuando cesa la actividad en el canal correspondiente.
- **Historial de Conversación con IA:** Los intercambios conversacionales se almacenan cifrados en reposo en nuestra base de datos bajo AES-256-GCM y cuentan con expiración automática de **30 días** contados desde la última interacción.
- **Memoria Personal:** Los recuerdos personales se conservan cifrados en reposo en nuestra base de datos bajo AES-256-GCM con un límite de 20 entradas (desalojo FIFO para las automáticas). Los usuarios disponen además de una opción de retención automática de 90 días, o pueden eliminarlos manualmente en cualquier instante.
- **Registros Técnicos en Servidor:** Se eliminan de forma automatizada mediante tareas programadas tras alcanzar los **14 días** de antigüedad.

### 4.2. Datos de Conservación Indefinida y Retirada del Bot
- **Registros sin Expiración Automática:** Los niveles y perfiles de usuario, configuraciones fijadas por administradores, registros de sanciones disciplinarias, confesiones, sugerencias, dinámicas de pareja y los historiales de cambios de perfil o presencia se conservan mientras resulten necesarios para prestar las funciones respectivas o hasta que medie una solicitud expresa de supresión.
- **Memoria Heredada de Versiones Anteriores:** Los recuerdos antiguos registrados bajo esquemas anteriores por servidor se conservan en reposo en la base de datos en modalidad de solo lectura. Actualmente no cuentan con una tarea de purga automática programada y su eliminación definitiva se produce cuando el usuario ejecuta la purga total de sus recuerdos o solicita la supresión de sus datos.
- **Retirada del Bot de un Servidor:** Al expulsar a Hoshiko de una comunidad, el Bot cesa de inmediato la recepción de eventos. No obstante, **el sistema no efectúa un borrado destructivo automático inmediato de los registros históricos del servidor**. Quienes deseen su supresión pueden gestionar la eliminación mediante los comandos disponibles o contactando directamente al responsable.

---

## 5. Proveedores Externos y Transferencias Internacionales

Para prestar sus servicios, Hoshiko interactúa con plataformas técnicas de terceros, implicando transferencias de datos hacia centros de datos ubicados principalmente en **Estados Unidos**:

1. **Discord Inc. (EE. UU.):** Plataforma de comunicaciones y entorno en el cual se ejecutan todas las interacciones del Bot ([Política de Privacidad de Discord](https://discord.com/privacy)).
2. **CubePath (Miami, Florida, EE. UU.):** Proveedor de infraestructura donde se ejecutan los servicios principales y las bases de datos del sistema ([Política de CubePath](https://cubepath.com/policy)).
3. **Google LLC — Google Gemini API (EE. UU. / Global):** Recibe el texto de la consulta, el contexto conversacional reciente de la sesión, archivos visuales adjuntos en solicitudes compatibles, textos a traducir, elementos sometidos a moderación y **los recuerdos personales pertinentes del usuario, transmitidos descifrados dentro de la solicitud para que el modelo pueda generar respuestas coherentes y personalizadas**.
   - *Condiciones del servicio:* El responsable declara operar bajo el régimen de facturación comercial activa de la API de Google, sujeto a las [Condiciones de Gemini API](https://ai.google.dev/gemini-api/terms) y a la [Política de Privacidad de Google](https://policies.google.com/privacy).
4. **Proveedores de Búsqueda Web e Imágenes (Google Custom Search y Serper):** Reciben exclusivamente términos de búsqueda depurados, sin asociar identificadores personales del usuario solicitante.
5. **Proveedores de Letras y Metadatos Musicales (Genius, LRCLIB, Lyrics.ovh, iTunes Search API):** Reciben únicamente el título de la obra o artista consultado para obtener la letra o metadatos pertinentes.
6. **Catálogos Gráficos y Multimedia (`nekos.best`, `otakugifs.xyz`, `waifu.im`, `tenor.com`, `i.scdn.co`):** Se consultan para recuperar recursos visuales o carátulas musicales sin transmitir información personal de los usuarios.
7. **Servicios de Inteligencia sobre Enlaces Maliciosos (`phish.sinking.yachts`):** Hoshiko descarga listas de dominios fraudulentos para cotejarlas de manera local en memoria, sin transferir mensajes ni datos de usuarios a dicho catálogo.

---

## 6. Derechos de los Titulares y Cómo Ejercerlos

De conformidad con la legislación de protección de datos aplicable, los titulares cuentan con los derechos de **acceso, rectificación o actualización, eliminación (supresión), oposición y limitación del tratamiento**.

### 6.1. Controles Directos desde Discord
- **Gestión Soberana de Recuerdos (`/memory` y `/ai panel`):**
  - Consultar en cualquier momento todos los recuerdos almacenados vinculados a su cuenta mediante `/memory ver`.
  - Suprimir recuerdos puntuales indicando su número o mediante el menú interactivo de `/ai panel`.
  - Vaciar íntegramente la memoria personal con `/memory borrar opcion:todo` o a través del panel de control.
  - Pausar o reanudar el uso de la memoria personal con `/memory ajustes`.
  - Eliminar los recuerdos propios asociados a un servidor específico mediante `/clearmemory`.
- **Supervisión de Consumo y Cuotas:**
  - Auditar saldos diarios, consumo por ciclo y tiempo restante para reinicio mediante `/ai usage` o `/ai panel`.

### 6.2. Solicitudes al Responsable (Vía Correo Electrónico)
Para solicitar la supresión o acceso respecto a otros datos asociados a su cuenta (progresión de niveles, estadísticas globales, historiales de perfil o datos de servidores donde el Bot ya no esté presente):
1. Escriba a [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com) indicando su **nombre de usuario e ID numérico de Discord**, especificando las categorías de datos y la solicitud concreta.
2. El responsable podrá requerir una verificación razonable de titularidad sobre la cuenta o la administración del servidor antes de proceder, respondiendo dentro del plazo legal de 15 días establecido en la normativa ecuatoriana.
3. En Ecuador, los titulares pueden acudir igualmente ante la **Superintendencia de Protección de Datos Personales (SPDP)** ([https://www.spdp.gob.ec/](https://www.spdp.gob.ec/)) o ante la autoridad de protección de datos competente en su jurisdicción.

### 6.3. Conservación Excepcional en Registros de Moderación
Conforme a las excepciones previstas en la normativa (artículo 18 de la LOPDP y artículo 17.3 del RGPD), **los antecedentes de sanciones disciplinarias y bloqueos por infracciones graves en un servidor no están sujetos a eliminación a solicitud del usuario sancionado**, en la medida en que su conservación resulte necesaria para la protección legítima de la comunidad y la prevención de evasión de sanciones. La revisión o revocación de sanciones locales corresponde exclusivamente a los moderadores de cada comunidad.

---

## 7. Seguridad de la Información y Requisitos de Edad

1. **Medidas Técnicas de Resguardo:** El sistema implementa sanitización de datos en registros de diagnóstico para omitir credenciales y claves, purga automatizada de archivos temporales cada 14 días y acceso estrictamente restringido a las consolas de base de datos e infraestructura. Ningún servicio informático es completamente infalible; ante cualquier incidente de seguridad sustancial, el responsable actuará y lo notificará con apego a los deberes legales pertinentes.
2. **Requisitos de Edad:** Hoshiko está dirigido a personas mayores de 13 años (o la edad mínima legal exigida en su país, como 15 años en Ecuador para el consentimiento directo de adolescentes). Asimismo, de conformidad con las condiciones de Google Gemini API, las funciones asistidas por inteligencia artificial están destinadas exclusivamente a personas mayores de 18 años o que actúen con autorización y bajo la supervisión de sus representantes legales. Si se detecta la recopilación no autorizada de datos de menores en contravención a estos límites, se procederá a su eliminación inmediata tras recibir el reporte en [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).

---

## 8. Modificaciones a esta Política

Cualquier actualización de este documento derivada de cambios en las capacidades de Hoshiko, nuevos proveedores técnicos o exigencias regulatorias se informará reflejando la nueva versión y fecha de revisión en el encabezado.

---

### Historial de Cambios del Documento
- **`2.1.0` (2026-11-09):** Actualización y auditoría de conformidad técnica: precisión sobre la transmisión de recuerdos personales descifrados en solicitudes a Gemini, alcance global de la memoria personal por usuario, reemplazo de términos de entrenamiento por personalización y memoria, descripción exacta de los filtros de datos sensibles (tarjetas con o sin separadores, credenciales y términos médicos), clarificación sobre el estado de la colección heredada de memoria previa y alineación armónica de los requisitos de edad (13+ general, 18+ para funciones de IA).
- **`2.0.0` (2026-11-07):** Actualización integral conforme a Hoshiko v2.0.0. Incorporación de la memoria personal soberana, pasarela centralizada de IA, registro ciego de auditoría, resolución local de intenciones cotidianas, ciclo de cuotas de 24 horas y controles interactivos en `/memory` y `/ai panel`.
- **`1.0.0` (2026-11-06):** Redacción inicial de la política de privacidad.
