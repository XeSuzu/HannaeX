---
type: architecture
status: planned
area: infrastructure
scope: system
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Arquitectura — Escalabilidad

## Propósito

Esta nota define cómo HannaeX podría crecer en número de servidores, usuarios, eventos, trabajos, integraciones y funciones sin degradar de forma descontrolada su disponibilidad, latencia o coste.

La escalabilidad no debe aplicarse antes de medir. Primero debe identificarse el cuello de botella real y después elegir la solución proporcional.

## Principio central

```text
Escalar no es añadir máquinas por defecto;
es eliminar límites concretos sin perder control.
```

## Dimensiones de crecimiento

HannaeX puede crecer en varias dimensiones:

- Número de guilds.
- Usuarios por guild.
- Eventos por segundo.
- Mensajes procesados.
- Sesiones de voz.
- Solicitudes de IA.
- Trabajos en cola.
- Tamaño de la base de datos.
- Número de integraciones.
- Cantidad de administradores.
- Volumen de logs y métricas.
- Número de instancias del bot.

Cada dimensión puede requerir una solución distinta.

## Límites actuales que deben medirse

Antes de escalar, conviene medir:

- Capacidad de procesamiento del proceso principal.
- Uso de CPU.
- Uso de memoria.
- Latencia de eventos.
- Latencia de base de datos.
- Conexiones disponibles.
- Rate limits de Discord.
- Capacidad de proveedores externos.
- Tamaño y edad de las colas.
- Frecuencia de errores.
- Coste por feature.

## Escalado vertical

Consiste en aumentar los recursos de una instancia:

- CPU.
- Memoria.
- Disco.
- Conexiones.
- Capacidad de red.

Ventajas:

- Menor complejidad.
- Cambios operativos simples.
- Adecuado para primeras etapas.

Limitaciones:

- Existe un límite físico o económico.
- Un fallo puede afectar todo el proceso.
- No resuelve necesariamente un cuello de botella externo.

## Escalado horizontal

Consiste en ejecutar varias instancias o workers.

```text
Instancia A
Instancia B
Instancia C
        ↓
Estado compartido o servicios coordinados
```

Requiere resolver:

- Sesiones.
- Duplicación de eventos.
- Locks.
- Jobs repetidos.
- Caché compartida.
- Configuración.
- Coordinación de schedulers.
- Estado del bot.

## Proceso principal y workers

Una separación útil puede ser:

```text
Bot principal
  ├── Gateway y eventos
  └── Respuestas rápidas

Workers
  ├── IA
  ├── Resúmenes
  ├── Mantenimiento
  ├── Sincronizaciones
  └── Notificaciones
```

Esto evita que una tarea lenta bloquee la recepción de eventos.

## Estado compartido

Para escalar horizontalmente, el estado importante no debe vivir únicamente en memoria local.

Debe externalizarse cuando sea necesario:

- Configuración.
- Cooldowns compartidos.
- Locks.
- Jobs.
- Sesiones.
- Idempotencia.
- Estado de proveedores.

La memoria local puede utilizarse como caché, pero no como única fuente de verdad para operaciones críticas.

## Sharding y Discord

El crecimiento de guilds y eventos puede requerir revisar la estrategia de conexión con Discord.

Debe determinarse:

- Cuándo una sola conexión deja de ser suficiente.
- Cómo se distribuyen los guilds.
- Qué eventos recibe cada shard.
- Cómo se comparten métricas y configuración.
- Cómo se despliegan cambios sin perder demasiados eventos.

La necesidad concreta depende del volumen y de las restricciones de Discord.

## Particionado por guild

Una forma natural de distribuir trabajo es por guild.

```text
Guild A → partición 1
Guild B → partición 2
Guild C → partición 3
```

Ventajas:

- Aislamiento lógico.
- Menor riesgo de mezclar datos.
- Procesamiento paralelo.
- Priorización por comunidad.

Riesgos:

- Guilds muy grandes pueden convertirse en hotspots.
- Reasignar particiones puede ser complejo.
- Jobs globales requieren coordinación.

## Hotspots

Un hotspot es una entidad que concentra más carga que el resto.

Ejemplos:

- Guild muy activo.
- Ranking consultado constantemente.
- Canal de anuncios.
- Cuenta con muchas transacciones.
- Proveedor de IA utilizado por un grupo grande.

Mitigaciones:

