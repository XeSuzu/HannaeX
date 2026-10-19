---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Arquitectura — Configuración y entorno

## Propósito

Esta nota define cómo HannaeX debe gestionar configuración, variables de entorno, secretos, diferencias entre entornos y ajustes específicos de cada servidor.

La configuración debe ser explícita, validada, segura y separada del código fuente.

## Principio central

```text
El código define el comportamiento posible.
La configuración define cómo se ejecuta en un entorno concreto.
```

La configuración no debe usarse para ocultar lógica de negocio ni para modificar principios de seguridad sin revisión.

## Tipos de configuración

### Configuración de aplicación

Aplica al proceso completo:

- Entorno.
- Puerto.
- Nivel de logs.
- Región.
- Nombre de instancia.
- Identificador de versión.
- Modo de mantenimiento.

### Configuración de infraestructura

- URL de base de datos.
- Redis o caché.
- Colas.
- Almacenamiento.
- Proveedores externos.
- Timeouts.
- Reintentos.
- Límites de concurrencia.

### Configuración de Discord

- Token.
- Client ID.
- Guild de desarrollo.
- Intents.
- Registro de comandos.
- Permisos solicitados.
- Canales internos.

### Configuración de features

- XP.
- Voz.
- Economía.
- Moderación.
- IA.
- Música.
- Memoria.
- Seguridad.

### Configuración por guild

- Idioma.
- Canales.
- Roles.
- Features activadas.
- Multiplicadores.
- Cooldowns.
- Preferencias de Hoshiko.
- Políticas locales.

### Configuración por usuario

- Idioma.
- Preferencias de interacción.
- Memoria.
- Privacidad.
- Notificaciones.

## Entornos

Se recomienda distinguir como mínimo:

```text
development
        ↓
test
        ↓
staging, si aplica
        ↓
production
```

Cada entorno debe tener recursos separados cuando sea posible.

### Development

Adecuado para:

- Desarrollo local.
- Mocks.
- Guilds de prueba.
- Datos desechables.
- Logs detallados.

No debe utilizar datos sensibles reales sin protección.

### Test

Adecuado para:

- Tests unitarios.
- Tests de integración.
- Migraciones temporales.
- Fixtures.
- Simulación de proveedores.

No debe enviar mensajes reales a comunidades de producción.

### Staging

Adecuado para:

- Validación cercana a producción.
- Pruebas de despliegue.
- Integraciones controladas.
- Smoke tests.

Debe permanecer aislado de datos de producción.

### Production

Debe priorizar:

- Seguridad.
- Disponibilidad.
- Datos reales.
- Mínimo privilegio.
- Logs seguros.
- Backups.
- Recuperación.
- Despliegues controlados.

## Carga de configuración

El proceso recomendado es:

```text
Leer fuentes
    ↓
Normalizar valores
    ↓
Validar tipos y rangos
    ↓
Aplicar defaults seguros
    ↓
Resolver dependencias
    ↓
Construir AppConfig
    ↓
Iniciar servicios
```

Si falta una configuración crítica, el proceso debe fallar antes de iniciar funciones inseguras.

## AppConfig

La aplicación debería recibir una configuración validada.

```ts
interface AppConfig {
  environment: "development" | "test" | "staging" | "production";
  discord: DiscordConfig;
  database: DatabaseConfig;
  cache?: CacheConfig;
  queues?: QueueConfig;
  providers: ProviderConfigs;
  logging: LoggingConfig;
  features: FeatureFlags;
}
```

El código de dominio no debería leer directamente `process.env`.

## Variables de entorno

Las variables de entorno pueden contener:

- Secretos.
- URLs.
- Flags.
- Límites.
- Identificadores.
- Configuración operativa.

Deben validarse al inicio.

Ejemplo conceptual:

```ts
const config = loadConfig(process.env);
validateConfig(config);
```

No se deben usar valores ambiguos como strings vacíos para representar estados importantes.

## Secretos

Los secretos deben gestionarse fuera del repositorio.

Buenas prácticas:

- Secret manager o variables seguras.
- Separación por entorno.
- Rotación periódica.
- Mínimo privilegio.
- Revocación al cambiar de proveedor.
- No imprimir en logs.
- No incluir en errores públicos.

Ejemplos de secretos:

- Token de Discord.
- Clave de Gemini.
- Credenciales de base de datos.
- Claves de pagos.
- Secretos de webhooks.
- Credenciales de almacenamiento.

## Defaults

Los defaults deben ser seguros.

Ejemplos:

- Features sensibles deshabilitadas.
- Memoria restringida.
- Acciones destructivas con confirmación.
- Logs sin payloads completos.
- Reintentos limitados.
- Rate limiting activo.
- Modo de mantenimiento controlado.

Un default no debe activar una acción con consecuencias importantes.

## Feature flags

Los feature flags permiten activar funciones gradualmente.

```ts
interface FeatureFlags {
  ai: boolean;
  economy: boolean;
  voiceXp: boolean;
  moderation: boolean;
  memory: boolean;
  dashboard: boolean;
}
```

Los flags pueden existir en varios niveles:

```text
Instancia
   ↓
Plan
   ↓
Guild
   ↓
Canal
   ↓
Usuario, si aplica
```

La evaluación debe respetar seguridad, permisos y dependencias.

## Flags y migraciones

No se debe activar una feature si su persistencia o migración no está preparada.

```text
Código desplegado
        ↓
Esquema compatible
        ↓
Flag interno
        ↓
Prueba controlada
        ↓
Activación gradual
```

## Configuración por guild

La configuración de un guild debe almacenarse como datos persistentes, no como variables de entorno.

Debe incluir:

- `guildId`.
- Versión de configuración.
- Fecha de creación.
- Fecha de actualización.
- Actor del último cambio, cuando sea necesario.
- Valores normalizados.

Ejemplo conceptual:

```ts
interface GuildConfig {
  guildId: string;
  version: number;
  locale: string;
  features: Record<string, boolean>;
  channels: Record<string, string | undefined>;
  roles: Record<string, string | undefined>;
  updatedBy?: string;
  updatedAt: Date;
}
```

## Cambios de configuración

El flujo recomendado es:

```text
Solicitud
    ↓
Autorización
    ↓
Validación
    ↓
Normalización
    ↓
Persistencia
    ↓
Invalidación de caché
    ↓
Auditoría
    ↓
Confirmación
```

No debe aplicarse una configuración inválida parcialmente.

## Configuración de Hoshiko

La configuración de Hoshiko puede adaptar su expresión:

- Idioma.
- Formalidad.
- Humor.
- Emojis.
- Intensidad neko.
- Iniciativa.
- Memoria.

No debe cambiar:

- Honestidad.
- Privacidad.
- Seguridad.
- No manipulación.
- No fingir humanidad.
- Necesidad de permisos.

La configuración técnica está documentada en:

- [[Hoshiko — Identidad y configuración]].
- [[Hoshiko — Personalidad técnica]].
- [[Hoshiko — Principios inmutables]].

## Configuración de planes

Los planes pueden establecer límites de capacidad:

- Número de guilds.
- Retención de memoria.
- Uso de IA.
- Capacidad de almacenamiento.
- Integraciones.
- Número de workers.
- Prioridad de procesamiento.

Los límites deben evaluarse en un servicio común y no duplicarse de forma inconsistente en cada comando.

## Configuración dinámica

Algunos valores pueden cambiar sin reiniciar:

- Configuración de guild.
- Feature flags locales.
- Cooldowns configurables.
- Canales.
- Roles.
- Preferencias.

Otros valores pueden requerir reinicio o despliegue:

- Token del bot.
- Conexión principal de base de datos.
- Estructura de workers.
- Certificados.
- Dependencias del proceso.

La aplicación debe documentar qué configuración es dinámica.

## Caché de configuración

La configuración de guild puede cachearse para reducir lecturas.

La clave debe incluir el alcance:

```text
config:guildId
```

Debe definirse:

- TTL.
- Invalidación al cambiar.
- Comportamiento ante fallo de caché.
- Versión.
- Protección contra configuración antigua.

Una configuración crítica no debe permanecer indefinidamente en caché sin validación.

## Compatibilidad de configuración

La configuración debe tener versión.

```text
Configuración v1
        ↓
Migración
        ↓
Configuración v2
```

Esto permite cambiar nombres, estructuras o defaults sin romper todos los guilds simultáneamente.

## Validación de valores

Debe validarse:

