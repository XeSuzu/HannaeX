---
type: architecture
status: planned
area: infrastructure
scope: system
stability: high
created: 2026-09-21
updated: 2026-09-21
---

# Arquitectura — Seguridad

## Propósito

Esta nota define la estrategia de seguridad de HannaeX a nivel de aplicación, infraestructura, datos, integraciones y operación.

La seguridad no debe ser una feature aislada. Debe acompañar el flujo completo:

```text
Entrada
  ↓
Identidad
  ↓
Permisos
  ↓
Validación
  ↓
Procesamiento
  ↓
Persistencia
  ↓
Respuesta
  ↓
Auditoría
```

La arquitectura descrita es objetivo. Debe verificarse en el repositorio y en el entorno real qué controles ya existen.

## Principios

### Mínimo privilegio

Cada usuario, bot, worker, servicio y credencial debe tener únicamente los permisos necesarios.

### Defensa en profundidad

Una operación sensible no debe depender de una única validación.

```text
Discord permissions
        + aplicación
        + policy
        + persistencia
        + auditoría
```

### Seguridad por defecto

Una configuración nueva debe ser restrictiva hasta que un administrador la habilite explícitamente.

### Fallar de forma segura

Si no se puede verificar un permiso, contexto o estado, la operación sensible debe detenerse.

### Separación de datos

Los datos de distintos guilds y usuarios deben permanecer aislados.

### Trazabilidad

Las acciones importantes deben poder investigarse sin registrar secretos o contenido innecesario.

## Modelo de amenazas

HannaeX debe considerar al menos estas amenazas:

- Usuario sin permisos que intenta ejecutar una acción administrativa.
- Usuario que intenta manipular argumentos o IDs.
- Datos de un guild expuestos en otro guild.
- Prompt injection en mensajes procesados por IA.
- Uso indebido de herramientas externas.
- Tokens o claves expuestos en logs.
- Repetición de eventos o webhooks.
- Rate limits utilizados para provocar denegación de servicio.
- URLs maliciosas o SSRF.
- Dependencias comprometidas.
- Worker que procesa un trabajo con contexto obsoleto.
- Cuenta administrativa comprometida.
- Configuración insegura del servidor.
- Datos sensibles almacenados más tiempo del necesario.

## Activos que proteger

- Token del bot.
- Claves API.
- Credenciales de base de datos.
- Credenciales de pagos.
- Datos de usuarios.
- Memoria personal.
- Historial de moderación.
- Saldos y transacciones.
- Configuración de servidores.
- Logs internos.
- Jobs pendientes.
- Backups.
- Integridad de recompensas.
- Permisos administrativos.

## Identidad y autenticación

Discord proporciona la identidad primaria del usuario dentro de la plataforma, pero HannaeX debe validar el contexto recibido.

Debe comprobarse:

- `userId`.
- `guildId`.
- `channelId`.
- Tipo de interacción.
- Estado del miembro cuando aplique.
- Firma de webhooks externos.
- Token de integración.

No se debe confiar en IDs enviados por el usuario sin relacionarlos con el contexto autenticado de la interacción.

## Autorización

La autorización debe considerar varias capas:

```text
¿Quién es el usuario?
        ↓
¿En qué guild actúa?
        ↓
¿Qué permisos tiene?
        ↓
¿Qué permisos tiene el bot?
        ↓
¿La feature está habilitada?
        ↓
¿El plan permite la operación?
        ↓
¿La policy permite la acción?
```

### Permisos del usuario

- Roles.
- Permisos de Discord.
- Propiedad de un recurso.
- Permisos específicos de HannaeX.

### Permisos del bot

- Ver canal.
- Enviar mensajes.
- Gestionar mensajes.
- Gestionar roles.
- Moderar miembros.
- Conectar o hablar en voz.

### Permisos de la feature

Una feature puede tener restricciones adicionales aunque Discord permita la acción.

## Matriz de autorización

Las acciones sensibles deben poder representarse mediante una matriz.

