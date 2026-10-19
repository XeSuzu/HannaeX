---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Arquitectura — Persistencia

## Propósito

Esta nota define cómo debería organizarse la persistencia de datos de HannaeX.

El objetivo es que los datos sean:

- Consistentes.
- Aislados por servidor y usuario.
- Recuperables.
- Auditables cuando sea necesario.
- Migrables.
- Protegidos contra duplicación.
- Independientes de la capa de Discord.

La nota describe una arquitectura objetivo. Los modelos, colecciones y repositorios reales deben verificarse directamente en el repositorio.

## Principio central

```text
La base de datos almacena el estado del sistema;
la lógica de negocio decide qué significa ese estado.
```

Los handlers no deberían contener consultas de persistencia complejas. Las operaciones deben pasar por repositorios o servicios especializados.

## Fuentes de estado

HannaeX puede utilizar distintas formas de estado:

```text
Estado efímero
  ├── variables de proceso
  ├── caché
  └── locks temporales

Estado persistente
  ├── perfiles
  ├── configuración
  ├── economía
  ├── moderación
  └── memoria

Estado externo
  ├── Discord
  ├── proveedor de IA
  ├── APIs de música
  └── servicios de pago
```

Cada tipo debe tener un dueño claro y una estrategia de recuperación.

## Datos por alcance

### Globales

Datos aplicables a toda la instancia:

- Configuración general.
- Versiones de esquema.
- Estado de integraciones.
- Límites globales.
- Registro técnico.

### Por servidor

Datos asociados a un guild:

- Configuración.
- Perfil de comunidad.
- XP y niveles.
- Economía local.
- Roles de recompensa.
- Canales configurados.
- Casos de moderación.
- Políticas de seguridad.
- Memoria del servidor.

### Por usuario y servidor

Datos de la relación entre un usuario y un guild:

- XP.
- Nivel.
- Racha.
- Minutos de voz.
- Preferencias locales.
- Reputación.
- Progreso de misiones.
- Historial relevante.

### Por usuario

Datos que pueden acompañar al usuario entre contextos, si existe autorización:

- Preferencias globales.
- Configuración de idioma.
- Preferencias de interacción.
- Memoria personal.
- Consentimientos.

Estos datos no deben compartirse automáticamente entre servidores.

## Aislamiento de datos

Toda consulta que opere con datos de guild debe incluir el alcance correcto.

Ejemplo:

```ts
findXpProfile({
  guildId,
  userId
});
```

Una consulta únicamente por `userId` puede ser peligrosa si el dato es local al servidor.

Regla:

```text
Si el dato pertenece al guild, guildId debe formar parte de la identidad lógica del registro.
```

## Modelos conceptuales

Los siguientes modelos son referencias de diseño, no necesariamente los nombres reales del repositorio.

### GuildConfig

