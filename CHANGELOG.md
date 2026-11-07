# Registro de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo siguiendo los principios de [Versionado Semántico (SemVer)](https://semver.org/lang/es/).

---

## [2.0.0] — Renacimiento Cósmico & Arquitectura Modular

*Esta actualización marca un antes y un después en Hoshiko. Transformamos por completo los cimientos del bot para ofrecer una experiencia más ágil, cercana y confiable. Separamos las herramientas de protección avanzada en su propio espacio independiente (Hoshiko Security), rediseñamos la inteligencia conversacional para que Hoshiko te recuerde con calidez y naturalidad, y reinventamos el sistema de niveles con tarjetas gráficas totalmente personalizables por cada servidor.*

### ✨ Novedades

- **Personalización Total de Tarjetas de Nivel por Servidor (`/setup-levels card`):**
  - Los administradores ahora pueden personalizar la apariencia de las tarjetas de nivel (`/rank` y `/vcrank`) para adaptarlas a la identidad visual de su comunidad.
  - Soporte para **imágenes de fondo externas** con escalado inteligente (`object-fit: cover`) y filtro de contraste automático para asegurar que el texto sea siempre legible.
  - **Textos y etiquetas editables**: Cambia el prefijo de nivel (`Nivel`, `Rango`, `Tier`), las etiquetas del panel lateral (`TOP`, `SERVIDOR`, `CLAN`) y añade un lema exclusivo para el servidor.
  - **Modo Vista Previa en Vivo (*Live Preview*)**: Genera al instante una muestra gráfica real (`preview-rank.png`) dentro del panel de configuración antes de aplicar los cambios.
  - Opción de **Fondo Forzado**: Permite al servidor imponer un diseño uniforme para todos los miembros o dejarlo como fondo predeterminado respetando las preferencias individuales.

- **Leaderboard Unificado e Interactivo (`/leaderboard`):**
  - Panel interactivo centralizado que permite alternar con un solo clic entre las categorías de **Texto** (💬), **Voz** (🎙️) y **Semanal** (⚡).
  - Paginación fluida (`⏮️`, `◀️`, `▶️`, `⏭️`) con visualización destacada para el podio (Top 3) mediante citas en bloque limpias y barras de progreso.
  - Cuenta regresiva de reinicio semanal dinámico adaptado a la zona horaria de cada usuario (`⏳ Reinicio de temporada: en X días`).

- **Memoria Conversacional y Asistente de IA (Fases 1 y 2):**
  - Hoshiko ahora recuerda de manera orgánica tus preferencias, apodos y temas de interés sin mezclar información entre servidores.
  - Incorporación de sesiones privadas y colas FIFO por canal para garantizar respuestas fluidas y sin colisiones.
  - Respuestas locales inteligentes para consultas frecuentes sobre la comunidad antes de acudir al modelo de lenguaje.

- **Roles Automáticos por Nivel de Voz (`/level-roles`):**
  - Los hitos de nivel en canales de voz ahora activan automáticamente la entrega de roles de recompensa configurados en el servidor, reconociendo el tiempo dedicado en llamada.

- **Rediseño del Centro de Ayuda y Descubrimiento (`/help`):**
  - Navegación interactiva reestructurada con categorización precisa: separación neta entre **Niveles** (📈), **Inteligencia Artificial** (🧠), **Moderación** (🛡️) y **Utilidades** (🔧).
  - Introspección dinámica de comandos y descripciones enriquecidas con permisos requeridos, sintaxis y ejemplos de uso prácticos.
  - Purga completa de categorías o botones huérfanos delegados a Hoshiko Security.

- **Comando Informativo de Membresía (`/premium`):**
  - Nuevo comando público para consultar la licencia del servidor y conocer los beneficios reales vigentes (confesiones ilimitadas, canales de auditoría extendidos y prioridad en servicios).

- **Expansión Global de Tipografías en Canvas:**
  - Registro de fuentes ampliado en `@napi-rs/canvas` con soporte nativo para caracteres asiáticos (CJK: japonés, chino, coreano), símbolos astrológicos y runas, operadores matemáticos, Nerd Fonts y emojis a todo color.

---

### 🚀 Mejoras

- **Fórmulas de Experiencia en Tiempo Constante O(1):**
  - Reemplazo de bucles acumulativos por fórmulas matemáticas cerradas (`xpRules.ts`) para el cálculo de XP y niveles, eliminando latencia en servidores con alto volumen de actividad.
- **Caché Inteligente Multinivel (`LevelConfigCache` & `LocalCacheService`):**
  - Implementación de centinelas de caché con TTL en memoria para servidores sin configuración activa, mitigando tormentas de consultas innecesarias hacia MongoDB.
- **Identidad Conversacional Pulida:**
  - Depuración integral de respuestas mecánicas ("Operación ejecutada con éxito", "Acceso denegado") y expresiones excesivamente infantiles, consolidando una voz cálida, cercana, tranquila y respetuosa en cada interacción.
- **Alineación Visual en Leaderboards:**
  - Formato monoespaciado exacto para puestos del 4 al 10 en la primera página y del 11 en adelante en páginas secundarias, asegurando una presentación simétrica tanto en clientes móviles como de escritorio.
- **Optimización en la Adquisición de Interacciones:**
  - Reconocimiento inmediato (`deferUpdate`) en milisegundos para paneles interactivos, evitando el vencimiento de la ventana de 3 segundos de la API de Discord.

---

### 🛡️ Arquitectura y Seguridad

- **Consolidación del Monorepo (`apps/hoshiko` & `apps/hoshiko-security`):**
  - Separación estricta de responsabilidades bajo npm workspaces: Hoshiko conserva la gestión de comunidad, moderación convencional, niveles e IA; Hoshiko Security asume en exclusiva los módulos Sentinel, Anti-Raid, Anti-Nuke, Lockdown y Honeypot.
  - Aislamiento completo de dependencias y código fuente entre ambas aplicaciones sin acoplamientos circulares.
- **AutoMod con Detección de Entropía:**
  - Algoritmo mejorado para detectar spam caótico, caracteres aleatorios y patrones de flood sin afectar conversaciones legítimas.
- **Moderación Disciplinaria Atómica:**
  - Secuenciación estricta en el registro de casos (`/case`) y reintentos con retroceso exponencial (*exponential backoff*) para sanciones temporales de Discord.

---

### 🐛 Correcciones

- Solucionado el error `Unknown interaction` al pulsar el botón de personalización de tarjeta de nivel gracias al reconocimiento anticipado de eventos.
- Corregido el rechazo HTTP 400 (`Scheme "attachment" is not supported`) en Discord cuando un embed de vista previa no contenía archivos adjuntos.
- Implementado avatar vectorial de respaldo en Canvas cuando la imagen de perfil del usuario no puede descargarse por red o formato no compatible.
- Corregido el restablecimiento accidental de minutos semanales de voz al cruzar semanas mientras una llamada continuaba activa.
- Resuelto el problema de concurrencia en la actualización de historiales de usuario y avatares mediante operadores atómicos de MongoDB.

---

## [1.0.0] — Lanzamiento Inicial

- Estructura monolítica inicial de Hoshiko.
- Comandos básicos de moderación, niveles convencionales y soporte inicial de Gemini AI.
