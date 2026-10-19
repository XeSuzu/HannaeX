---
type: feature
status: planned
area: utilities
scope: system-guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Utilidades — Herramientas

## Propósito

Proporcionar funciones generales que no pertenecen a una feature de negocio específica.

## Ejemplos

- Conversores.
- Cálculos.
- Formateadores.
- Encuestas.
- Temporizadores.
- Búsquedas controladas.
- Generación de identificadores.
- Utilidades de texto.
- Información de zona horaria.

## Flujo

```text
Solicitud
        ↓
Validar entrada
        ↓
Aplicar límites
        ↓
Ejecutar operación aislada
        ↓
Renderizar resultado
```

## Reglas

- Validar entradas.
- Aplicar límites de tamaño y frecuencia.
- No ejecutar código arbitrario.
- No convertir URLs inseguras sin validación.
- Mantener respuestas claras.
- No guardar datos si la operación no lo necesita.
- Respetar permisos y alcance.

## Seguridad

Las herramientas no deben:

- Ejecutar shell.
- Ejecutar código del usuario.
- Consultar datos fuera del contexto.
- Devolver secretos.
- Realizar acciones externas sin una policy definida.

## Errores

- Entrada inválida.
- Resultado fuera de rango.
- Límite excedido.
- Servicio no disponible.
- Formato no compatible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Utilidades — Visión general]].
- [[Utilidades — Información]].
- [[Arquitectura — Seguridad]].
- [[Arquitectura — Integraciones externas]].
