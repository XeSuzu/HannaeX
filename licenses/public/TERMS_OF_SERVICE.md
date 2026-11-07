# Términos y Condiciones de Uso de Hoshiko

**Título:** Términos y Condiciones de Uso de Hoshiko  
**Identificador de Versión:** `HOSHIKO-PUB-TOS-2.0.0`  
**Fecha de Elaboración:** 6 de noviembre de 2026  
**Fecha de Última Revisión:** 7 de noviembre de 2026  
**Estado:** `PUBLICATION-READY` *(Auditado técnicamente y verificado contra el código fuente de Hoshiko v2.0.0)*  
**Alcance:** Aplicación principal de Discord **Hoshiko** (`apps/hoshiko`). Las funciones de defensa perimetral (`apps/hoshiko-security`) operan como software desacoplado e independiente.  
**Referencias:** [Política de Privacidad](./PRIVACY_POLICY.md), [Licencia del Proyecto](../LICENSE)  

---

Estos Términos y Condiciones (en adelante, los **"Términos"**) regulan el acceso y la utilización de **Hoshiko** (en adelante, el **"Bot"** o el **"Servicio"**), una aplicación para comunidades de Discord. Estos Términos no constituyen una licencia sobre el código fuente del proyecto, el cual se rige por su propia licencia de derechos reservados.

## 1. Identificación del Titular y Aceptación

