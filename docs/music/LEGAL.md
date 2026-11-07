# Hoshiko Music: Marco Legal, Contractual y Términos de Servicio

## 1. Descargo de Responsabilidad y Advertencia Inicial

> [!CAUTION]
> **Aviso de Cumplimiento y Límites de Plataformas:**
> La arquitectura y mecanismos de resolución descritos en esta documentación **no constituyen una autorización formal, licencia comercial ni respaldo explícito** por parte de plataformas como YouTube (Google LLC), Spotify AB o Discord Inc.
> 
> La extracción o retransmisión de flujos multimedia a través de herramientas automatizadas (como Lavaplayer o plugins de Lavalink) opera en un entorno de **alta volatilidad técnica y riesgo contractual**, sujeto a las políticas de uso y medidas tecnológicas de protección de cada proveedor.

---

## 2. Términos de Servicio de Discord (Developer Terms of Service)

El desarrollo e integración de funciones de audio en Discord está regulado por la **Discord Developer Policy** y las **Community Guidelines**:

### Principios Obligatorios y Cumplimiento de Hoshiko:
1. **Invariante Estricto de Privacidad (Cero Grabación de Voz):**
   - La política de Discord prohíbe taxativamente la monitorización, grabación o almacenamiento de comunicaciones de voz de los usuarios sin su conocimiento y consentimiento expreso.
   - **Garantía Técnica de Hoshiko:** El módulo de música opera exclusivamente en modo de **emisión saliente (outbound RTP)**. El bot transmite tramas Opus hacia el canal de voz; **no se procesa, no se analiza y no se almacena ningún paquete de audio entrante (inbound RTP)** de los usuarios en el canal.
2. **Uso Responsable de la API de Voz:**
   - Queda prohibido generar tráfico abusivo o saturar la infraestructura de WebRTC de Discord.
   - Hoshiko implementa una desconexión automática tras 5 minutos de inactividad o si todos los usuarios humanos abandonan el canal, liberando de inmediato las conexiones UDP de los servidores de Discord.

---

## 3. Términos de Servicio de YouTube y Riesgos de Scraping

YouTube prohíbe expresamente en sus Términos de Servicio el acceso a contenidos mediante tecnologías automatizadas distintas a sus APIs oficiales, así como la elusión de mecanismos tecnológicos de protección:

### Análisis de Riesgo y Precedentes:
- **Precedentes en el Ecosistema:** Bots musicales masivos y comerciales (como *Groovy* o *Rythm*) recibieron notificaciones de cese y desestimiento (*Cease & Desist*) por parte de Google debido a la monetización de funciones de streaming de YouTube y la eliminación de publicidad.
- **Medidas Anti-Bot de la Plataforma:** YouTube despliega bloqueos activos por IP (`HTTP 429 Too Many Requests`, desafíos de bot) contra centros de datos, exigiendo tokens de verificación de navegador (*PO-Tokens*).
- **Postura del Proyecto:** Hoshiko no monetiza la reproducción de audio ni comercializa el acceso a pistas de YouTube. No obstante, se reconoce el riesgo de que las fuentes de YouTube puedan degradarse o quedar inaccesibles en cualquier momento debido a cambios en la infraestructura de Google.

---

## 4. Términos de Servicio de Spotify y Protección DRM

Spotify no ofrece flujos de audio abiertos ni APIs públicas para streaming a aplicaciones de terceros. Sus archivos están protegidos mediante cifrado **Widevine DRM**:

### Estrategia de Cumplimiento Técnico (Metadata Bridge):
1. **No se elude el DRM:** Hoshiko **no intenta descifrar ni extraer audio de los servidores de Spotify**.
2. **Uso Exclusivo de Metadatos:** La integración con Spotify se limita estrictamente a la **Spotify Web API oficial** bajo una aplicación registrada con credenciales de desarrollador (*Client Credentials Flow*).
3. **Mapeo a Fuentes Abiertas:** La API se utiliza únicamente para leer el catálogo informativo (título, artista, álbum, código ISRC) y presentar la interfaz al usuario. El audio efectivo que suena en Discord se resuelve en plataformas alternativas habilitadas (YouTube Music o SoundCloud).

---

## 5. Derechos de Autor, DMCA y Propiedad Intelectual

1. **Notificaciones de Retirada (DMCA Takedown):**
   - Como proyecto que interactúa con plataformas de terceros, cualquier solicitud legítima de retirada de contenido o restricción de acceso emitida por titulares de derechos debe ser acatada de inmediato.
2. **Naturaleza del Proyecto:**
   - Hoshiko opera como un bot comunitario y multipropósito para servidores de Discord, donde la música es una funcionalidad complementaria y no un servicio comercial con ánimo de lucro.
3. **Responsabilidad de los Usuarios:**
   - La reproducción se inicia a petición individual de los miembros en sus propios canales privados o comunitarios de Discord.

---

## 6. Buenas Prácticas y Recomendaciones para la Implementación

Para minimizar la exposición operativa y legal:

1. **Evitar Monetización Agresiva de Música:** No colocar comandos esenciales de audio (`/play`, `/skip`) detrás de muros de pago o suscripciones obligatorias.
2. **Arquitectura Multi-Proveedor:** No depender en exclusiva de YouTube. Mantener activas fuentes con menor fricción contractual como SoundCloud o estaciones de radio públicas vía HTTP.
3. **Transparencia con la Comunidad:** Informar con claridad en los mensajes de error del bot cuando una pista no pueda reproducirse debido a restricciones impuestas por las plataformas de origen.
