# Hoshiko System: Arquitectura UI y Moderación Inteligente

Este documento detalla el plan estratégico integral para la reestructuración del núcleo de configuración (`setup.ts`) y la implementación de un ecosistema de seguridad híbrido impulsado por Heurística de Anomalías, Inteligencia Artificial y patrones de alta disponibilidad.

---

## PILAR 1: Rediseño Modular de la Interfaz (`setup.ts`)

### 1.1 Objetivo
Transicionar de embeds monolíticos de gran tamaño hacia una **interfaz basada en componentes**. Se busca reducir la fricción visual, agrupar la información de forma lógica y gestionar la navegación en un único mensaje interactivo.

### 1.2 Implementación UI/UX
* **Menú Núcleo (Main Panel):** Embed compacto que actúa como *Dashboard*. Muestra la configuración actual usando *inline fields* (Comportamiento, Seguridad, Chat) y contiene la navegación primaria mediante `ActionRow` (Botones de categoría).
* **Gestión Multimedia por Subpanel:**
  * Cada submenú renderiza su propia ilustración temática (Banner panorámico 21:9 o Thumbnail superior derecho).
  * *Optimización Visual:* Para evitar parpadeos o retrasos de carga (`pop-in`), los enlaces de las imágenes deben ser estáticos y nativos de la CDN de Discord (alojados en un servidor privado).
* **Transiciones de Estado (`interaction.update`):** El comando evalúa el `customId` presionado y reconstruye el embed en el mismo mensaje. Para optimizar, el estado se pasa en el propio string del botón (ej. `setup_seguridad_lvl2`). Toda vista incluye un botón `[ <- Volver ]`.

---

## PILAR 2: Motor Heurístico de Anomalías (Threat Scoring)

Se abandona el enfoque de "X acciones en Y segundos". El sistema evalúa la **aceleración** y la **naturaleza** de los eventos en el servidor a través de `automodState.ts`.

### 2.1 Medidor de Estrés Dinámico
Hoshiko crea una línea base (Baseline Profiling). Cualquier desviación suma puntos a un "Medidor de Estrés" (0 a 100).
* **Metadatos Sospechosos:** Cuentas sin avatar (+10 pts), creadas hace < 24h (+20 pts), nombres irregulares (+15 pts).
* **Entropía de Acción (Clustering):**
  * *Cross-Channel Spam:* Hashes de imágenes idénticos o variaciones mínimas de texto en múltiples canales simultáneamente (+40 pts).
  * *VC Thrashing:* Saltos rápidos entre canales de voz sin interacción de texto (+25 pts).
* **Enfriamiento (Decay):** El estrés decae constantemente (-1 punto por segundo) delegando esta tarea al TTL automático de Redis para no bloquear el Event Loop de Node.js.

---

## PILAR 3: Moderación Asistida por IA (Gemini)

Cuando el Medidor de Estrés alcanza un umbral crítico, el sistema delega el análisis profundo a la IA.

### 3.1 Filtros y Capacidades Multimodales
* **Bypass & Toxicidad:** Prompt estructurado para detectar *leetspeak*, discursos de odio ocultos y phishing semántico.
* **Vision & OCR:** Análisis proactivo de previsualizaciones web e imágenes.
* **Trust Factor:** A usuarios con historial impecable (`globalProfile.model.ts`) se les levanta una bandera para revisión manual. A las cuentas nuevas se les aplica tolerancia cero.

---

## PILAR 4: Perfiles de Seguridad Dinámicos

La configuración del servidor define la velocidad con la que se llena el Medidor de Estrés. El subpanel de **Seguridad** ofrecerá 4 perfiles a través de un menú desplegable:

1. **Nivel 1: Relajado** (Comunidades privadas). El medidor requiere picos masivos (+150 pts). Se asume inocencia en cuentas nuevas.
2. **Nivel 2: Estándar** (Por defecto). Actúa a los 100 pts. Sanciona multicuentas locales y detona time-outs quirúrgicos.
3. **Nivel 3: Estricto** (Servidores grandes). Actúa a los 60 pts. Mínimas señales de spam disparan la intervención estricta de la IA.
4. **Nivel 4: Paranoico / Lockdown** (Modo Emergencia). Actúa a los 30 pts. Cierra bienvenidas, revoca envíos a `@everyone`, detiene la creación de canales y usa la *Sentinel Network*.

---

## PILAR 5: Logs Interactivos (Centro de Comando)

Los canales de log se convierten en tableros de acción accionables.

### 5.1 Estructura y Acción
* **Alerta Visual:** Embed Rojo/Naranja mostrando nivel de estrés, usuarios implicados y veredicto de la IA.
* **Botones de Respuesta Rápida (ActionRow):**
  * 🔨 **Actuar/Sancionar:** Menú para aislar/banear.
  * 🧹 **Purga Masiva:** Borra todo rastro de los infractores en todos los canales.
  * 🔗 **Ir al Mensaje:** Redirige al contexto.
  * ✅ **Falso Positivo:** Restaura mensajes, perdona estrés y añade a la whitelist.
  * 🌐 **Reportar a Sentinel:** Añade a la blacklist global.

### 5.2 Manejo Seguro de Estado
* Al hacer clic, el embed se actualiza (Verde/Gris), los botones **se desactivan (`setDisabled(true)`)** para evitar duplicidad, y se inyecta la firma del moderador que resolvió el incidente.

---

## PILAR 6: Rendimiento y Optimización de Datos

Para evitar cuellos de botella durante ataques masivos:

* **Redis como Cerebro Real-Time:** El Medidor de Estrés y los Hashes viven en Redis, operando en milisegundos.
* **Colas y Workers para IA:** Las peticiones a Gemini se envían a través de `QueueService.ts`. Se usa **Batching** (agrupar 10 mensajes en 1 sola petición) para no saturar la API externa.
* **Escrituras en Bloque (Bulk Writes):** Actualizaciones menores de base de datos (Trust Score, XP) se acumulan en memoria y se guardan en MongoDB cada 5 minutos, reduciendo la carga de red.
* **Logs Asíncronos (Fire-and-Forget):** El envío de alertas mediante `WebhookManager.ts` nunca usa `await` bloqueante en el flujo principal de moderación.

---

## PILAR 7: Resiliencia y Degradación Elegante (Fallbacks)

El sistema está diseñado para sobrevivir a caídas de servicios y picos de estrés extremos.

* **Circuit Breaker (Cortacircuitos) de IA:** Si la API de Gemini falla o presenta latencia excesiva 3 veces seguidas, el sistema corta la comunicación para salvar la memoria RAM. Se activa automáticamente el **Modo Heurístico Estricto** (expresiones regulares locales) y se alerta a los administradores.
* **Protección API Discord (El "Torniquete"):** Durante un raid, la primera acción siempre es revocar `SEND_MESSAGES` a `@everyone` (1 sola llamada API). Los baneos masivos se procesan mediante **Chunking** (lotes pausados) para evitar que Discord bloquee globalmente al bot.
* **Caché en Cascada (L1/L2):** Si Redis cae, el sistema hace un *fallback* automático a `LocalCacheService.ts` usando un `Map()` nativo de Node.js.
* **Rechazo de Carga (Load Shedding):** Si la CPU supera el 85%, Hoshiko apaga temporalmente sistemas no críticos (ganancia de XP, tracking de avatares) y dedica el 100% de la CPU a la moderación.
* **Debouncing UI:** Se previenen errores de "Interacción fallida" desactivando instantáneamente los botones de la UI al primer clic, y enviando respuestas efímeras en caso de timeout.