| Acción | Usuario | Bot | Guild | Confirmación |
|---|---|---|---|---|
| Ver perfil propio | Usuario autenticado | Leer canal o responder | Requerido si es local | No siempre |
| Modificar configuración | Administrador | Gestionar configuración necesaria | Requerido | Según riesgo |
| Ejecutar moderación | Moderador autorizado | Permiso de moderación | Requerido | Puede requerirse |
| Modificar economía | Policy de economía | Enviar respuesta y persistir | Requerido | Según operación |
| Borrar datos | Propietario o administrador | Permiso técnico | Requerido | Sí cuando sea irreversible |
| Ejecutar acción externa | Usuario autorizado | Integración válida | Según alcance | Sí cuando sea sensible |

La matriz final debe reflejar las funciones reales.

## Validación de entrada

Toda entrada externa debe validarse:

- Strings.
- Números.
- Fechas.
- IDs.
- URLs.
- Opciones de comandos.
- Contenido de modals.
- Payloads de webhooks.
- Mensajes de colas.
- Respuestas de proveedores.

La validación debe incluir:

- Tipo.
- Longitud.
- Formato.
- Rango.
- Permisos.
- Alcance.
- Relación con otros valores.

Nunca se debe confiar únicamente en la validación del cliente de Discord.

## Inyección

### Prompt injection

Los mensajes de usuarios pueden contener instrucciones destinadas a manipular el comportamiento de la IA.

HannaeX debe separar:

```text
Instrucciones del sistema
        ↓
Políticas de seguridad
        ↓
Contexto autorizado
        ↓
Contenido del usuario
```

El contenido de un mensaje no debe modificar silenciosamente las reglas del sistema.

### Inyección de comandos

El texto generado por IA no debe ejecutarse automáticamente como:

- Comando de shell.
- Consulta de base de datos.
- Operación administrativa.
- Código.
- Solicitud externa.

Toda herramienta debe utilizar esquemas, validación y permisos explícitos.

### Inyección en consultas

Las consultas deben utilizar parámetros o APIs seguras, no concatenación de valores externos.

## Seguridad de herramientas

Si Hoshiko o una feature puede utilizar herramientas, cada herramienta debe definir:

- Nombre.
- Descripción.
- Parámetros permitidos.
- Usuario autorizado.
- Guild permitido.
- Efectos secundarios.
- Reversibilidad.
- Requerimiento de confirmación.
- Auditoría.

```ts
interface ToolPolicy {
  name: string;
  readOnly: boolean;
  requiresConfirmation: boolean;
  allowedScopes: string[];
  requiredPermissions: string[];
}
```

Una respuesta de IA no equivale a una autorización.

## Confirmación de acciones

Las acciones irreversibles o sensibles deben requerir confirmación adecuada.

Ejemplos:

- Borrar mensajes.
- Borrar memoria.
- Cambiar configuración crítica.
- Ejecutar sanciones graves.
- Modificar saldo.
- Realizar pagos.
- Enviar mensajes a terceros.
- Exportar datos.

La confirmación debe incluir:

- Objetivo.
- Acción exacta.
- Alcance.
- Consecuencia.
- Duración o permanencia.

Debe evitarse confirmar una acción ambigua.

## Privacidad

La seguridad y la privacidad se relacionan, pero no son idénticas.

HannaeX debe limitar:

- Qué datos se recopilan.
- Qué datos se persisten.
- Quién puede acceder.
- Qué se envía a terceros.
- Cuánto tiempo se conserva.
- Qué se muestra en canales públicos.

Los datos privados no deben aparecer en logs públicos, respuestas de guild o prompts innecesarios.

## Aislamiento por guild

Toda operación local debe conservar su alcance.

Riesgos comunes:

- Cache key sin `guildId`.
- Consulta por `userId` cuando el dato es local.
- Memoria compartida por error.
- Ranking de otro servidor.
- Configuración reutilizada entre guilds.
- Worker que pierde el contexto.

El aislamiento debe comprobarse mediante tests específicos.

## Memoria y datos personales

Antes de guardar o recuperar memoria:

