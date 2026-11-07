# ADR 0002: Coexistencia del Nodo Lavalink en la Misma VM (CubePath)

## Estado
Aceptado (Propuesto para implementación)

## Contexto
El servidor VPS de HannaeX cuenta con 4 vCPUs compartidas y 8 GB de RAM bajo Ubuntu 24.04 LTS. La base de datos MongoDB fue migrada de Atlas a una instancia local en la misma VM por problemas de conectividad previos. Se evaluó si Lavalink debía desplegarse en un VPS externo independiente o en la misma máquina.

El objetivo inicial de evaluación es de **aproximadamente 10 reproducciones simultáneas**.

## Decisión
Desplegar Lavalink v4 como un **servicio Systemd local** dentro de la misma VM CubePath, comunicándose con Hoshiko mediante la interfaz de loopback (`127.0.0.1:2333`).

### Medidas de Convivencia:
1. **Límites de Memoria Estrictos:** Lavalink se limitará a 1024 MB de Heap (`-Xms256M -Xmx1024M`), MongoDB a 1.5 GB de cache WiredTiger y PM2 limitará el proceso bot a 1 GB.
2. **Seguridad de Red:** Lavalink se vinculará únicamente a `127.0.0.1`. No se abrirá el puerto 2333 en el cortafuegos UFW.
3. **Prioridad de Procesos:** Todos los servicios operarán con prioridad estándar `nice=0`, permitiendo que el scheduler del kernel de Linux distribuya las 4 vCPUs de forma equitativa.

## Consecuencias
- **Positivas:** Cero costos de infraestructura adicional; latencia de red casi nula entre Hoshiko y Lavalink (< 0.2 ms); arquitectura autocontenida y fácil de supervisar.
- **Riesgos:** La VM se convierte en un punto único de fallo (SPOF) para todos los servicios del bot. Si la concurrencia supera los 15 streams, será necesario evaluar la migración de Lavalink a una VM dedicada (Fase 2).
