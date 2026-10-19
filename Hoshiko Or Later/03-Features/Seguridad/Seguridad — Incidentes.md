---
type: feature
status: planned
area: security
scope: system-guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Seguridad — Incidentes

## Propósito

Gestionar eventos de seguridad o integridad desde la detección hasta la resolución.

## Estados

```text
detected
  ↓
triaged
  ↓
contained
  ↓
recovering
  ↓
resolved / false_positive
```

## Datos

- Identificador.
- Severidad.
- Fuente.
- Guild afectado.
- Evidencia mínima.
- Acciones tomadas.
- Responsable.
- Fechas.
- Causa probable o confirmada.

## Flujo

```text
Detectar
        ↓
Clasificar
        ↓
Contener
        ↓
Investigar
        ↓
Corregir
        ↓
Verificar
        ↓
Cerrar
```

## Reglas

- Restringir acceso.
- Mantener historial.
- No eliminar evidencia operativa sin política.
- Separar investigación de sanción automática.
- Registrar cambios de estado.
- Evitar incluir secretos en el caso.

## Estado

Feature planificada.

## Notas relacionadas

- [[Seguridad — Visión general]].
- [[Seguridad — Detección]].
- [[Seguridad — Alertas]].
- [[Seguridad — Respuesta]].
- [[Arquitectura — Recuperación ante fallos]].
