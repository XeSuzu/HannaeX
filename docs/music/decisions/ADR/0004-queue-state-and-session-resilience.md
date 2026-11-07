# ADR 0004: Gestión de Estado de Colas y Resiliencia de Sesiones

## Estado
Aceptado (Propuesto para implementación)

## Contexto
Durante la reproducción musical, el estado incluye la cola de canciones pendientes, la pista actual, el modo de repetición (`loop`) y el volumen. Guardar cada cambio de cola en MongoDB generaría una sobrecarga innecesaria de escrituras I/O en la base de datos local. Por otro lado, si el proceso de Hoshiko se reinicia (por ejemplo, tras un despliegue con PM2), la música no debería cortarse abruptamente si es posible evitarlo.

## Decisión
1. **Colas Efímeras en Memoria:** Mantener el estado activo de reproducción (`GuildPlayer`, `QueueManager`) estrictamente en la memoria RAM del proceso Hoshiko (`Map<string, GuildPlayer>`). No persistir la cola activa en MongoDB.
2. **Resumabilidad de Sesiones Lavalink (Session Resuming):**
   - Configurar `lavalink.server.resuming.timeout: 60` en Lavalink v4.
   - Cuando Hoshiko se reinicie por PM2 (< 5 segundos), Lavalink mantendrá el socket de audio transmitiendo a Discord Voice.
   - Al iniciar, Shoukaku se reconectará al mismo `sessionId` y reanudará el control del reproductor sin reiniciar la pista.
3. **Persistencia Selectiva en MongoDB:**
   - Únicamente persistir datos duraderos en MongoDB: playlists personalizadas de usuarios (`PlaylistModel`) y configuración de música por servidor (`ServerConfig.music`).

## Consecuencias
- **Positivas:** Cero operaciones de base de datos durante la reproducción normal de canciones; respuesta instantánea de comandos `/skip` y `/queue`; resiliencia ante reinicios rápidos de despliegue.
- **Riesgos:** Si el servidor se apaga completamente o el reinicio excede los 60 segundos, las colas activas se perderán y los usuarios deberán iniciar una nueva reproducción.
