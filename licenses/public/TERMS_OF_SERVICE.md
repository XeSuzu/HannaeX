# Términos y Condiciones de Uso de Hoshiko

**Título:** Términos y Condiciones de Uso de Hoshiko  
**Identificador de Versión:** `HOSHIKO-PUB-TOS-2.1.0`  
**Fecha de Elaboración:** 6 de noviembre de 2026  
**Fecha de Última Revisión:** 9 de noviembre de 2026  
**Estado:** `Vigente`  
**Alcance:** Aplicación principal de Discord **Hoshiko**. Las funciones de defensa perimetral operan como software desacoplado e independiente.  
**Referencias:** [Política de Privacidad](/privacy), [Licencia del Proyecto](https://github.com/XeSuzu/HannaeX/blob/master/LICENSE)  

---

Estos Términos y Condiciones (en adelante, los **"Términos"**) regulan el acceso y la utilización de **Hoshiko** (en adelante, el **"Bot"** o el **"Servicio"**), una aplicación para comunidades de Discord. Estos Términos no constituyen una licencia sobre el código fuente del proyecto, el cual se rige por su respectiva licencia de derechos reservados.

## 1. Identificación del Titular y Aceptación

1. **Titular y Operador:** Hoshiko es un proyecto desarrollado y operado por **Janner Garcia**, conocido públicamente como **v.sxn**, persona natural. Correo oficial de contacto: [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).
2. **Aceptación de las Condiciones:** Al invitar a Hoshiko a un servidor de Discord, configurar sus módulos o interactuar con sus comandos, usted (como usuario individual o como administrador del servidor) acepta quedar vinculado por estos Términos en la medida permitida por la ley aplicable. Si no está de acuerdo con estas estipulaciones, no utilice las funciones del Bot o solicite su retiro de la comunidad.
3. **Plataforma Discord:** La operatividad del Bot depende directamente de la plataforma Discord. Tanto los usuarios como los administradores de servidores se obligan a observar en todo momento los [Términos de Servicio de Discord](https://discord.com/terms), las [Directrices de la Comunidad de Discord](https://discord.com/guidelines) y la [Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy).

---

## 2. Requisitos de Edad

1. **Edad Mínima en Discord:** Para interactuar con Hoshiko debe tener al menos **13 años de edad**, o la edad mínima superior exigida por la legislación de su país de residencia para consentir válidamente el tratamiento de datos personales en servicios digitales (en Ecuador, la Ley Orgánica de Protección de Datos Personales establece los 15 años para el consentimiento directo de adolescentes sin intervención de representantes legales; en otros países puede variar entre 14 y 16 años).
2. **Restricciones en Funciones de Inteligencia Artificial (Google Gemini):** Las funciones conversacionales, de traducción y de asistencia del Bot utilizan la API de Google Gemini. De conformidad con las [Condiciones de Servicio de Gemini API](https://ai.google.dev/gemini-api/terms), las funciones asistidas por inteligencia artificial están destinadas a personas mayores de 18 años o que interactúen bajo la supervisión y autorización expresa de sus representantes legales.

---

## 3. Funcionalidades del Servicio

Según la configuración de cada servidor y los permisos otorgados, Hoshiko provee las siguientes prestaciones:

1. **Niveles, Experiencia (Texto y Voz) y Perfiles Visuales:**
   - Progresión de experiencia local y global por mensajes de texto, y experiencia local por permanencia en canales de voz activos (contabilizando únicamente el tiempo en línea y estado de silencio/ensordecimiento, sin grabar ni procesar flujos de audio).
   - Generación de tarjetas visuales de perfil, nivel, actividad en aplicaciones compatibles (como Spotify o Roblox) e insignias de reputación comunitaria.
2. **Módulos Comunitarios y Sociales:**
   - Publicación de confesiones comunitarias (`/confess`), buzón de sugerencias (`/suggest`), dinámicas recreativas de afinidad o parejas (`/ship`), estados de ausencia (`/afk`), seguimiento de rachas diarias (`/racha`), asignación de roles automáticos por estado y roles por reacción.
3. **Inteligencia Artificial, Búsqueda y Memoria Adaptativa Cifrada:**
   - Asistencia conversacional en canal (por mención directa o respuesta en hilo) procesada mediante una pasarela segura dedicada hacia Gemini API.
   - Resolución local e inmediata de saludos cotidianos y consultas frecuentes de soporte sin derivación externa ni latencias añadidas.
   - **Memoria Personal Soberana Cifrada (AES-256-GCM):** Hoshiko aprende de forma adaptativa preferencias, datos descriptivos y dinámicas de trato recíprocas compartidas por el usuario, almacenándolas en reposo en nuestra base de datos bajo cifrado estándar AES-256-GCM. Lo aprendido con un usuario tiene alcance global y se aplica en cualquier servidor de Discord donde interactúe con el Bot; no se comparte con otros usuarios ni se comercializa con terceros.
   - **Transmisión para Contextualización:** Al procesar consultas complejas de conversación con el usuario, los recuerdos personales pertinentes se descifran en memoria volátil y se integran dentro de las instrucciones enviadas a Google Gemini API para posibilitar una respuesta personalizada y contextualizada.
   - **Política de Capacidad (Límite de 20 Recuerdos):** Se fija un tope máximo de 20 recuerdos por usuario. Al llegar a este límite, los recuerdos aprendidos automáticamente se reemplazan comenzando por el más antiguo (FIFO); los recuerdos introducidos manualmente por el usuario se conservan de forma permanente y únicamente se suprimen a petición expresa del titular.
   - **Auditoría y Borrado Autónomo (`/ai panel`, `/memory`):** El usuario puede examinar sus recuerdos, suprimir entradas individuales o purgar toda su memoria de forma inmediata.
   - **Depósitos de Cuotas Diarias Independientes:** Saldos de 20 consultas de investigación y 40 de conversación general, con restablecimiento diario a las **00:00 hora de Ecuador** (`America/Guayaquil`), verificables en tiempo real mediante `/ai usage` y `/ai panel`.
   - **Búsqueda Web Contextual:** En solicitudes que requieran contrastar información reciente en internet, Hoshiko aplica un proceso escalonado de 10 segundos para evaluar fuentes fiables; las charlas casuales y consultas locales son de respuesta instantánea.
   - Herramientas auxiliares de traducción rápida (`/translate`), búsqueda de imágenes seguras, consulta de letras musicales (`/lyrics`) e información comunitaria de avatares y actividad reciente (`/avatars`, `/users`, `/activity`).
4. **Moderación Manual y Asistida:**
   - Comandos para el equipo de moderación (`/warn`, `/mute`, `/unmute`, `/kick`, `/ban`, `/unban`, `/tempban`, `/massban`, `/purge`, `/case`, `/cases`, `/historial`).
   - Filtros automáticos configurables por servidor: detección de palabras prohibidas, bloqueo de enlaces fraudulentos o phishing, mitigación de spam masivo, herramienta de recuperación temporal de mensajes eliminados (`/snipe`) y canales designados de auditoría.

---

## 4. Responsabilidades de los Administradores de Servidores

Quien añade o configura a Hoshiko en un servidor declara contar con facultades suficientes de administración en dicha comunidad y asume las siguientes obligaciones:

1. **Configuración Responsable e Información a la Comunidad:** Es responsabilidad del administrador determinar qué módulos habilita (en especial canales de auditoría de mensajes, roles por estado y la herramienta `/snipe`) e informar con transparencia a los miembros del servidor respecto al funcionamiento de tales herramientas.
2. **Criterio Disciplinario y Supervisión de Sanciones:** Las herramientas de moderación y clasificación heurística operan como mecanismos de auxilio para el equipo del servidor. La responsabilidad final por las sanciones aplicadas recae en los administradores y moderadores de cada comunidad, quienes disponen de las funciones necesarias para corregir o revocar penalizaciones erróneas.
3. **Control de Canales de Registro:** El personal del servidor debe restringir el acceso a los canales de auditoría interna exclusivamente a miembros autorizados del equipo de moderación.

---

## 5. Responsabilidades de los Usuarios y Reglas de Convivencia

Al interactuar con Hoshiko, usted se compromete a no:

1. Utilizar el Bot, sus comandos, su memoria comunitaria o el módulo de confesiones para cometer actos ilícitos, acosar, difamar, difundir datos privados de terceros (*doxxing*), formular amenazas o diseminar material de abuso o explotación infantil.
2. Intentar vulnerar o manipular las instrucciones internas del modelo de inteligencia artificial (*prompt injection* o *jailbreaks*), ni forzar la generación deliberada de contenidos que infrinjan las políticas de Discord o de los proveedores del servicio.
3. Evadir sanciones locales del servidor (como bloqueos en confesiones mediante `/confession-ban`, aislamientos temporales o expulsiones) empleando cuentas alternas.
4. Generar sobrecargas técnicas deliberadas, abusar de vulnerabilidades de software o interferir con la estabilidad del servicio.

### 5.1. Regla Especial sobre Memoria Comunitaria y Convivencia
La memoria comunitaria del servidor se encuentra sujeta a un filtro estricto de convivencia. Queda terminantemente prohibido registrar o inducir al Bot a almacenar acusaciones personales, insultos, controversias o comentarios despectivos sobre miembros del servidor. Hoshiko descarta activamente dicha información y solo admite el registro de proyectos técnicos, aficiones o roles constructivos, los cuales únicamente se evocan ante preguntas explícitas del interlocutor.

### 5.2. Regla Especial sobre Confesiones Comunitarias
Aunque una confesión se publique en modalidad anónima frente al resto de la comunidad, **Hoshiko preserva internamente el identificador de usuario y el nombre de cuenta del autor en Discord** a fin de prevenir abusos, posibilitar la aplicación de bloqueos por moderación (`/confession-ban`) y permitir la atención de infracciones graves por parte del equipo del servidor.

---

## 6. Límites de la Inteligencia Artificial y la Moderación Automática

1. **Naturaleza Probabilística de las Respuestas:** Las respuestas, traducciones y resúmenes provistos por inteligencia artificial pueden presentar imprecisiones, interpretaciones contextuales imperfectas o errores factuales. No constituyen bajo ningún concepto asesoramiento legal, médico, financiero ni profesional vinculante.
2. **Evaluación de Infracciones:** Los filtros automáticos de palabras, enlaces y moderación asistida pueden incurrir en falsos positivos o falsos negativos. Las decisiones automatizadas deben ser supervisadas por los moderadores del servidor cuando afecten sustancialmente la participación de los miembros en la comunidad.

---

## 7. Contenido de Usuarios, Personalización y Adaptación del Servicio

1. **Titularidad del Contenido y Personalización:** El usuario conserva todos los derechos morales y patrimoniales que le correspondan sobre el contenido que remite al Bot. Al interactuar con Hoshiko, el usuario autoriza el procesamiento de fragmentos de sus consultas e interacciones en los servidores donde participa, **única y exclusivamente para la personalización y memoria individual del propio Servicio hacia dicho usuario**.
2. **Cifrado en Reposo y Soberanía de Datos:** Los registros conversacionales y recuerdos se preservan en reposo en nuestra base de datos bajo **cifrado criptográfico AES-256-GCM**. Al procesar solicitudes conversacionales, los recuerdos pertinentes se transmiten descifrados a Google Gemini para contextualizar la respuesta. Estos datos no se emplean para entrenar modelos base de uso general de terceros, no se venden ni se divulgan a otros usuarios. El usuario conserva la soberanía permanente para consultar y suprimir esta información en cualquier momento mediante `/ai panel` o `/memory`.
3. **Sugerencias y Aportes:** Las ideas o sugerencias de mejora funcional que envíe voluntariamente al proyecto podrán ser evaluadas e incorporadas al Servicio sin que ello derive en derechos económicos ni obligaciones de compensación.

---

## 8. Modalidad de Funciones Especiales (Premium)

Las características catalogadas como *Premium* en el Bot (tales como ampliación de canales para registros o confesiones) se gestionan en la fase actual de manera directa y discrecional por el titular del proyecto mediante asignación manual. En esta fase, **no existen pasarelas de cobro automatizado ni suscripciones comerciales de pago periódico**. Previo a cualquier implementación de modalidades aranceladas o sistemas de pago en el futuro, se publicarán de forma oportuna las condiciones comerciales correspondientes.

---

## 9. Retirada del Servidor, Suspensión y Terminación

1. **Retiro por los Administradores:** Los administradores pueden remover a Hoshiko de su servidor en cualquier momento desde las opciones de administración de Discord.
2. **Conservación de Registros:** La retirada del Bot interrumpe de inmediato la recepción de eventos, pero **no conlleva un borrado destructivo automático de todos los registros históricos de esa comunidad en la base de datos**. Los criterios de conservación y el procedimiento para solicitar la eliminación de datos se especifican en la [Política de Privacidad](/privacy).
3. **Suspensión por Infracciones:** El titular del Servicio se reserva el derecho de restringir o revocar el acceso al Bot a usuarios o servidores que cometan abusos técnicos, violaciones a estos Términos o conductas lesivas contra la comunidad.

---

## 10. Propiedad Intelectual y Atribuciones

1. **Derechos de Hoshiko:** El código de la aplicación, el diseño gráfico de sus tarjetas visuales y los elementos característicos de Hoshiko pertenecen a su titular (`v.sxn`, consultar [`LICENSE`](https://github.com/XeSuzu/HannaeX/blob/master/LICENSE)).
2. **Marcas y Terceros:** Las librerías de software libre empleadas se rigen por sus respectivas licencias públicas. Discord, Google, Spotify, Roblox, Genius y demás marcas o logotipos aludidos en el Servicio son propiedad exclusiva de sus respectivos titulares; su inclusión obedece únicamente a razones de interoperabilidad técnica y visualización descriptiva, sin implicar patrocinio ni asociación formal.

---

## 11. Disponibilidad y Límite de Responsabilidad

1. **Disponibilidad del Servicio:** Hoshiko se proporciona "tal cual" y según disponibilidad técnica. El funcionamiento puede verse afectado por tareas de mantenimiento, límites de consulta fijados por la plataforma (*rate limits*) o incidencias ajenas en la infraestructura de proveedores externos (Discord, Google, servidores de alojamiento). No se garantiza una disponibilidad ininterrumpida ni libre de incidencias.
2. **Alcance de la Responsabilidad:** El titular no excluye ni restringe responsabilidades que resulten irrenunciables conforme al ordenamiento jurídico aplicable. Dentro del marco legal permitido, el titular no asume responsabilidad por daños indirectos, desacuerdos disciplinarios internos en servidores de terceros ni sanciones emanadas de la configuración dispuesta por los administradores de una comunidad.

---

## 12. Modificaciones, Ley Aplicable y Contacto

1. **Actualizaciones:** Estos Términos podrán modificarse periódicamente para adaptarse a nuevas funcionalidades o exigencias jurídicas, dejando constancia de la versión y fecha de actualización en la cabecera.
2. **Marco Legal de Referencia:** El funcionamiento de Hoshiko se rige conforme a las leyes de la **República del Ecuador**, sin perjuicio de los derechos imperativos que protejan a los usuarios según la legislación de su país de residencia.
3. **Canal de Contacto:** Para solicitudes, reportes de abusos o consultas relativas al Servicio, puede escribir a [janneralexandergg@gmail.com](mailto:janneralexandergg@gmail.com).

---

### Historial de Cambios del Documento
- **`2.1.0` (2026-11-09):** Actualización y alineación de conformidad técnica: corrección en la numeración correlativa de secciones especiales, precisión sobre la memoria personal global por usuario y su transmisión descifrada a Gemini en solicitudes de IA para contextualización, sustitución de términos de entrenamiento por personalización y memoria, y eliminación de referencias a cifrado de grado militar precisando su cifrado en reposo bajo AES-256-GCM.
- **`2.0.0` (2026-11-07):** Actualización integral conforme a Hoshiko v2.0.0. Incorporación de los términos de Inteligencia Artificial (asistencia conversacional vía pasarela segura, cuotas diarias de 24 horas, memoria personal soberana y resolución local) y especificación de ventajas vigentes de la modalidad Premium.
- **`1.0.0` (2026-11-06):** Redacción inicial de los Términos y Condiciones de Uso de Hoshiko.
