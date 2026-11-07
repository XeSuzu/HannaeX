# Evaluación de Proveedores de Búsqueda y Fuentes de Audio

## 1. Visión General y Límites Legales/Técnicos

Un error común en bots de Discord es asumir que todas las plataformas de música (Spotify, Apple Music, YouTube) permiten la extracción y retransmisión directa de sus flujos de audio. En la práctica:

1. **Spotify y Apple Music NO permiten la transmisión directa de audio.** Sus flujos están protegidos mediante DRM (Widevine/FairPlay) y sus Términos de Servicio prohíben expresamente la extracción de streams. **Solo se pueden utilizar como fuentes de búsqueda y metadatos.**
2. **YouTube implementa medidas anti-bot agresivas.** La extracción de audio sin navegador requiere el paso de tokens de origen (`PO-Token` / Proof of Origin), cookies de sesión o rotación de proxies en entornos de centros de datos (como CubePath).
3. **SoundCloud y streams HTTP son las fuentes más estables** para reproducción directa de audio sin fricción de autenticación continua.

---

## 2. Matriz de Evaluación por Proveedor

| Proveedor | Capacidad Soportada | Método Técnico en Lavalink v4 | Estabilidad en VPS | Riesgo / Consideraciones |
| :--- | :--- | :--- | :--- | :--- |
| **YouTube** | Búsqueda + Audio | Plugin `youtube-source` (lava-xm) | ⚠️ Media / Requiere PO-Token | Bloqueos por IP de datacenter (`Sign in to confirm you're not a bot`, HTTP 429). Requiere PO-Token o OAuth. |
| **Spotify** | Solo Búsqueda / Metadatos | Plugin `lavasrc` (Topiú) | ✅ Alta (usa Spotify Web API) | No emite audio. Resuelve la pista en YouTube o SoundCloud mediante título + artista + ISRC. |
| **SoundCloud** | Búsqueda + Audio | Fuente nativa de Lavaplayer | 🟢 Muy Alta | Baja tasa de bloqueos; excelente fuente de fallback si YouTube falla. |
| **Apple Music** | Solo Metadatos | Plugin `lavasrc` | ✅ Alta | Requiere credenciales de Apple Music Developer (o token anónimo). Resuelve en YouTube/SoundCloud. |
| **HTTP / Radio** | Solo Audio Directo | Fuente nativa de Lavaplayer | 🟢 Muy Alta | Ideal para streams de radios online (Icecast/Shoutcast, MP3, AAC). |
| **Bandcamp** | Búsqueda + Audio | Fuente nativa de Lavaplayer | 🟢 Alta | Permite pistas completas independientes. |

---

## 3. Estrategia de Resolución Indireccional (LavaSrc Plugin)

Para que los usuarios puedan pegar enlaces de Spotify (`https://open.spotify.com/track/...`) o buscar canciones populares sin violar los Términos de Servicio de Spotify, se implementa el patrón **Metadata Bridge**:

```text
Usuario envía enlace de Spotify
        │
        ▼
Lavalink recibe solicitud (GET /v4/loadtracks?identifier=...)
        │
        ▼
Plugin 'lavasrc' consulta Spotify API (Client Credentials)
        │
        ▼
Extrae metadatos:
  • Título: "Stay With Me"
  • Artista: "Miki Matsubara"
  • Duración: 300 s
  • ISRC: "JPPC08050010"
        │
        ▼
Motor de Resolución Busca en Proveedor de Audio Habilitado:
  1. Intento primario: YouTube Music (vía ISRC o "Stay With Me Miki Matsubara")
  2. Fallback secundario: SoundCloud
        │
        ▼
Pista de audio resuelta y lista para streaming
```

### Configuración Recomendada en `application.yml` de Lavalink v4:
```yaml
plugins:
  lavasrc:
    providers:
      - "ytsearch:\"%ISRC%\""
      - "ytsearch:%QUERY%"
      - "scsearch:%QUERY%"
    sources:
      spotify: true
      applemusic: false
      deezer: false
      yandex: false
    spotify:
      clientId: "SPOTIFY_CLIENT_ID"
      clientSecret: "SPOTIFY_CLIENT_SECRET"
      countryCode: "ES"
```

---

## 4. Mitigación de Bloqueos en YouTube (PO-Tokens y Cuotas)

Dado que YouTube bloquea activamente direcciones IP pertenecientes a rangos de hosting/VPS:

1. **Proof of Origin (PO-Token):** Lavalink v4 con el plugin `youtube-source` debe configurarse con tokens generados por navegadores reales o mediante un generador automatizado local (`youtube-trusted-session-generator`).
2. **Fallback Automático a SoundCloud:** Si una búsqueda en YouTube devuelve error `429 Too Many Requests` o `Bot Detection`, el `TrackResolver` de Hoshiko debe reintentar la búsqueda automáticamente en SoundCloud (`scsearch:query`) informando al usuario de la degradación elegante.
3. **Control de Rate Limits en Hoshiko:**
   - Limitar a un máximo de 5 búsquedas por usuario por minuto.
   - Cachear resultados de búsquedas idénticas en memoria (`LocalCacheService`) durante 15 minutos.