- IDs que pertenezcan al guild correcto.
- Canales accesibles.
- Roles existentes.
- Números dentro de rangos.
- Multiplicadores permitidos.
- Cooldowns razonables.
- Plan compatible.
- Integraciones habilitadas.
- Dependencias entre features.

Ejemplo:

```text
No activar XP de voz
si el tracking de voz no está disponible.
```

## Configuración y permisos

La configuración no debe otorgar permisos que Discord no concedió.

Ejemplo:

```text
Configurar un canal de moderación
≠
Dar acceso al bot para moderar.
```

Ambas cosas deben validarse por separado.

## Configuración sensible

Algunos valores requieren acceso restringido:

- Canales internos.
- Webhooks.
- Políticas de seguridad.
- Límites de economía.
- Configuración de moderación.
- Datos de facturación.
- Integraciones privadas.

Los valores sensibles no deben devolverse completos en comandos públicos.

## Modo mantenimiento

HannaeX puede necesitar un modo de mantenimiento.

Debe permitir:

- Desactivar features concretas.
- Rechazar operaciones nuevas.
- Mantener comandos informativos.
- Mostrar un mensaje claro.
- Evitar crear trabajos que no podrán completarse.
- Permitir acciones administrativas esenciales.

El modo mantenimiento debe auditarse y tener un mecanismo claro de salida.

## Configuración de desarrollo

El desarrollo debería incluir:

- Guilds de prueba explícitos.
- Datos separables.
- Proveedores mockeables.
- Logs detallados pero seguros.
- Flags experimentales.
- Confirmaciones reducidas solo en recursos desechables.

Nunca debe asumirse que un entorno local es seguro por defecto.

## Despliegue y configuración

El despliegue debe asociar:

- Versión de código.
- Versión de configuración.
- Versión de esquema.
- Versión de workers.
- Estado de migraciones.

Antes de activar una nueva versión:

- Validar configuración.
- Comprobar conexión de dependencias.
- Ejecutar migraciones compatibles.
- Verificar flags.
- Ejecutar smoke tests.

## Errores de configuración

Un error debe clasificarse como:

- Falta de valor.
- Tipo inválido.
- Rango inválido.
- Dependencia ausente.
- Secreto inválido.
- Recurso inexistente.
- Incompatibilidad de versión.

El mensaje operativo debe señalar cómo corregirlo sin exponer secretos.

## Observabilidad de configuración

Debe poder saberse:

- Qué versión está activa.
- Qué flags están habilitados.
- Qué entorno corre.
- Qué providers están disponibles.
- Qué configuración requiere atención.
- Quién cambió una configuración sensible.

No se deben registrar valores secretos completos.

## Pruebas

Debe probarse:

- Carga correcta.
- Variables faltantes.
- Variables inválidas.
- Defaults seguros.
- Separación por entorno.
- Configuración por guild.
- Permisos de cambio.
- Migración de configuración.
- Invalidación de caché.
- Feature flags.
- Modo mantenimiento.
- Compatibilidad con planes.
- Ausencia de secretos en logs.

## Estado actual

Esta nota define una estrategia planificada de configuración y entornos.

Debe verificarse en el repositorio real:

- Dónde se cargan variables.
- Si existe un objeto de configuración central.
- Qué valores se leen directamente desde `process.env`.
- Cómo se guardan configuraciones de guild.
- Si existen feature flags.
- Cómo se gestionan secretos.
- Qué entornos están configurados.
- Cómo se ejecutan migraciones.

## Ruta de implementación

1. Inventariar variables y archivos de configuración.
2. Clasificar cada valor por sensibilidad y alcance.
3. Crear un cargador central.
4. Validar configuración al arranque.
5. Separar configuración de entorno y de guild.
6. Centralizar feature flags.
7. Añadir versionado de configuración.
8. Proteger secretos y logs.
9. Añadir auditoría de cambios sensibles.
10. Documentar despliegue y recuperación.

## Decisiones pendientes

- ¿Qué sistema almacenará secretos?
- ¿Qué entornos existirán formalmente?
- ¿Se utilizará staging?
- ¿Qué valores podrán cambiar dinámicamente?
- ¿Cómo se versionará la configuración de guild?
- ¿Qué flags deben implementarse primero?
- ¿Cómo se gestionarán los límites por plan?
- ¿Qué cambios requieren reinicio?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[05-Planes]]
- [[Hoshiko — Identidad y configuración]]
