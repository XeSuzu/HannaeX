# ADR 0001: Selección del Cliente de Lavalink para Node.js

## Estado
Aceptado (Propuesto para implementación)

## Contexto
Hoshiko (HannaeX) requiere conectarse a un nodo de audio Lavalink v4 mediante WebSocket y REST. Existen tres clientes principales en el ecosistema de Discord.js v14:
1. `shoukaku`: Abstracción ligera, estrictamente tipada, mantenida activamente por Deivu.
2. `lavalink-client`: Cliente con soporte Lavalink v4 que incluye gestor de colas y plugins internos.
3. `magmastream`: Adaptación para v4 derivada de la arquitectura de erela.js.

El proyecto HannaeX se rige por el principio `ponytail` (la solución más simple y pequeña que resuelva el problema de raíz, sin sobre-ingeniería ni abstracciones redundantes).

## Decisión
Seleccionar **`shoukaku`** como cliente oficial de Lavalink para HannaeX.

### Justificación:
- **Aislamiento de Responsabilidades:** `shoukaku` maneja exclusivamente la capa de transporte: conexión de nodos, reconexión automática, envío de paquetes a Discord Gateway y llamadas a la API REST v4 de Lavalink.
- **Libertad de Modelado:** HannaeX implementará su propio `QueueManager` en memoria bajo `src/Features/music/`, adaptado exactamente a las reglas de negocio de Hoshiko (permisos de DJ, límites de tiempo, historial).
- **Consumo Mínimo de Recursos:** `shoukaku` no añade dependencias pesadas ni estructuras de datos complejas en memoria, minimizando el impacto en el Event Loop de Node.js.

## Consecuencias
- **Positivas:** Control total sobre la lógica de reproducción; cero código muerto; mantenimiento simplificado.
- **Riesgos:** HannaeX debe implementar su propia clase para gestionar la cola FIFO y las opciones de repetición (`loop: off | track | queue`).
