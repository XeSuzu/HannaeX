# Evaluación de Infraestructura y Coexistencia de Servicios

## 1. Perfil del Entorno Objetivo (CubePath VPS)

| Parámetro | Especificación de la VM | Capacidad Efectiva |
| :--- | :--- | :--- |
| **CPU** | 4 vCPU compartidas (x86_64) | Adecuada para tareas mixtas I/O bound y decodificación multimedia ligera. |
| **Memoria RAM** | 8 GB física (~7.2 GiB utilizables por OS) | Suficiente para stack co-ubicado si se aplican límites estrictos. |
| **Almacenamiento** | 100 GB SSD NVMe | Sobrado para logs, binarios y colecciones de base de datos. |
| **Transferencia Mensual** | 20 TB / mes | Prácticamente ilimitada para audio Opus (~200 GB/mes para 10 streams continuos). |
| **Sistema Operativo** | Ubuntu 24.04 LTS | Soporte a largo plazo, kernel moderno, systemd y cgroups v2. |
| **Gestores de Procesos**| PM2 (Node.js) + Systemd (Servicios) | Supervisión y auto-reinicio ante caídas. |

---

## 2. Topología de Procesos en la Misma Máquina

Para cumplir con la premisa de no agregar infraestructura externa innecesaria, todos los componentes se ejecutan **dentro del mismo VPS**, diferenciando estrictamente entre dependencias locales, procesos independientes y servicios externos:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CubePath VPS (Ubuntu 24.04)                     │
│                                                                        │
│  ┌───────────────────────┐              ┌───────────────────────────┐  │
│  │   PM2 Process Mgr     │              │     Systemd Services      │  │
│  │  • hoshiko-bot (Node) │              │  • lavalink.service (Java)│  │
│  │  • hoshiko-worker     │              │  • mongod.service (DB)    │  │
│  │    (idle / opcional)  │              │  • redis-server (opcional)│  │
│  └───────────┬───────────┘              └─────────────┬─────────────┘  │
│              │                                        │                │
│              └──────────── Red Loopback (127.0.0.1) ──┘                │
│                                   │                                    │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                               Salida WAN (Internet)
                                    ▼
       ┌────────────────────────────┴───────────────────────────┐
       │ Discord Gateway / Discord Voice Server / APIs Externas │
       └────────────────────────────────────────────────────────┘
```

---

## 3. Presupuesto y Límites Estrictos de Memoria RAM

Para evitar que el **OOM Killer** del kernel termine procesos críticos por competencia de memoria, se establecen límites máximos por componente:

| Proceso / Componente | Consumo Nominal | Límite Máximo Configurado | Mecanismo de Control |
| :--- | :--- | :--- | :--- |
| **Kernel de Ubuntu + Buffers de E/S** | ~600 MB | 1.5 GB | Reserva nativa del kernel |
| **MongoDB 7.0 (WiredTiger Cache)** | ~400 MB | 1.5 GB | `storage.wiredTiger.engineConfig.cacheSizeGB: 1.5` en `/etc/mongod.conf` |
| **Lavalink v4 (JVM OpenJDK 21)** | ~350 MB | 1.0 GB | Flags `-Xms256M -Xmx1024M` en `lavalink.service` |
| **Hoshiko Bot (Node.js)** | ~250 MB | 1.0 GB | `max_memory_restart: "1G"` en `ecosystem.config.js` |
| **Redis Server (Caché / BullMQ)** | ~30 MB | 0.25 GB (256 MB) | `maxmemory 256mb` + `noeviction` en `redis.conf` |
| **TOTAL MÁXIMO ASIGNADO** | **~1.63 GB** | **5.25 GB** | **Margen de seguridad: > 2.5 GB libres** |

---

## 4. Competencia de CPU entre Decodificación de Audio y MongoDB

### Dinámica de Carga:
1. **Lavalink:** Consume ciclos de CPU intermitentes al decodificar pistas complejas a tramas Opus. Con 10 reproducciones simultáneas, el uso se estima entre un 15% y un 25% de la capacidad de 2 núcleos virtuales.
2. **MongoDB:** Realiza escrituras periódicas en disco (checkpoints cada 60s) y búsquedas indexadas. Las lecturas/escrituras de HannaeX tienen un costo de CPU inferior al 5% continuo.
3. **Hoshiko Bot:** Procesa eventos de Gateway e inferencias ligeras; el Event Loop consume < 5% salvo durante renderizado síncrono de Canvas.

### Mitigación de Interferencia:
- Lavalink debe ejecutarse con prioridad estándar (`Nice=0`), mientras que `mongod.service` opera con optimizaciones de E/S estándar.
- No se requiere afinidad de CPU fija (core pinning) para 10 streams; el scheduler CFS de Linux reparte eficientemente la carga entre las 4 vCPUs.

---

## 5. Análisis de Punto Único de Fallo (SPOF) y Riesgo de MongoDB Local

La migración desde Atlas hacia una instancia local dentro de la misma VM resolvió los problemas de latencia y cortes de red previos, pero introduce riesgos arquitectónicos que deben gestionarse:

### Riesgos Identificados:
1. **Pérdida Catastrófica por Fallo de VM:** Si el disco virtual de CubePath se corrompe o la instancia se destruye, se pierden tanto la aplicación como la base de datos y cualquier respaldo almacenado localmente en `/home/hanna/HannaeX/backups/`.
2. **Caída Silenciosa de MongoDB:**
   - En `src/Services/mongo.ts`, el `serverSelectionTimeoutMS` está fijado en 30 segundos.
   - Si MongoDB deja de responder, las consultas de Hoshiko se bloquean en el buffer de Mongoose hasta que expira el timeout, superando la ventana de 3 segundos de Discord y arrojando errores `InteractionNotReplied` a los usuarios.
   - No existen escuchadores de eventos `mongoose.connection.on('disconnected')` para degradar el estado del bot de forma inmediata.

### Recomendaciones Operativas para la Implementación Futura:
- **Automatización de Backups Fuera de la VM:** Implementar un cron nocturno que ejecute `mongodump`, comprima con cifrado GPG y envíe el archivo a un almacenamiento S3 / Cloud Storage independiente de CubePath.
- **Circuit Breaker en Mongo:** Registrar un listener en `mongoose.connection` que pase a modo degradado inmediatamente ante una pérdida de conexión, evitando que los comandos se congelen durante 30 segundos.