```ts
interface GuildConfig {
  guildId: string;
  locale: string;
  enabledFeatures: string[];
  configuredChannels: Record<string, string>;
  configuredRoles: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserGuildProfile

```ts
interface UserGuildProfile {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  streak?: number;
  voiceMinutes?: number;
  updatedAt: Date;
}
```

### EconomyAccount

```ts
interface EconomyAccount {
  guildId: string;
  userId: string;
  balance: number;
  currency: string;
  version: number;
  updatedAt: Date;
}
```

### Transaction

```ts
interface Transaction {
  transactionId: string;
  guildId: string;
  userId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  source: string;
  idempotencyKey?: string;
  createdAt: Date;
}
```

### MemoryRecord

```ts
interface MemoryRecord {
  memoryId: string;
  ownerType: "user" | "guild";
  ownerId: string;
  guildId?: string;
  content: string;
  category?: string;
  source?: string;
  consentState: "allowed" | "denied" | "unknown";
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

Los datos sensibles requieren reglas más estrictas y no deben almacenarse solo porque técnicamente sea posible.

## Repositorios

Los repositorios aíslan la persistencia concreta.

```ts
interface GuildConfigRepository {
  findByGuildId(guildId: string): Promise<GuildConfig | null>;
  save(config: GuildConfig): Promise<void>;
}
```

```ts
interface EconomyRepository {
  findAccount(guildId: string, userId: string): Promise<EconomyAccount | null>;
  updateBalance(input: UpdateBalanceInput): Promise<EconomyAccount>;
  appendTransaction(transaction: Transaction): Promise<void>;
}
```

La aplicación debería utilizar estas interfaces, no depender de consultas directas a la base de datos.

## Servicio de persistencia

Los servicios coordinan reglas y repositorios.

```text
Command Handler
      ↓
Use Case
      ↓
Business Policy
      ↓
Repository
      ↓
Database
```

Una consulta sencilla puede utilizar un repositorio directamente desde un caso de uso. Una operación compleja debe coordinar varias fuentes mediante un servicio de dominio o aplicación.

## Identidad y claves

Cada modelo debe tener una identidad clara.

Ejemplos:

```text
GuildConfig: guildId
UserGuildProfile: guildId + userId
EconomyAccount: guildId + userId
Transaction: transactionId
VoiceSession: sessionId o clave compuesta
MemoryRecord: memoryId
```

Las claves compuestas deben reflejar el alcance real del dato.

## Índices

Los índices deben responder a consultas reales y no crearse de forma indiscriminada.

Índices posibles:

- `guildId`.
- `guildId + userId`.
- `guildId + updatedAt`.
- `guildId + level`.
- `guildId + balance`.
- `ownerId + consentState`.
- `idempotencyKey`.
- `createdAt` para retención y limpieza.

La selección final depende del motor de base de datos y de las consultas reales.

## Unicidad

Las operaciones que no deben duplicarse necesitan restricciones o comprobaciones de unicidad.

Ejemplos:

- Una configuración por guild.
- Un perfil de XP por usuario y guild.
- Una recompensa por evento.
- Una transacción por clave idempotente.
- Una sesión de voz abierta por combinación válida.
- Un registro de memoria por identificador.

La aplicación no debe depender únicamente de una comprobación previa; debe existir protección a nivel de persistencia cuando sea posible.

## Atomicidad

Una operación debe ser atómica cuando sus partes no pueden separarse sin producir un estado inválido.

Ejemplos:

### Economía

```text
Validar saldo
        ↓
Actualizar saldo
        ↓
Crear transacción
```

Si una parte falla, el sistema debe evitar un saldo actualizado sin registro correspondiente.

### Recompensas

```text
Determinar elegibilidad
        ↓
Registrar recompensa
        ↓
Asignar beneficio
        ↓
Notificar
```

La notificación puede ser reintentable, pero la asignación no debe repetirse.

## Concurrencia

Varios eventos pueden modificar el mismo registro al mismo tiempo.

Casos de riesgo:

- Dos mensajes otorgan XP simultáneamente.
- Dos transacciones modifican el mismo saldo.
- Dos workers procesan la misma recompensa.
- Dos sesiones de voz se cierran a la vez.
- Dos administradores actualizan una configuración.

Estrategias posibles:

- Operaciones atómicas.
- Versionado optimista.
- Locks temporales.
- Colas por clave.
- Transacciones.
- Idempotencia.

La estrategia debe elegirse por modelo y riesgo.

## Versionado optimista

Los registros sensibles pueden incluir una versión.

```ts
interface VersionedRecord {
  version: number;
  updatedAt: Date;
}
```

La actualización solo se aplica si la versión esperada coincide. Si cambió, el servicio debe reintentar o informar conflicto.

## Idempotencia

Una operación idempotente produce el mismo resultado aunque se procese más de una vez.

Debe considerarse para:

- Recompensas.
- Transacciones.
- XP proveniente de eventos.
- Notificaciones.
- Registro de sesiones.
- Memoria.
- Webhooks.

```ts
interface IdempotencyKey {
  source: string;
  eventId: string;
  operation: string;
}
```

La clave debe ser suficientemente específica para no bloquear operaciones distintas.

## Eventos y persistencia

Los eventos internos pueden utilizarse para desacoplar acciones secundarias.

Ejemplo:

```text
VoiceSessionCompleted
        ↓
Persistir sesión
        ↓
Emitir evento
        ↓
Calcular XP
        ↓
Actualizar nivel
        ↓
Evaluar recompensa
        ↓
Programar notificación
```

La persistencia del evento principal debe ocurrir antes de generar efectos derivados cuando sea importante conservar trazabilidad.

## Estados temporales

No todo debe guardarse permanentemente.

Datos posiblemente temporales:

- Cooldowns.
- Locks.
- Sesiones abiertas.
- Estado de interacción.
- Respuestas pendientes.
- Trabajos en cola.
- Cache de configuración.
- Estado de rate limit.

Cada dato temporal debe definir:

- TTL.
- Propietario.
- Qué ocurre al expirar.
- Si se puede reconstruir.
- Si requiere limpieza activa.

## Retención

La retención debe definirse por tipo de dato.

Ejemplos conceptuales:

- Configuración: mientras el guild esté instalado.
- Cooldowns: segundos o minutos.
- Logs de auditoría: según política del producto.
- Sesiones de voz: tiempo necesario para estadísticas.
- Memoria: hasta que expire, se corrija o se elimine.
- Casos de moderación: según necesidad operativa y política.

No debe conservarse información indefinidamente por defecto.

## Eliminación

La eliminación debe distinguir entre:

- Borrado físico.
- Borrado lógico.
- Anonimización.
- Expiración automática.
- Eliminación de índices o embeddings.
- Eliminación de copias y cachés.

Cuando exista memoria, eliminar el registro principal no basta si hay representaciones derivadas.

## Migraciones

Los cambios de esquema deben ser explícitos y versionados.

```text
Schema v1
    ↓
Migration v2
    ↓
Backfill
    ↓
Validación
    ↓
Código compatible
    ↓
Retiro de campos antiguos
```

Una migración debe considerar:

- Datos existentes.
- Compatibilidad temporal.
- Rollback cuando sea posible.
- Duración.
- Impacto en producción.
- Índices.
- Workers activos.
- Versiones del bot.

## Backups y recuperación

La persistencia debe contar con una estrategia de recuperación.

Debe definirse:

- Frecuencia de backups.
- Retención.
- Cifrado.
- Ubicación.
- Control de acceso.
- Pruebas de restauración.
- Objetivo de pérdida aceptable.
- Tiempo objetivo de recuperación.

Un backup que nunca se ha restaurado en pruebas no debe considerarse verificado.

## Seguridad de datos

Debe protegerse:

- Credenciales.
- Tokens.
- Datos de pago.
- Memoria personal.
- Historial de moderación.
- Identificadores sensibles.
- Logs con contenido privado.

Buenas prácticas:

- No almacenar secretos en documentos de usuario.
- Cifrar datos sensibles cuando corresponda.
- Limitar acceso por servicio.
- Separar datos de producción y desarrollo.
- Auditar operaciones administrativas.
- Evitar devolver documentos completos desde repositorios.

## Persistencia de configuración

La configuración de guild debe ser validada antes de guardarse.

Ejemplo de proceso:

```text
Solicitud de administrador
        ↓
Validar permiso
        ↓
Validar canal, rol o valor
        ↓
Normalizar configuración
        ↓
Guardar
        ↓
Invalidar caché
        ↓
Confirmar cambio
```

La configuración antigua debe conservarse cuando sea útil para auditoría o rollback.

## Persistencia de economía

La economía requiere especial cuidado porque los errores producen pérdida o duplicación de valor.

Reglas recomendadas:

- No modificar saldo sin registrar el motivo.
- Utilizar cantidades enteras o representación monetaria segura.
- No confiar en cálculos de cliente.
- Proteger contra doble procesamiento.
- Registrar origen de cada transacción.
- Mantener historial suficiente para auditoría.
- Definir límites y recuperación ante errores.

## Persistencia de XP y voz

Para XP proveniente de mensajes o voz:

- Definir qué eventos son válidos.
- Aplicar cooldowns.
- Evitar XP duplicada por reintentos.
- Separar actividad observada de XP otorgada.
- Registrar el origen de la recompensa.
- Definir comportamiento ante edición o eliminación de mensajes.
- Cerrar sesiones de voz de forma segura.

## Persistencia de memoria

La memoria debe tener alcance y consentimiento claros.

Antes de guardar:

- Determinar si es útil.
- Evitar datos sensibles innecesarios.
- Identificar propietario.
- Definir guild cuando sea local.
- Registrar origen.
- Permitir corrección y eliminación.

Antes de leer:

- Verificar permisos.
- Verificar alcance.
- Verificar vigencia.
- Filtrar por relevancia.

## Caché

La caché puede reducir carga, pero debe invalidarse cuando cambian los datos.

Ejemplos:

```text
config:guildId
cooldown:guildId:userId:command
leaderboard:guildId:period
permissions:guildId:userId
```

Toda clave debe contener el alcance necesario.

Un error de caché no debe exponer datos de otro guild.

## Consistencia eventual

Algunas funciones pueden aceptar consistencia eventual.

Adecuado para:

- Rankings que se actualizan con retraso breve.
- Estadísticas agregadas.
- Notificaciones.
- Embeddings.
- Resúmenes.

No adecuado sin una estrategia adicional para:

- Saldo.
- Permisos.
- Sanciones.
- Recompensas únicas.
- Consentimiento.
- Eliminación de datos.

## Pruebas de persistencia

Debe probarse:

- Creación.
- Lectura.
- Actualización.
- Eliminación.
- Unicidad.
- Concurrencia.
- Reintentos.
- Rollback.
- Migraciones.
- Aislamiento por guild.
- Aislamiento por usuario.
- Expiración.
- Recuperación desde backup.

## Estado actual

Esta nota define una estrategia objetivo.

Debe verificarse en el repositorio real:

- Motor de base de datos.
- Modelos existentes.
- Colecciones o tablas.
- Índices.
- Repositorios.
- Migraciones.
- Estrategia de backups.
- Uso de caché.
- Operaciones atómicas.
- Políticas de retención.

## Ruta de implementación

Una implementación progresiva puede seguir este orden:

1. Inventariar modelos y colecciones existentes.
2. Identificar el alcance de cada dato.
3. Detectar consultas sin `guildId` cuando sea necesario.
4. Definir repositorios para features críticas.
5. Añadir índices y restricciones de unicidad.
6. Proteger economía y recompensas con idempotencia.
7. Centralizar migraciones.
8. Definir retención y eliminación.
9. Revisar backups y restauración.
10. Añadir tests de concurrencia y aislamiento.

## Decisiones pendientes

- ¿Cuál es el motor de persistencia principal?
- ¿Se usa una sola base o varias?
- ¿Qué modelos existen actualmente?
- ¿Qué operaciones necesitan transacciones?
- ¿Qué sistema de caché está disponible?
- ¿Cómo se ejecutan migraciones?
- ¿Qué datos requieren auditoría?
- ¿Qué política de retención se aplicará?
- ¿Qué estrategia de backup se usará?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[Arquitectura — Escalabilidad]]
- [[03-Features]]
- [[06-Registro]]
