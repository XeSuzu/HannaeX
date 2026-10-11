---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Arquitectura — Despliegue

## Propósito

Esta nota define cómo debería construirse, configurar, desplegarse, actualizarse y recuperarse HannaeX en sus distintos entornos.

El objetivo es que un cambio pueda pasar de desarrollo a producción de forma repetible, verificable y reversible cuando sea posible.

La arquitectura descrita es planificada. El método real de despliegue, la infraestructura y los servicios utilizados deben verificarse en el repositorio y en el entorno operativo.

## Principio central

```text
Un despliegue debe ser repetible, observable y seguro.
```

No debe depender de pasos manuales ocultos ni de conocimiento exclusivo de una persona.

## Entornos

La ruta recomendada es:

```text
development
        ↓
test
        ↓
staging, si aplica
        ↓
production
```

Cada entorno debe tener separación suficiente en:

- Tokens.
- Bases de datos.
- Colas.
- Cachés.
- Guilds de prueba.
- Proveedores.
- Logs.
- Backups.

## Artefacto de despliegue

El despliegue debe utilizar un artefacto identificable.

Puede ser:

- Imagen de contenedor.
- Paquete versionado.
- Release del repositorio.
- Build reproducible.

El artefacto debe asociarse con:

- Commit.
- Versión de la aplicación.
- Versión del esquema.
- Versión de configuración.
- Fecha de compilación.
- Dependencias relevantes.

## Flujo de entrega

```text
Cambio de código
        ↓
Revisión
        ↓
Tests
        ↓
Build
        ↓
Análisis de dependencias
        ↓
Artefacto versionado
        ↓
Despliegue en test
        ↓
Smoke tests
        ↓
Staging, si aplica
        ↓
Aprobación
        ↓
Producción
        ↓
Verificación
```

## Repositorio y ramas

La estrategia exacta debe adaptarse al equipo, pero debe existir una forma clara de distinguir:

- Trabajo en desarrollo.
- Cambios revisables.
- Versión desplegable.
- Versión en producción.

Toda versión de producción debe poder rastrearse hasta un commit o release.

## Build

El build debe:

- Instalar dependencias bloqueadas.
- Ejecutar validación de tipos.
- Ejecutar lint cuando aplique.
- Ejecutar tests.
- Compilar TypeScript si corresponde.
- Generar el artefacto.
- Incluir solo archivos necesarios.
- No incluir secretos.

Un build exitoso no garantiza que la aplicación esté lista para producción; todavía deben verificarse configuración y dependencias.

## Dependencias

Las dependencias deben instalarse de forma reproducible.

Buenas prácticas:

- Usar lockfile.
- Revisar cambios de versiones.
- Evitar instalaciones no fijadas.
- Analizar vulnerabilidades.
- Reducir dependencias no utilizadas.
- Documentar cambios relevantes.

## Configuración de despliegue

La configuración sensible debe inyectarse durante el despliegue.

El artefacto no debe contener:

- Token de Discord.
- Claves API.
- Contraseñas.
- Credenciales de base de datos.
- Secretos de webhooks.
- Credenciales de pagos.

La aplicación debe validar la configuración antes de aceptar trabajo.

## Migraciones

Las migraciones deben ejecutarse mediante un procedimiento controlado.

```text
Crear backup o punto de recuperación
        ↓
Verificar compatibilidad
        ↓
Ejecutar migración
        ↓
Validar resultado
        ↓
Iniciar versión nueva
        ↓
Ejecutar smoke tests
```

Una migración debe ser compatible con el código que todavía puede estar ejecutándose durante una actualización gradual.

## Orden de despliegue

Cuando existen bot, workers y scheduler, el orden puede ser:

```text
Base de datos compatible
        ↓
Workers compatibles
        ↓
Bot principal
        ↓
Schedulers
        ↓
Activación de flags
```

El orden final depende de la estrategia de compatibilidad y de la infraestructura real.

## Compatibilidad hacia atrás

Durante una actualización, puede haber procesos con versiones distintas.

Por eso deben evitarse cambios que rompan inmediatamente:

- Payloads de colas.
- Modelos persistidos.
- Eventos internos.
- Configuración.
- Contratos de proveedores.

Cuando sea necesario:

```text
Versión antigua acepta formato nuevo
        ↓
Migración gradual
        ↓
Nueva versión se vuelve dominante
        ↓
Retiro del formato antiguo
```

## Health checks

Después del despliegue deben comprobarse:

- Proceso activo.
- Conexión a base de datos.
- Estado de la cola.
- Conexión de Discord.
- Proveedores esenciales.
- Migraciones completadas.
- Configuración válida.
- Capacidad de responder una interacción de prueba.

Debe distinguirse:

```text
Liveness  = el proceso está vivo.
Readiness = está listo para recibir trabajo.
```

## Smoke tests

Los smoke tests deben comprobar el camino mínimo de la aplicación.

Ejemplos:

- El proceso inicia.
- El bot conecta a Discord.
- La base de datos responde.
- Se carga la configuración.
- Un comando informativo funciona.
- Un repositorio básico puede leer datos.
- El logger funciona.
- El proveedor crítico responde o se marca como degradado.

No deben modificar datos reales de forma destructiva.

## Despliegue gradual

Cuando sea posible, utilizar:

- Activación por guild.
- Feature flags.
- Canary release.
- Porcentaje reducido de tráfico.
- Worker nuevo con cola limitada.
- Rollout por regiones o grupos.

La activación gradual permite detectar problemas antes de afectar a toda la instalación.

## Rollback

Todo despliegue debe tener una estrategia de rollback.

Debe contemplar:

- Revertir el artefacto.
- Desactivar el feature flag.
- Detener workers incompatibles.
- Restaurar configuración compatible.
- Revertir o compensar migraciones.
- Reprocesar trabajos pendientes.
- Verificar integridad de datos.

No todas las migraciones pueden revertirse automáticamente. En esos casos debe definirse un procedimiento de compensación.

## Despliegue de workers

Los workers requieren consideración adicional:

- Compatibilidad de jobs.
- Número de consumidores.
- Concurrencia.
- Reintentos.
- Dead-letter queue.
- Jobs en ejecución.
- Jobs creados por una versión anterior.

Antes de retirar una versión, debe verificarse que no deje trabajos imposibles de procesar.

## Despliegue del scheduler

Debe evitarse ejecutar varios schedulers no coordinados que dupliquen trabajos.

Opciones:

- Una única instancia líder.
- Lock distribuido.
- Scheduler externo.
- Jobs idempotentes.
- Coordinación mediante cola.

Incluso con coordinación, los trabajos programados deben ser idempotentes.

## Discord y despliegue

Los cambios de comandos pueden requerir registro o actualización en Discord.

Debe diferenciarse entre:

- Comandos de desarrollo.
- Comandos de un guild de prueba.
- Comandos globales.

Los comandos globales pueden tardar más en reflejarse. El proceso de despliegue debe tenerlo en cuenta.

También deben verificarse:

- Intents.
- Permisos solicitados.
- Permisos reales del bot.
- Canales configurados.
- Roles configurados.
- Guilds disponibles.

## Despliegue de configuración

Los cambios de configuración deben seguir una ruta controlada:

```text
Cambio propuesto
        ↓
Validación
        ↓
Revisión
        ↓
Aplicación en entorno de prueba
        ↓
Verificación
        ↓
Producción
```

Los secretos se despliegan por un canal separado del código.

## Versionado

La versión debe poder obtenerse desde:

- Comando interno.
- Log de arranque.
- Dashboard futuro.
- Health endpoint o diagnóstico.
- Registro de despliegue.

Ejemplo conceptual:

```ts
interface BuildInfo {
  version: string;
  commit: string;
  builtAt: string;
  environment: string;
  schemaVersion: string;
}
```

## Rollout y feature flags

Una feature nueva puede seguir este proceso:

```text
Código detrás de flag
        ↓
Flag desactivado
        ↓
Prueba interna
        ↓
Guild de prueba
        ↓
Grupo pequeño
        ↓
Activación general
```

Si aparece un problema, se puede desactivar la feature sin retirar todo el despliegue.

## Errores de inicio

Si falta una dependencia crítica:

- No iniciar parcialmente de forma insegura.
- Registrar un error operativo claro.
- No mostrar secretos.
- Marcar el proceso como no listo.
- Evitar aceptar eventos que no puede procesar correctamente.

