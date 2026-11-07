# Evaluación Técnica de Lavalink v4 para Hoshiko Music

## 1. Resumen Ejecutivo

Para la integración musical de **Hoshiko (HannaeX)**, se evalúa **Lavalink v4** como motor de audio desacoplado. El bot actúa como orquestador de comandos y eventos de Discord, mientras que Lavalink asume la decodificación de audio, el control de flujo WebRTC/UDP y la conexión directa con los servidores de voz de Discord.

Esta separación es crítica para el rendimiento de HannaeX: Node.js (single-threaded) no debe procesar ni transcodificar paquetes de audio en su Event Loop principal, evitando bloqueos en la respuesta de comandos slash, filtros de automod e IA conversacional.

---

## 2. Compatibilidad con el Stack de HannaeX

| Componente | Versión en HannaeX | Compatibilidad con Lavalink v4 | Estado |
| :--- | :--- | :--- | :--- |
| **Node.js** | >= 20.x LTS | Compatible nativamente con WebSockets y Fetch API estándar. | ✅ Verificado |
| **Discord.js** | v14.16.3 | Compatible mediante envío de paquetes de voz (Opcode 4 Gateway). | ✅ Verificado |
| **TypeScript** | v5.x (strict) | Soporte de tipos completo mediante clientes tipados modernos. | ✅ Verificado |
| **Sistema Operativo** | Ubuntu 24.04 LTS | Soporta OpenJDK 21 headless y systemd nativo. | ✅ Verificado |

---

## 3. Versión Recomendada de Lavalink: v4.x (v4.0.8+)

Lavalink v3 está obsoleto y en desuso. La arquitectura debe basarse estrictamente en **Lavalink v4**, cuyas diferencias técnicas clave son:

1. **API REST v4 Estandarizada:** Endpoints bajo `/v4/...` con rutas semánticas como `/v4/sessions/{sessionId}/players/{guildId}`.
2. **Arquitectura de Plugins Nativos:** Lavalink v4 desacopló los proveedores de audio de su núcleo. Las fuentes propietarias como YouTube ya no vienen embebidas y se gestionan mediante plugins modulares descargados automáticamente al arrancar.
3. **Manejo Robusto de Sesiones y Resuming:** Permite que un cliente se reconecte y reclame sus reproductores sin interrumpir la música audible en Discord ante reinicios breves del bot.
4. **Filtros de Audio Nativos:** Ecualizador, karaoke, timescale, tremolo y vibrato ejecutados en C++/Java mediante JNI sin carga para Node.js.

---

## 4. Selección del Cliente de Integración en Node.js

Se evaluaron las tres opciones principales del ecosistema para Discord.js v14:

| Criterio | `shoukaku` (v4.x) | `lavalink-client` | `magmastream` |
| :--- | :--- | :--- | :--- |
| **Filosofía** | Minimalista, wrapper robusto y ligero del protocolo. | Cliente "baterías incluidas" con gestor de colas propio. | Fork de erela.js adaptado a v4 con alta capa de abstracción. |
| **Sobrecarga de Memoria** | Muy baja (< 5 MB). | Media (~15-25 MB por abstracciones extra). | Media (~20 MB). |
| **Control de Colas** | Delegado completamente a la aplicación (HannaeX). | Control rígido dentro de la biblioteca. | Control interno con hooks. |
| **Mantenimiento y Estabilidad** | Altísimo (mantenido por Deivu / standard en bots grandes). | Alto (Tomato6966). | Medio (dependiente de comunidad legacy). |
| **Alineación con HannaeX (Ponytail)** | **ÓPTIMA:** El cambio más limpio y desacoplado. | Regular: Duplica lógica de estados. | Baja: Arrastra patrones heredados de v3. |

> [!TIP]
> **Recomendación Técnica:** Utilizar **`shoukaku`**. Proporciona el contrato más limpio y flexible para manejar conexiones de nodos, sesiones y eventos WebSocket, permitiendo a HannaeX estructurar su propio `QueueManager` en memoria sin acoplamientos innecesarios.

---

## 5. Requisitos de Runtime (Java) y Despliegue en Ubuntu 24.04

