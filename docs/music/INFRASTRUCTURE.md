# Hoshiko Music: Infraestructura, Recursos y Red del VPS

## 1. Perfil del Entorno de Ejecución (CubePath VPS)

HannaeX se aloja en una máquina virtual de **CubePath** con las siguientes características operativas:

| Parámetro | Especificación del VPS | Capacidad Efectiva para Música |
| :--- | :--- | :--- |
| **CPU** | 4 vCPU compartidas (x86_64) | Adecuada para I/O concurrentes y decodificación multimedia ligera. |
| **Memoria RAM** | 8 GB física (~7.2 GiB utilizables por OS) | Suficiente para stack co-ubicado si se aplican límites de memoria estrictos. |
| **Almacenamiento**| 100 GB SSD NVMe | Holgado para el SO, binarios de Java, colecciones de MongoDB y logs. |
| **Ancho de Banda**| 20 TB / mes | Prácticamente ilimitado para audio Opus (~200 GB/mes para 10 streams continuos). |
| **Sistema Operativo**| Ubuntu 24.04 LTS | Soporte a largo plazo, kernel moderno, cgroups v2 y systemd. |
| **Supervisores** | PM2 (Node.js) + Systemd (Servicios) | Recuperación automática ante excepciones no capturadas o caídas del proceso. |

---

## 2. Topología de Procesos Co-ubicados en la Misma VM

Para evitar la contratación innecesaria de infraestructura adicional en la etapa inicial, todos los servicios se ejecutan **dentro del mismo VPS**, diferenciando estrictamente entre sus entornos de aislamiento:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CubePath VPS (Ubuntu 24.04)                          │
│                                                                              │
│   ┌─────────────────────────────┐           ┌────────────────────────────┐   │
│   │     PM2 Process Manager     │           │      Systemd Services      │   │
│   │                             │           │                            │   │
│   │   • hoshiko-bot (Node.js)   │           │   • lavalink.service (JVM) │   │
│   │   • hoshiko-worker (opc.)   │           │   • mongod.service (DB)    │   │
│   │                             │           │   • redis-server (caché)   │   │
│   └──────────────┬──────────────┘           └─────────────┬──────────────┘   │
│                  │                                        │                  │
│                  └────────── Red Loopback (127.0.0.1) ────┘                  │
│                                           │                                  │
└───────────────────────────────────────────┼──────────────────────────────────┘
                                            │ Tráfico Saliente / Entrante
                                            ▼
           ┌────────────────────────────────┴────────────────────────┐
           │ Discord Gateway (WSS) / Voice (UDP) / APIs (HTTPS)      │
           └─────────────────────────────────────────────────────────┘
```

---

## 3. Presupuesto y Asignación Estricta de Memoria RAM

El principal riesgo operativo en un entorno con base de datos local y máquina virtual de Java (JVM) es el **OOM Killer** (Out-Of-Memory Killer) del kernel de Linux, el cual liquida procesos cuando la memoria libre se agota.

Para garantizar la estabilidad del sistema, se fijan techos máximos inmutables por componente:

| Servicio / Componente | Consumo Promedio | Límite Máximo Configurado | Mecanismo de Control Técnico |
| :--- | :--- | :--- | :--- |
| **Kernel Ubuntu + Buffers SO** | ~600 MB | 1.5 GB | Reserva nativa del kernel de Linux |
| **MongoDB 7.0 (WiredTiger)** | ~400 MB | 1.5 GB | `cacheSizeGB: 1.5` en `/etc/mongod.conf` |
| **Lavalink v4 (Java 21 JVM)** | ~350 MB | 1.0 GB | Flags `-Xms256M -Xmx1024M` en servicio systemd |
| **Hoshiko Bot (Node.js 20+)** | ~250 MB | 1.0 GB | `max_memory_restart: "1G"` en PM2 |
| **Redis Server (LocalCache)** | ~30 MB | 0.25 GB (256 MB) | `maxmemory 256mb` + directiva `noeviction` |
| **TOTAL MÁXIMO RESERVADO** | **~1.63 GB** | **5.25 GB** | **Margen de seguridad: > 2.5 GB libres** |

> [!IMPORTANT]
> **Margen Operativo:** Con una reserva teórica máxima de 5.25 GB sobre los 7.2 GB disponibles, el sistema mantiene más de 2.5 GB de margen libre para picos de tráfico, renderizados puntuales de Canvas en workers y buffers de E/S del sistema operativo.

---

## 4. Carga de CPU y Planificación de Hilos

1. **Decodificación de Audio:**
   - La transcodificación de audio de formatos comprimidos a Opus es una tarea de CPU ligera pero constante.
   - Para un volumen de **10 reproducciones simultáneas**, el consumo se estima entre un 15% y un 25% de la capacidad de 2 núcleos virtuales.
2. **Convivencia con MongoDB:**
   - Las operaciones de base de datos de HannaeX consisten principalmente en lecturas indexadas y escrituras puntuales (checkpoints cada 60s), con un impacto de CPU continuo inferior al 5%.
3. **Prioridad de Procesos:**
   - Todos los procesos operan con prioridad estándar `nice=0`. El scheduler CFS (Completely Fair Scheduler) del kernel de Linux distribuye equitativamente las tareas entre los 4 núcleos sin requerir afinidad de CPU fija (*core pinning*).

---

## 5. Seguridad de Red y Configuración Perimetral

1. **Enlace Estricto a Loopback:**
   - En la configuración de Lavalink (`application.yml`), el parámetro `server.address` debe fijarse estrictamente en `127.0.0.1`.
   - **Bajo ninguna circunstancia** debe configurarse en `0.0.0.0`.
2. **Cortafuegos UFW:**
   - El puerto `2333` (Lavalink) **no** debe figurar en las reglas de entrada de UFW. Solo el puerto SSH (y los puertos públicos HTTP si aplica) deben ser accesibles desde el exterior.
3. **Autenticación Fuerte del Nodo:**
   - La contraseña de conexión entre Hoshiko y Lavalink se generará mediante entropía criptográfica (`openssl rand -hex 16`) y se inyectará mediante variables de entorno seguras (`LAVALINK_PASSWORD`), sin exponerse en archivos rastreados por Git.

---

## 6. Puntos Únicos de Fallo (SPOF) y Mitigaciones Obligatorias

La investigación identificó vulnerabilidades arquitectónicas preexistentes derivadas de la migración de MongoDB desde Atlas hacia la VM local:

### Vulnerabilidades Identificadas:
1. **Riesgo Catastrófico por Corrupción de VM:** Si el disco virtual de CubePath se daña o la máquina se pierde, se perdería el bot y la base de datos completa.
2. **Bloqueo Silencioso por Timeout de MongoDB:**
   - En `src/Services/mongo.ts`, el parámetro `serverSelectionTimeoutMS` se encuentra fijado en 30 segundos.
   - Si MongoDB local se detiene o se bloquea, las consultas de Hoshiko quedan retenidas en el buffer de Mongoose hasta que expira el timeout, excediendo la ventana de 3 segundos de Discord y provocando fallos generalizados `InteractionNotReplied`.

### Mitigaciones Planificadas (Prerrequisitos antes de Producción):
- **Automatización de Backups Externos:** Configurar un script cron que ejecute `mongodump`, comprima con cifrado GPG y sincronice el respaldo a un bucket S3 o Cloud Storage externo independiente de CubePath.
- **Circuit Breaker y Degradación Rápida en Mongoose:** Reducir el timeout de selección de servidor y registrar escuchadores de eventos `mongoose.connection.on('disconnected')` para pasar inmediatamente a modo de servicio degradado sin congelar el Event Loop.