- Verificar propietario.
- Verificar alcance.
- Verificar autorización.
- Filtrar sensibilidad.
- Comprobar vigencia.
- Permitir eliminación.

No debe utilizarse la memoria como mecanismo para saltarse permisos.

## Secretos

Los secretos nunca deben:

- Versionarse en Git.
- Escribirse en logs.
- Enviarse al modelo de IA.
- Incluirse en respuestas de Discord.
- Guardarse en documentos de configuración públicos.
- Exponerse en mensajes de error.

Buenas prácticas:

- Variables de entorno seguras o secret manager.
- Rotación.
- Credenciales separadas por entorno.
- Mínimo privilegio.
- Revocación.
- Detección de filtraciones.

## Gestión de sesiones y tokens

Cuando existan tokens o sesiones externas:

- Definir expiración.
- Guardar solo lo necesario.
- Cifrar si corresponde.
- Revocar al desconectar.
- Evitar mostrarlos en URLs o logs.
- Validar el estado antes de utilizarlo.

## Webhooks

Los webhooks deben protegerse contra:

- Spoofing.
- Replay.
- Duplicación.
- Payloads manipulados.
- Saturación.

Controles:

- Verificar firma.
- Validar timestamp.
- Registrar ID externo.
- Aplicar idempotencia.
- Limitar tamaño.
- Responder rápido.
- Encolar procesamiento lento.

## Seguridad de base de datos

Debe aplicarse:

- Credenciales con mínimo privilegio.
- Separación por entorno.
- Cifrado en tránsito.
- Cifrado en reposo cuando corresponda.
- Restricciones de acceso.
- Backups protegidos.
- Índices y consultas controladas.
- Auditoría de operaciones sensibles.

La aplicación no debe conectar a la base con una cuenta más privilegiada de lo necesario.

## Seguridad de colas y workers

Los mensajes de cola deben validarse igual que cualquier entrada externa.

Los workers deben:

- Rechazar payloads inválidos.
- Verificar versiones.
- Aplicar idempotencia.
- Limitar permisos.
- No cargar datos fuera del alcance.
- Evitar ejecutar contenido como código.
- Limpiar datos temporales.
- Registrar fallos sin secretos.

## Seguridad de archivos y URLs

Si HannaeX procesa archivos o URLs:

- Limitar tamaño.
- Validar tipo real.
- Evitar rutas controladas por usuario.
- Prevenir path traversal.
- Bloquear esquemas peligrosos.
- Validar destinos externos.
- Aplicar límites de tiempo.
- Escanear o aislar contenido cuando corresponda.
- No devolver archivos privados sin autorización.

Debe prevenirse SSRF al solicitar URLs proporcionadas por usuarios.

## Rate limiting y abuso

El rate limiting debe proteger:

- Comandos costosos.
- IA.
- Música.
- Búsquedas.
- Webhooks.
- Acciones administrativas.
- Endpoints futuros.

Puede aplicarse por:

- Usuario.
- Guild.
- Comando.
- IP o instalación, si aplica.
- Proveedor.
- Plan.

Un plan superior puede tener límites mayores, pero no debería eliminar las protecciones básicas.

## Antiabuso

HannaeX debe detectar o limitar:

- Spam.
- Comandos repetidos.
- Creación masiva de memoria.
- Solicitudes de IA excesivas.
- Manipulación de economía.
- Eventos duplicados.
- Uso automatizado malicioso.
- Intentos repetidos de permisos.

Las respuestas de bloqueo no deben revelar detalles que faciliten evadir el sistema.

## Auditoría

Las acciones sensibles deben generar registros de auditoría.

Un registro puede incluir:

```ts
interface AuditRecord {
  auditId: string;
  action: string;
  actorId?: string;
  guildId?: string;
  targetId?: string;
  result: "success" | "denied" | "failed";
  reasonCode?: string;
  correlationId?: string;
  createdAt: Date;
}
```

No debe incluirse contenido privado completo si basta con un identificador o resumen.

## Logs seguros

Los logs deben clasificarse:

- Operativos.
- Error.
- Auditoría.
- Seguridad.
- Métricas.

