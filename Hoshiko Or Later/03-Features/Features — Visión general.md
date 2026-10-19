---
type: feature-index
status: planned
area: features
scope: system
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Features — Visión general

## Propósito

Este índice organiza las áreas funcionales de HannaeX.

Cada feature debe documentarse por separado antes de marcarse como implementada. La presencia de una nota describe una intención, un diseño o una ruta de trabajo; no demuestra que la función exista en el código.

## Estados de feature

- `implemented`: verificada en el código y operativa.
- `partial`: existe una parte, pero faltan componentes o casos.
- `planned`: diseñada o priorizada, todavía no verificada como implementación.
- `experimental`: prueba controlada.
- `deprecated`: se conserva para referencia, pero no debe recibir desarrollo nuevo.
- `blocked`: depende de otra decisión o integración.

## Mapa funcional

```text
IA
├── Conversación
├── Contexto
├── Memoria
├── Resúmenes
└── Herramientas

Comunidad
├── XP y niveles
├── Rankings
├── Recompensas
├── Rachas
├── Misiones
└── Eventos

Voz
├── Tracking
├── XP de voz
├── Estadísticas
└── Recompensas

Economía
├── Cuentas
├── Moneda
├── Transacciones
├── Tienda
└── Recompensas

Multimedia
├── Música
├── Letras
├── Reproducción
└── Integraciones

Moderación
├── Comandos
├── Casos
├── Automatizaciones
├── Roles
└── Auditoría

Seguridad
├── Detección
├── Alertas
├── Incidentes
├── Protección
└── Respuesta

Utilidades
├── Configuración
├── Información
├── Recordatorios
├── Herramientas
└── Administración
```

## Principios de documentación

Cada feature debe definir:

- Propósito.
- Alcance.
- Usuarios afectados.
- Entradas.
- Flujo.
- Datos utilizados.
- Permisos.
- Dependencias.
- Respuestas.
- Errores.
- Límites.
- Privacidad.
- Estado.
- Decisiones pendientes.

## Features principales

### IA

Documenta las capacidades conversacionales y de asistencia de Hoshiko.

- [[IA — Visión general]]
- [[IA — Conversación]]
- [[IA — Contexto y memoria]]
- [[IA — Resúmenes]]
- [[IA — Herramientas]]

### Comunidad

Documenta las mecánicas de participación y progresión comunitaria.

- [[Comunidad — Visión general]]
- [[Comunidad — XP y niveles]]
- [[Comunidad — Rankings]]
- [[Comunidad — Recompensas]]
- [[Comunidad — Rachas y misiones]]
- [[Comunidad — Eventos]]

### Voz

Documenta las funciones asociadas a canales de voz y actividad hablada.

- [[Voz — Visión general]]
- [[Voz — Tracking de sesiones]]
- [[Voz — XP de voz]]
- [[Voz — Estadísticas]]
- [[Voz — Recompensas]]

### Economía

Documenta moneda, saldos y transacciones internas.

- [[Economía — Visión general]]
- [[Economía — Cuentas y saldos]]
- [[Economía — Transacciones]]
- [[Economía — Tienda]]
- [[Economía — Recompensas]]

### Multimedia

Documenta reproducción, búsqueda y funciones de contenido.

- [[Multimedia — Visión general]]
- [[Multimedia — Música]]
- [[Multimedia — Letras y metadatos]]
- [[Multimedia — Reproducción]]
- [[Multimedia — Integraciones]]

### Moderación

Documenta acciones de moderación y gestión de casos.

- [[Moderación — Visión general]]
- [[Moderación — Comandos]]
- [[Moderación — Casos]]
- [[Moderación — Automatizaciones]]
- [[Moderación — Roles y permisos]]
- [[Moderación — Auditoría]]

### Seguridad

Documenta protección, detección y respuesta.

- [[Seguridad — Visión general]]
- [[Seguridad — Detección]]
- [[Seguridad — Alertas]]
- [[Seguridad — Incidentes]]
- [[Seguridad — Protección]]
- [[Seguridad — Respuesta]]

### Utilidades

Documenta funciones generales del bot y administración.

- [[Utilidades — Visión general]]
- [[Utilidades — Configuración]]
- [[Utilidades — Información]]
- [[Utilidades — Recordatorios]]
- [[Utilidades — Herramientas]]
- [[Utilidades — Administración]]

## Dependencias entre features

```text
Configuración
      ↓
Permisos
      ↓
Persistencia
      ↓
Features de negocio
      ↓
Notificaciones
      ↓
Analítica y observabilidad
```

IA puede consumir resultados de otras features, pero no debe sustituir sus reglas de negocio.

Ejemplos:

```text
Voz → XP → Nivel → Recompensa → Notificación
Economía → Transacción → Auditoría
Moderación → Caso → Auditoría → Notificación
IA → Contexto autorizado → Respuesta validada
```

## Priorización inicial

### Prioridad alta

- Configuración.
- Permisos.
- Persistencia base.
- IA conversacional.
- Comunidad básica.
- Observabilidad.
- Seguridad.

### Prioridad media

- Voz.
- Economía.
- Recompensas.
- Moderación avanzada.
- Multimedia.
- Memoria ampliada.

### Prioridad posterior

- Dashboard.
- Planes avanzados.
- Integraciones adicionales.
- Automatizaciones complejas.
- Analítica avanzada.

La prioridad final debe ajustarse al estado real del repositorio y al objetivo de producto.

## Estado de implementación

Este índice no marca automáticamente ninguna feature como implementada.

Cada nota debe contrastarse con:

- Código.
- Configuración.
- Persistencia.
- Comandos registrados.
- Tests.
- Integraciones activas.
- Despliegue real.

## Ruta siguiente

La documentación detallada puede crearse en este orden:

1. [[IA — Visión general]].
2. [[Comunidad — Visión general]].
3. [[Voz — Visión general]].
4. [[Economía — Visión general]].
5. [[Multimedia — Visión general]].
6. [[Moderación — Visión general]].
7. [[Seguridad — Visión general]].
8. [[Utilidades — Visión general]].

## Notas relacionadas

- [[Arquitectura — Flujo de eventos]]
- [[Arquitectura — Capas del sistema]]
- [[Arquitectura — Persistencia]]
- [[Arquitectura — Seguridad]]
- [[Arquitectura — Observabilidad]]
- [[HannaeX — Relación con Hoshiko]]
