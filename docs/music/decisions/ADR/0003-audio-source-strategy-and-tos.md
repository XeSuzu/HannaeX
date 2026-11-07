# ADR 0003: Estrategia de Fuentes de Audio y Cumplimiento de TOS

## Estado
Aceptado (Propuesto para implementación)

## Contexto
Las plataformas de streaming aplican diferentes políticas y restricciones técnicas:
- Spotify no permite la extracción ni transmisión directa de sus flujos de audio (protegidos con DRM).
- YouTube implementa detección de bots y bloqueos por IP de centros de datos, exigiendo tokens de verificación (PO-Token).
- SoundCloud y streams HTTP ofrecen soporte nativo sin DRM ni restricciones de verificación agresivas.

## Decisión
Implementar una estrategia disjunta de dos niveles:
1. **Separación de Búsqueda y Audio:**
   - Usar el plugin `lavasrc` en Lavalink para resolver enlaces y búsquedas de Spotify extrayendo únicamente **metadatos** (Título, Artista, ISRC).
   - Mapear dichos metadatos automáticamente a una fuente de audio compatible.
2. **Priorización de Fuentes de Audio:**
   - **Primaria:** YouTube Music (mediante plugin `youtube-source` con soporte de PO-Token).
   - **Fallback Transparente:** SoundCloud (`scsearch:`). Si YouTube retorna error 429 o bloqueo por bot, la pista se busca y reproduce inmediatamente desde SoundCloud.
   - **Fuentes Directas:** Permitir enlaces directos de SoundCloud, Bandcamp y emisoras de radio HTTP/Icecast.

## Consecuencias
- **Positivas:** Cumplimiento de términos legales de Spotify (no se rompe DRM); alta disponibilidad musical ante bloqueos intermitentes de YouTube; experiencia fluida para los usuarios al compartir enlaces de Spotify.
- **Riesgos:** La versión de una canción en SoundCloud o YouTube Music podría variar ligeramente respecto a la versión exacta de Spotify si el ISRC no coincide.