Debe existir redacción de:

- Tokens.
- Claves API.
- Contraseñas.
- Cookies.
- URLs firmadas.
- Datos financieros.
- Memoria privada.

## Dependencias

Las dependencias deben revisarse por:

- Vulnerabilidades conocidas.
- Mantenimiento.
- Permisos solicitados.
- Licencia.
- Cambios de versión.
- Procedencia del paquete.

Se recomienda:

- Lockfile.
- Actualizaciones controladas.
- Scans automatizados.
- Revisión de dependencias transitivas críticas.
- No añadir paquetes sin necesidad.

## Configuración segura

Los valores sensibles deben validarse al arranque.

Si falta una configuración crítica:

- Fallar rápido en producción.
- Mostrar un error operativo sin secreto.
- No iniciar funcionalidades parcialmente inseguras.

Los defaults deben ser seguros:

- Features sensibles deshabilitadas.
- Memoria restringida.
- Acciones destructivas con confirmación.
- Logs sin contenido privado.

## Incidentes

Un incidente de seguridad debe tener un flujo:

```text
Detectar
   ↓
Contener
   ↓
Evaluar alcance
   ↓
Revocar o rotar credenciales
   ↓
Corregir
   ↓
Verificar
   ↓
Documentar
```

Debe registrarse:

- Qué ocurrió.
- Cuándo ocurrió.
- Qué datos pudieron afectarse.
- Qué controles fallaron.
- Qué medidas se aplicaron.
- Qué cambio evitará la repetición.

## Recuperación

La seguridad incluye recuperar el sistema sin reintroducir el problema.

Debe contemplarse:

- Restauración de datos.
- Revocación de tokens.
- Reprocesamiento de eventos.
- Revisión de jobs.
- Invalidación de cachés.
- Verificación de permisos.
- Comunicación operativa.

## Pruebas de seguridad

Debe probarse:

- Permisos insuficientes.
- Guild incorrecto.
- Usuario incorrecto.
- Payload inválido.
- Prompt injection.
- Tool misuse.
- Repetición de eventos.
- Webhook falso.
- Replay.
- Rate limit.
- Inyección en consultas.
- URLs peligrosas.
- Secretos en logs.
- Exposición entre guilds.
- Eliminación de memoria.
- Acciones irreversibles sin confirmación.

## Estado actual

Esta nota describe una arquitectura de seguridad planificada.

Debe verificarse en el código real:

- Cómo se validan permisos.
- Dónde se leen secretos.
- Qué logs existen.
- Si hay redacción de datos sensibles.
- Cómo se protegen los webhooks.
- Qué rate limits están activos.
- Cómo se aíslan guilds.
- Qué acciones requieren confirmación.
- Qué dependencias necesitan revisión.

## Ruta de implementación

1. Inventariar activos y secretos.
2. Identificar acciones sensibles.
3. Revisar permisos de cada comando.
4. Auditar consultas sin aislamiento.
5. Centralizar validación de entrada.
6. Redactar logs sensibles.
7. Proteger webhooks y jobs.
8. Añadir idempotencia.
9. Implementar rate limits.
10. Crear tests de autorización y aislamiento.
11. Definir respuesta a incidentes.
12. Revisar dependencias y configuración de producción.

## Decisiones pendientes

- ¿Dónde se almacenan los secretos?
- ¿Existe un sistema de auditoría?
- ¿Qué acciones requieren confirmación explícita?
- ¿Qué datos pueden enviarse a proveedores de IA?
- ¿Qué política de retención se aplicará?
- ¿Qué roles pueden modificar cada feature?
- ¿Cómo se detectan abusos?
- ¿Qué herramientas de análisis de dependencias se usarán?
- ¿Cómo se ejecutarán pruebas de seguridad antes del despliegue?

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Workers y tareas asíncronas]]
- [[Arquitectura — Integraciones externas]]
- [[Arquitectura — Configuración y entorno]]
- [[Arquitectura — Observabilidad]]
- [[Arquitectura — Despliegue]]
- [[Hoshiko — Principios inmutables]]