Lavalink v4 requiere **Java 17 o Java 21 LTS**. Para Ubuntu 24.04, se recomienda la instalación del runtime headless oficial:

```bash
sudo apt update
sudo apt install openjdk-21-jre-headless
java -version
```

### Configuración como Servicio Systemd (`/etc/systemd/system/lavalink.service`)
```ini
[Unit]
Description=Lavalink Audio Node
After=network.target

[Service]
Type=simple
User=hanna
WorkingDirectory=/home/hanna/lavalink
ExecStart=/usr/bin/java -Xms256M -Xmx1024M -XX:+UseG1GC -jar Lavalink.jar
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

---

## 6. Estimación de Consumo de Recursos (VPS 4 vCPU / 8 GB RAM)

Para un escenario de **10 reproducciones simultáneas** en canales de voz:

| Componente / Métrica | En Reposo (0 Streams) | Con 10 Streams Simultáneos | Límite Máximo Asignado |
| :--- | :--- | :--- | :--- |
| **Lavalink RAM (JVM Heap)** | ~180 MB | ~350 - 480 MB | `1024 MB` (`-Xmx1024M`) |
| **Lavalink CPU** | < 0.5% | 15% - 22% (distribuido en 4 cores) | Limitado por prioridad de proceso |
| **Tráfico de Red (Audio RTP)** | 0 kbps | ~640 kbps (64 kbps por stream) | Despreciable vs límite de 20 TB/mes |
| **Uso de Inodos / Disco** | ~150 MB (JAR + Plugins) | Mínimo (sin persistencia en disco de streams) | 100 GB SSD disponibles |

> [!NOTE]
> **Conclusión de Capacidad:** El consumo conjunto de Lavalink (~480 MB), Hoshiko Bot (~250 MB), MongoDB Local (~800 MB) y Redis (~30 MB) totaliza aproximadamente **1.56 GB de RAM**, operando holgadamente dentro de los **7.2 GiB reales** disponibles en la máquina.

---

## 7. Configuración de Seguridad y Red

1. **Enlace Estricto a Loopback:** `server.address: 127.0.0.1` en `application.yml`. Nunca enlazar a `0.0.0.0`.
2. **Protección Perimetral:** El puerto `2333` **no** debe figurar en las reglas permitidas de UFW.
3. **Autenticación Fuerte:** Configurar una contraseña aleatoria de 32 bytes generada por `openssl rand -hex 16` e inyectada mediante variable de entorno o archivo de configuración protegido (`0600`).
4. **Resumabilidad de Sesiones (Session Resuming):**
   ```yaml
   lavalink:
     server:
       password: "PASSWORD_ROBUSTA"
       playerUpdateInterval: 5
       resuming:
         timeout: 60
   ```

---

## 8. Gestión del Ciclo de Audio: Cuatro Fases Obligatorias

Para evitar confusiones en la implementación de proveedores, la arquitectura divide el procesamiento de audio en 4 fases técnicas disjuntas:

```text
[1. Búsqueda y Metadatos] ──► [2. Resolución de Pista] ──► [3. Acceso al Stream] ──► [4. Decodificación & RTP]
   (HTTP Search / ISRC)          (Extractor / Plugin)         (Fetch de chunks de audio)    (Lavaplayer JNI -> Discord Voice)
```

1. **Búsqueda y Metadatos:** Consulta inicial del texto o URL introducido por el usuario. Retorna título, artista, duración, miniatura y un identificador único (ISRC o ID externo).
2. **Resolución de Pista:** Traducción del identificador a un recurso reproducible. En proveedores indirectos (Spotify/Apple Music), este paso mapea los metadatos hacia una fuente reproducible (YouTube o SoundCloud).
3. **Acceso a la Fuente de Audio:** Negociación de la conexión HTTP/HTTPS con el CDN o servidor multimedia del proveedor. Requiere manejar rate limits, rotación de cookies o tokens de prueba de origen (PO-Tokens).
4. **Decodificación y Transmisión:** Lavaplayer decodifica el flujo (MP3, AAC, Opus, WebM) y lo re-empaqueta en tramas Opus a 48 kHz / 2 canales, transmitiéndolas directamente al servidor de voz de Discord por UDP.
