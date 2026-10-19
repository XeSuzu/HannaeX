---
type: feature
status: planned
area: security
scope: system-guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Seguridad — Detección

## Propósito

Identificar señales de abuso, configuración insegura, fallos o actividad anómala.

## Señales posibles

- Spam.
- Rate limit anómalo.
- Eventos duplicados.
- Intentos repetidos de permisos.
- Cambios de configuración inesperados.
- Fallos de webhooks.
- Inconsistencias económicas.
- Uso anormal de IA.
- Actividad de raid.
- Acceso fuera de alcance.

## Flujo

```text
Evento o métrica
        ↓
Normalizar señal
        ↓
Comparar con policy
        ↓
Calcular severidad
        ↓
Crear alerta o incidente
        ↓
Aplicar protección si corresponde
```

## Reglas

- Diferenciar señal de prueba concluyente.
- Evitar acusaciones automáticas con evidencia insuficiente.
- Asociar guild y contexto correctamente.
- Registrar el mínimo necesario.
- Reducir falsos positivos.
- No revelar criterios completos que faciliten evasión.

## Estado

Feature planificada.

## Notas relacionadas

- [[Seguridad — Visión general]].
- [[Seguridad — Alertas]].
- [[Seguridad — Incidentes]].
- [[Moderación — Automatizaciones]].
- [[Arquitectura — Observabilidad]].