1. **Titular y Operador:** Hoshiko es un proyecto operado por **Janner Garcia**, conocido públicamente como **v.sxn**, persona natural. Correo oficial de contacto: [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).
2. **Aceptación de las Condiciones:** Al invitar a Hoshiko a un servidor de Discord, configurar sus módulos o utilizar sus comandos e interacciones, usted (ya sea como usuario miembro o como administrador de un servidor) acepta quedar vinculado por estos Términos en la medida permitida por la ley aplicable. Si no está de acuerdo con estos Términos, no utilice las funciones del Bot o solicite su retirada del servidor.
3. **Dependencia de Discord:** El funcionamiento del Bot depende íntegramente de la plataforma Discord. El usuario y el administrador deben cumplir en todo momento los [Términos de Servicio de Discord](https://discord.com/terms), las [Directrices de la Comunidad de Discord](https://discord.com/guidelines) y la [Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy).

---

## 2. Requisitos de Edad

1. **Edad Mínima en Discord:** Para interactuar con Hoshiko debe tener al menos **13 años de edad**, o la edad mínima superior exigida por la legislación de su país de residencia para utilizar servicios de la sociedad de la información y consentir el tratamiento de sus datos personales (en Ecuador, la Ley Orgánica de Protección de Datos Personales establece los 15 años para el consentimiento directo de adolescentes sin representante legal; en otros países puede variar entre 14 y 16 años). Hoshiko no verifica la edad de los usuarios.
2. **Restricciones del Proveedor de Inteligencia Artificial (Google Gemini):** Las funciones conversacionales, de traducción y de asistencia del Bot utilizan la API de Google Gemini. Las [Condiciones de Servicio de Gemini API](https://ai.google.dev/gemini-api/terms) establecen restricciones sobre el uso en servicios dirigidos o accesibles a menores de 18 años. Por ello, las funciones asistidas por inteligencia artificial están destinadas a personas mayores de 18 años o que actúen bajo la supervisión y autorización de sus representantes legales conforme a las políticas aplicables.

---

## 3. Funcionalidades Reales de Hoshiko

Según la configuración y los permisos que conceda cada servidor, Hoshiko ofrece las siguientes funciones:

1. **Niveles, Experiencia (Texto y Voz) y Perfiles Visuales:**
   - Progresión local por servidor y progresión global por mensajes de texto, además de experiencia local por tiempo de permanencia en canales de voz activos (calculando únicamente tiempo conectado y estado de silencio/ensordecimiento, sin grabar ni procesar audio de voz).
   - Generación de tarjetas visuales (ranking, perfil, actividad de presencia como Spotify o Roblox, y tarjetas recreativas de redes sociales) e insignias de reputación.
2. **Módulos Comunitarios y Sociales:**
   - Sistema de confesiones comunitarias (`/confess`), buzón de sugerencias (`/suggest`), dinámicas de afinidad y parejas (`/ship`, `/pareja`), estado AFK (`/afk`), rachas diarias grupales o en dúo (`/crear-racha`, `/racha`), roles automáticos por estado personalizado y roles por reacción.
3. **Inteligencia Artificial, Búsqueda y Utilidades:**
   - Asistencia conversacional en canal (por mención directa o respuesta) enrutada a través del gateway seguro Gemini Relay.
   - Resolución local instantánea de saludos cotidianos y preguntas básicas sin acudir a modelos externos.
   - Memoria personal soberana del usuario gestionable y borrable en cualquier momento (`/memory`).
   - Depósitos y administración de cuotas equitativas con reposición en ciclos deslizantes de 24 horas (`/ai usage`, `/ai panel`).
   - Traducción rápida de textos (`/translate`), búsqueda de imágenes, consulta de letras musicales (`/lyrics`) e información de usuario, avatares y actividad (`/avatars`, `/users`, `/activity`).
4. **Moderación Manual y AutoMod Convencional:**
   - Comandos para moderadores (`/warn`, `/mute`, `/unmute`, `/kick`, `/ban`, `/unban`, `/tempban`, `/massban`, `/purge`, `/case`, `/cases`, `/historial`, `/lock`, `/unlock`, `/slowmode`).
   - Filtros automáticos configurables por el servidor: filtro de palabras prohibidas (con detección de evasiones y homóglifos), protección contra enlaces no permitidos o dominios de phishing, control de spam, módulo de recuperación temporal de mensajes eliminados (`/snipe`) y canales de registro de auditoría (`#mod-log`, `#message-log`, `#message-review`, `#voice-log`, `#server-logs`, `#join-log`, `#links-logs`).

---

## 4. Responsabilidades de los Administradores de Servidores

Quien añade o configura a Hoshiko en un servidor de Discord declara tener autoridad administrativa suficiente en dicha comunidad y asume las siguientes responsabilidades:

1. **Configuración Consciente y Aviso a la Comunidad:** Es responsabilidad exclusiva del administrador elegir qué módulos activa (en especial los canales de registro de mensajes editados/eliminados, el comando `/snipe`, el modo de ejecución automática de moderación `enforce` y los roles por estado) e informar adecuadamente a los miembros de su servidor sobre dichas reglas.
2. **Decisiones de Moderación y Reversión:** Las herramientas de moderación manual, heurística y asistida por IA operan como apoyo para el personal del servidor. Los administradores y moderadores conservan la responsabilidad final sobre las sanciones impuestas en su comunidad y disponen de comandos (`/unban`, `/unmute`, `/warn remove`) y botones en los registros de moderación para perdonar o revertir sanciones ante falsos positivos.
3. **Resguardo de Canales de Auditoría:** El administrador debe restringir los permisos de los canales de registro (`#mod-log`, `#message-log`, `#confess-log`, `#message-review`) exclusivamente al personal autorizado de su servidor.

---

## 5. Responsabilidades de los Usuarios y Uso Aceptable

Al utilizar Hoshiko, usted se compromete a no:

1. Utilizar el Bot, sus comandos o el sistema de confesiones para infringir la ley, acosar, difamar, amenazar, publicar datos privados de terceros (*doxxing*) o difundir material ilícito o de abuso infantil.
2. Intentar manipular las instrucciones internas de la inteligencia artificial (*prompt injection* o *jailbreaks*) ni forzar la generación de contenidos que vulneren las políticas de Discord o de los proveedores externos.
3. Eludir sanciones locales del servidor (como bloqueos en confesiones mediante `/confession-ban`, silenciamientos o expulsiones) utilizando cuentas secundarias.
4. Ejecutar solicitudes automatizadas masivas, abusar de errores técnicos o interferir con la estabilidad de la infraestructura del Bot.

### 5.1. Regla Especial sobre Confesiones
Aunque una confesión se publique como anónima frente a los miembros del canal, **Hoshiko registra internamente el identificador de Discord (`userId`) y el nombre de usuario (`authorTag`) del autor** con el fin de prevenir abusos, permitir al personal del servidor aplicar bloqueos locales (`/confession-ban`) o auditar infracciones graves mediante los controles habilitados.

---

## 6. Límites de la Inteligencia Artificial y la Moderación Automática

1. **Inexactitud de la IA:** Las respuestas conversacionales, traducciones y resúmenes generados mediante Google Gemini pueden contener errores, omisiones o imprecisiones. No constituyen asesoramiento legal, médico, financiero ni profesional de ningún tipo.
2. **Falsos Positivos y Negativos en AutoMod:** Los filtros de palabras, detectores de enlaces maliciosos y el clasificador de moderación asistido por IA pueden equivocarse al interpretar el contexto de un mensaje o no detectar determinadas infracciones. Cuando el administrador activa el modo `enforce`, el Bot puede eliminar mensajes o aplicar aislamientos temporales (*timeout*) automáticamente; en modo `shadow` o de revisión, envía alertas al canal del personal. No se garantiza que cada acción automática sea revisada previamente por una persona.

---

## 7. Contenido de Usuarios y Sugerencias

1. **Contenido del Usuario:** Usted conserva los derechos que le correspondan sobre el texto e imágenes que envía al Bot, y autoriza su procesamiento técnico en la medida necesaria para ejecutar la función solicitada y conforme a lo descrito en la [Política de Privacidad](./Privacy-Policy.md).
2. **Sugerencias al Proyecto:** Si envía ideas o propuestas de mejora funcional para Hoshiko, el titular podrá evaluarlas e implementarlas sin obligación de compensación económica. Esto no otorga ninguna licencia sobre mensajes privados ni contenidos ajenos a dicha sugerencia.

---

## 8. Modalidad Premium

Las funciones catalogadas como *Premium* dentro del código de Hoshiko (tales como canales ilimitados de confesiones, canales adicionales de mod-logs y prioridad en procesamiento) se gestionan actualmente de forma directa y administrativa por el titular mediante concesión manual (`/give-premium`). En la fase actual, **no existe pasarela de pagos automatizada ni cobros periódicos directos al usuario**. Antes de habilitar cualquier sistema de facturación o suscripción pública en el futuro, se publicarán los términos comerciales específicos de precios, formas de pago, cancelación y reembolsos aplicables.

---

## 9. Suspensión, Retirada del Servidor y Terminación

1. **Retirada por el Servidor:** Los administradores pueden retirar a Hoshiko de su servidor en cualquier momento desde los ajustes de Discord.
2. **Conservación de Datos al Salir del Servidor:** La retirada del Bot detiene la recepción de nuevos eventos del servidor, pero **no elimina automáticamente de forma inmediata todos los registros previos en la base de datos**. Las reglas de conservación y el procedimiento para solicitar la eliminación de datos locales o globales se detallan en la [Política de Privacidad](./Privacy-Policy.md).
3. **Restricción por Abuso:** El titular puede limitar funciones o bloquear el acceso al Bot a usuarios o servidores que incurran en abuso técnico, actividades ilícitas o incumplimientos graves de estos Términos o de las reglas de Discord.

---

## 10. Propiedad Intelectual y Servicios de Terceros

1. **Derechos de Hoshiko:** El código fuente, diseño de tarjetas propias y elementos distintivos de Hoshiko pertenecen a su titular (`v.sxn`, ver [`LICENSE`](../LICENSE)).
2. **Terceros y Atribuciones:** Las dependencias de software libre se rigen por sus respectivas licencias detalladas en [`ATTRIBUTIONS.md`](../ATTRIBUTIONS.md) y [`THIRD_PARTY_LICENSES.md`](../THIRD_PARTY_LICENSES.md). Discord, Google, Spotify, Roblox, Genius y demás marcas o servicios mencionados pertenecen a sus respectivos propietarios; su referencia responde únicamente a interoperabilidad o visualización informativa y no implica patrocinio ni afiliación.

---

## 11. Disponibilidad y Limitación de Responsabilidad

1. **Servicio según Disponibilidad:** Hoshiko se ofrece "tal cual" y "según disponibilidad". Puede experimentar interrupciones por mantenimiento, límites de cuota (*rate limits*), fallos de red o caídas de proveedores externos (Discord, Google, CubePath). No se garantiza disponibilidad ininterrumpida ni ausencia total de errores.
2. **Alcance de la Responsabilidad:** El titular no excluye ni limita responsabilidades que no puedan excluirse legalmente conforme a la normativa aplicable al usuario. En la medida permitida por dicha ley, el titular no será responsable por pérdidas indirectas, disputas internas de moderación en servidores de terceros, sanciones aplicadas por configuración de los administradores del servidor, ni por fallos de plataformas externas fuera de su control.

---

## 12. Modificaciones, Legislación y Contacto

1. **Actualizaciones:** Estos Términos pueden actualizarse cuando cambien las funciones del Bot o las exigencias legales, indicando la nueva fecha de revisión en la cabecera del documento.
2. **Legislación de Referencia:** La operación de Hoshiko toma como referencia las leyes de la **República del Ecuador**, sin perjuicio de los derechos imperativos que correspondan a los usuarios según las normas de protección al consumidor y de protección de datos de su país de residencia. Estos Términos no imponen arbitraje obligatorio ni renuncia a derechos irrenunciables.
3. **Contacto:** Para cualquier consulta legal, reporte de abuso o solicitud relacionada con el Servicio, escriba a [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).

---

### Historial de Cambios del Documento
- **`2.0.0` (2026-11-07):** Actualización integral conforme a Hoshiko v2.0.0. Incorporación de los términos de Inteligencia Artificial (asistencia conversacional vía Gemini Relay, cuotas deslizantes de 24h, memoria personal soberana y resolución local) y especificación de ventajas vigentes de la modalidad Premium.
- **`1.0.0` (2026-11-06):** Reconstrucción integral forense inicial del código de `apps/hoshiko`.