- Caché.
- Rate limiting.
- Particionado.
- Colas.
- Agregaciones.
- Réplicas de lectura.
- Límites por guild.
- Priorización.

## Base de datos

La persistencia puede convertirse en cuello de botella por:

- Consultas sin índices.
- Consultas repetidas.
- Documentos demasiado grandes.
- Escrituras simultáneas.
- Rankings costosos.
- Historiales sin retención.
- Índices excesivos.
- Conexiones mal gestionadas.

Medidas posibles:

- Índices adecuados.
- Proyecciones o lecturas parciales.
- Paginación.
- Agregaciones precomputadas.
- Caché.
- Archivado.
- Separación de lecturas y escrituras cuando sea necesario.
- Límites de consulta.

## Caché

La caché puede reducir latencia y carga de persistencia.

Candidatos:

- Configuración de guild.
- Rankings de periodos cortos.
- Metadatos de multimedia.
- Estado de proveedores.
- Permisos calculados por poco tiempo.
- Respuestas repetibles y no sensibles.

Debe definirse:

- TTL.
- Clave.
- Alcance.
- Invalidación.
- Tamaño máximo.
- Comportamiento ante fallo.

## Colas

Las colas permiten absorber picos de trabajo.

```text
Carga de eventos
        ↓
Cola absorbe pico
        ↓
Workers procesan a capacidad controlada
```

Debe vigilarse:

- Edad de los jobs.
- Tamaño de la cola.
- Capacidad de consumo.
- Retrasos.
- Dead-letter.
- Prioridades.

Una cola no arregla una tarea permanentemente demasiado lenta; solo retrasa su procesamiento.

## Rate limiting interno

Antes de alcanzar límites externos, HannaeX debe limitar su propio consumo.

Puede aplicarse por:

- Usuario.
- Guild.
- Feature.
- Proveedor.
- Worker.
- Tipo de operación.
- Plan.

Los límites deben ser observables y explicar el motivo de un rechazo sin revelar detalles explotables.

## Proveedores externos

El sistema puede escalar internamente y aun así estar limitado por un proveedor externo.

Debe medirse:

- Solicitudes permitidas.
- Latencia.
- Coste.
- Concurrencia.
- Cuotas.
- Errores.
- Capacidad de fallback.

El proveedor no debe recibir más solicitudes solo porque HannaeX tenga más workers.

## Escalabilidad de IA

Las solicitudes de IA pueden ser costosas y lentas.

Medidas posibles:

- Cooldowns.
- Límites por usuario y guild.
- Colas.
- Modelos diferenciados por tarea.
- Contextos pequeños.
- Cache de resultados seguros.
- Resúmenes progresivos.
- Priorización.
- Fallback sin IA.
- Control de tokens.

La escalabilidad no debe conseguirse enviando más datos privados a proveedores.

## Escalabilidad de memoria

La memoria puede crecer rápidamente si se guarda cada interacción.

Debe utilizarse:

- Criterio de relevancia.
- Resúmenes.
- Retención limitada.
- Expiración.
- Eliminación bajo solicitud.
- Índices adecuados.
- Separación por alcance.
- Límites por usuario y guild.

Guardar más no equivale a mejorar la continuidad.

## Escalabilidad de economía

Las operaciones de economía requieren consistencia antes que velocidad máxima.

Debe evitarse:

- Actualizar saldos sin atomicidad.
- Procesar transacciones duplicadas.
- Utilizar una caché como fuente única.
- Repartir una recompensa varias veces.

Puede escalarse mediante:

- Operaciones atómicas.
- Particionado por cuenta.
- Colas por usuario.
- Idempotencia.
- Historial append-only.
- Lecturas agregadas.

## Escalabilidad de rankings

Los rankings suelen ser costosos cuando se calculan en cada comando.

Opciones:

- Índices adecuados.
- Cache breve.
- Agregaciones periódicas.
- Materialized views o equivalentes.
- Paginación.
- Ranking por periodo.
- Actualización asíncrona.

Debe aceptarse consistencia eventual si el producto lo permite.

## Escalabilidad de voz

El tracking de voz puede producir eventos frecuentes.

Buenas prácticas:

- Agrupar actualizaciones.
- Guardar sesiones en lugar de cada cambio mínimo.
- Cerrar sesiones de forma idempotente.
- Procesar XP en workers.
- Evitar consultas por cada evento de presencia.
- Detectar sesiones abandonadas.

