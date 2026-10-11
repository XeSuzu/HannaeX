---
type: feature
status: planned
area: utilities
scope: system-guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Utilidades — Administración

## Propósito

Proporcionar herramientas operativas para revisar el estado de HannaeX y ejecutar acciones administrativas autorizadas.

## Operaciones posibles

- Diagnóstico.
- Recarga de configuración.
- Revisión de colas.
- Revisión de integraciones.
- Modo mantenimiento.
- Reparación controlada.
- Consulta de auditoría.
- Verificación de health checks.
- Revisión de jobs fallidos.

## Flujo

```text
Solicitud administrativa
        ↓
Validar actor y alcance
        ↓
Clasificar lectura o escritura
        ↓
Confirmar si es sensible
        ↓
Ejecutar servicio
        ↓
Auditar
        ↓
Mostrar resultado filtrado
```

## Reglas

- Acceso restringido.
- Confirmación para acciones destructivas.
- Auditoría obligatoria.
- No mostrar secretos.
- Separar diagnóstico de modificación.
- No permitir que una respuesta de IA ejecute acciones administrativas directamente.
- Mantener procedimientos de rollback o compensación.

## Acciones sensibles

- Activar modo mantenimiento.
- Desactivar una feature.
- Reprocesar transacciones.
- Eliminar datos.
- Rotar credenciales.
- Pausar workers.
- Cambiar límites críticos.

Estas operaciones deben tener permisos específicos y una confirmación adecuada.

## Diagnóstico

Puede mostrar:

- Versión.
- Estado de dependencias.
- Tamaño de colas.
- Jobs fallidos.
- Latencia.
- Estado de configuración.
- Estado de base de datos sin credenciales.

## Errores

- Permiso insuficiente.
- Alcance inválido.
- Acción no confirmada.
- Servicio no disponible.
- Operación no reversible.
- Auditoría fallida.

## Estado

Feature planificada.

## Notas relacionadas

- [[Utilidades — Visión general]].
- [[Utilidades — Configuración]].
- [[Utilidades — Información]].
- [[Arquitectura — Seguridad]].
- [[Arquitectura — Observabilidad]].
- [[Arquitectura — Despliegue]].
- [[Arquitectura — Recuperación ante fallos]].
