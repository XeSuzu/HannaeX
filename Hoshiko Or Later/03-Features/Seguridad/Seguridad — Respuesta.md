---
type: feature
status: planned
area: security
scope: system-guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Seguridad — Respuesta

## Propósito

Ejecutar una respuesta controlada ante incidentes, abuso, actividad anómala o degradación de servicios.

## Acciones posibles

- Bloquear una operación.
- Pausar una integración.
- Reducir límites.
- Desactivar una feature.
- Crear un caso.
- Notificar a responsables.
- Rotar credenciales.
- Iniciar recuperación.
- Activar modo mantenimiento.

## Flujo

```text
Señal o incidente
        ↓
Validar severidad
        ↓
Identificar alcance
        ↓
Seleccionar respuesta
        ↓
Validar permisos
        ↓
Ejecutar acción
        ↓
Auditar
        ↓
Verificar recuperación
```

## Reglas

- Requerir permisos adecuados.
- Registrar toda acción importante.
- Mantener proporcionalidad.
- Evitar acciones irreversibles sin confirmación o policy explícita.
- Separar contención automática de decisiones administrativas.
- Mantener disponible una ruta de recuperación.
- No exponer secretos durante la respuesta.

## Niveles de respuesta

### Preventiva

- Aplicar cooldown.
- Reducir rate limit.
- Solicitar confirmación.
- Bloquear un payload inválido.

### Contención

- Pausar una feature.
- Aislar un guild.
- Detener un worker.
- Abrir un circuit breaker.

### Correctiva

- Revertir configuración.
- Rotar credenciales.
- Reprocesar datos.
- Compensar una transacción.
- Restaurar un servicio.

## Comunicación

La respuesta debe informar solo a los destinatarios adecuados:

- Usuario afectado.
- Moderadores.
- Administradores.
- Equipo operativo.

El mensaje debe distinguir entre:

- Acción ejecutada.
- Acción pendiente.
- Acción rechazada.
- Acción en revisión.

## Estado

Feature planificada.

## Notas relacionadas

- [[Seguridad — Visión general]].
- [[Seguridad — Detección]].
- [[Seguridad — Alertas]].
- [[Seguridad — Incidentes]].
- [[Seguridad — Protección]].
- [[Arquitectura — Seguridad]].
- [[Arquitectura — Recuperación ante fallos]].