Las dependencias opcionales pueden permitir modo degradado si está diseñado explícitamente.

## Modo degradado

Ejemplos:

- IA no disponible: comandos no relacionados continúan.
- Música no disponible: economía y comunidad continúan.
- Caché no disponible: usar persistencia con límites.
- Proveedor secundario caído: utilizar fallback o informar.
- Worker pausado: mantener funciones inmediatas si son seguras.

El modo degradado no debe ocultar que una función no está disponible.

## Infraestructura

La infraestructura concreta puede incluir:

- Proceso persistente.
- Contenedor.
- Máquina virtual.
- Servicio administrado.
- Base de datos gestionada.
- Redis.
- Cola.
- Almacenamiento de archivos.
- Monitorización.

La elección debe considerar:

- Coste.
- Latencia.
- Disponibilidad.
- Escalabilidad.
- Complejidad operativa.
- Copias de seguridad.
- Seguridad.
- Capacidad del equipo.

## Recursos y límites

Cada proceso debe tener límites para evitar consumir todo el sistema.

Ejemplos:

- Memoria.
- CPU.
- Conexiones de base de datos.
- Concurrencia de workers.
- Tamaño de payloads.
- Número de solicitudes externas.
- Tiempo máximo de tareas.
- Espacio temporal.

## Señales posteriores al despliegue

Durante y después del despliegue se deben observar:

- Errores.
- Latencia.
- Reconexiones.
- Tasa de comandos.
- Jobs fallidos.
- Rate limits.
- Uso de memoria.
- Consultas lentas.
- Disponibilidad de proveedores.
- Métricas por feature.

Un despliegue no termina al iniciar el proceso; termina después de verificar su comportamiento.

## Registro de despliegues

Cada despliegue importante debería registrar:

```ts
interface DeploymentRecord {
  deploymentId: string;
  version: string;
  commit: string;
  environment: string;
  initiatedBy?: string;
  startedAt: Date;
  completedAt?: Date;
  status: "started" | "succeeded" | "failed" | "rolled_back";
  notes?: string;
}
```

## Seguridad del pipeline

El pipeline debe proteger:

- Tokens.
- Variables secretas.
- Artefactos.
- Permisos de despliegue.
- Acceso al entorno productivo.
- Logs del pipeline.

Buenas prácticas:

- Revisión obligatoria para producción.
- Permisos separados.
- Credenciales de corta duración cuando sea posible.
- Auditoría.
- Dependencias fijadas.
- Escaneo de artefactos.

## Pruebas

Antes de producción deben existir, según la criticidad:

- Tests unitarios.
- Tests de integración.
- Tests de migración.
- Smoke tests.
- Tests de permisos.
- Tests de carga básicos.
- Tests de rollback.
- Verificación de configuración.
- Prueba de recuperación.

## Estado actual

Esta nota define una estrategia de despliegue planificada.

Debe verificarse en el repositorio y la infraestructura real:

- Cómo se inicia HannaeX.
- Dónde se ejecuta.
- Cómo se construye.
- Qué pipeline existe.
- Cómo se guardan secretos.
- Cómo se ejecutan migraciones.
- Si existen workers separados.
- Cómo se registran comandos.
- Cómo se realiza rollback.
- Qué monitoreo está activo.

## Ruta de implementación

1. Documentar el comando de desarrollo.
2. Documentar el build de producción.
3. Separar entornos y credenciales.
4. Validar configuración al inicio.
5. Crear artefactos versionados.
6. Añadir smoke tests.
7. Definir migraciones seguras.
8. Crear procedimiento de rollback.
9. Añadir despliegue gradual mediante flags.
10. Registrar y observar cada release.

## Decisiones pendientes

- ¿Dónde se desplegará HannaeX?
- ¿Se utilizarán contenedores?
- ¿Existirá staging?
- ¿Cómo se ejecutarán bot, workers y scheduler?
- ¿Dónde se guardarán los secretos?
- ¿Qué proceso aprobará producción?
- ¿Cómo se hará rollback de migraciones?
- ¿Qué health checks serán obligatorios?
- ¿Qué nivel de despliegue gradual se necesita?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Escalabilidad]]
- [[Arquitectura — Recuperación ante fallos]]
- [[06-Registro]]