## Escalabilidad de logs

Los logs pueden superar rápidamente los datos funcionales.

Debe aplicarse:

- Niveles adecuados.
- Muestreo.
- Retención.
- Compresión.
- Agregación.
- Separación de auditoría.
- Redacción de datos.

No aumentar la retención de logs sin medir coste y privacidad.

## Disponibilidad y escalabilidad

Escalar no garantiza disponibilidad.

Debe contemplarse:

- Reinicio de procesos.
- Pérdida de una instancia.
- Caída de la base de datos.
- Caída de Discord.
- Caída de proveedores.
- Pérdida temporal de caché.
- Jobs pendientes.
- Recuperación de conexiones.

## Backpressure

Cuando la capacidad de procesamiento es menor que la entrada, HannaeX necesita backpressure.

Estrategias:

- Rechazo temporal.
- Rate limit.
- Priorización.
- Agrupación.
- Eliminación de trabajos obsoletos.
- Respuesta degradada.
- Aumento temporal de workers.

Es mejor rechazar de forma clara que aceptar trabajos que nunca podrán completarse.

## Coste

Cada estrategia de escalado debe evaluar:

- Infraestructura.
- Base de datos.
- Tráfico.
- Proveedores de IA.
- Almacenamiento.
- Logs.
- Operación.
- Complejidad de mantenimiento.

Un sistema más grande no siempre es mejor si el coste supera el valor generado.

## Límites por plan

Los planes pueden controlar consumo, pero los límites deben ser:

- Explícitos.
- Medibles.
- Aplicados de forma consistente.
- No manipulativos.
- Compatibles con la seguridad.

Ejemplos:

- Solicitudes de IA.
- Retención de memoria.
- Número de guilds.
- Jobs simultáneos.
- Almacenamiento.
- Integraciones.

## Estrategia de evolución

La evolución recomendada es:

```text
Proceso único bien estructurado
        ↓
Workers separados
        ↓
Caché y colas compartidas
        ↓
Escalado horizontal selectivo
        ↓
Particionado o sharding cuando exista evidencia
```

No se recomienda introducir distribución compleja antes de que exista una necesidad medible.

## Pruebas de carga

Debe probarse:

- Eventos por segundo.
- Comandos simultáneos.
- Lecturas y escrituras concurrentes.
- Jobs acumulados.
- Solicitudes de IA.
- Sesiones de voz.
- Rankings.
- Operaciones de economía.
- Recuperación después de un pico.

Las pruebas deben utilizar datos aislados y no afectar comunidades reales.

## Indicadores de capacidad

Conviene definir límites operativos:

- Latencia máxima aceptable.
- Tasa máxima de errores.
- Edad máxima de un job.
- Tamaño máximo de cola.
- Uso máximo de memoria.
- Uso máximo de CPU.
- Conexiones máximas.
- Coste máximo por operación.

## Estado actual

Esta nota define una estrategia planificada de escalabilidad.

Debe verificarse en el repositorio y la infraestructura real:

- Capacidad actual del proceso.
- Número de instancias.
- Uso de workers.
- Estado de caché.
- Estado de colas.
- Límites de base de datos.
- Rate limits externos.
- Métricas disponibles.
- Necesidad real de sharding.

## Ruta de implementación

1. Medir carga y latencia actuales.
2. Identificar los tres cuellos de botella principales.
3. Separar tareas lentas mediante workers.
4. Optimizar consultas e índices.
5. Añadir caché donde sea seguro.
6. Aplicar rate limiting y backpressure.
7. Medir costes por feature.
8. Ejecutar pruebas de carga aisladas.
9. Escalar horizontalmente solo donde exista evidencia.
10. Documentar límites y capacidad operativa.

## Decisiones pendientes

- ¿Cuál es la carga actual de HannaeX?
- ¿Qué componente se convierte primero en cuello de botella?
- ¿Se necesita sharding de Discord?
- ¿Qué jobs deben poder escalar horizontalmente?
- ¿Qué cache se utilizará?
- ¿Qué límites tendrá cada plan?
- ¿Qué objetivos de latencia deben cumplirse?
- ¿Cuál es el presupuesto operativo aceptable?
- ¿Qué métricas activarán una decisión de escalado?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[Arquitectura — Recuperación ante fallos]]
- [[05-Planes]]
