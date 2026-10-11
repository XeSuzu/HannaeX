---
type: feature
status: planned
area: ai
scope: channel-guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# IA — Resúmenes

## Propósito

Generar resúmenes de conversaciones, hilos, eventos o información seleccionada sin exponer más datos de los necesarios.

## Entradas

- Canal o hilo autorizado.
- Rango temporal.
- Mensajes seleccionados.
- Usuario solicitante.
- Formato deseado.
- Idioma.

## Flujo

```text
Solicitud
        ↓
Validar acceso al canal
        ↓
Definir alcance temporal
        ↓
Cargar mensajes permitidos
        ↓
Eliminar datos innecesarios
        ↓
Encolar si es largo
        ↓
Consultar proveedor
        ↓
Validar salida
        ↓
Entregar resumen
```

## Reglas

- Respetar permisos del canal.
- No incluir mensajes privados fuera del alcance.
- Indicar que el resumen puede omitir detalles.
- No atribuir afirmaciones si el contexto es insuficiente.
- Evitar conservar el material temporal más tiempo del necesario.
- Aplicar límites de tamaño y coste.

## Formatos posibles

- Resumen breve.
- Puntos principales.
- Decisiones.
- Tareas pendientes.
- Línea temporal.
- Incidentes.

## Errores

- Canal inaccesible.
- Rango demasiado grande.
- Sin mensajes.
- Proveedor no disponible.
- Timeout.
- Coste o límite excedido.

## Estado

Feature planificada.

## Notas relacionadas

- [[IA — Visión general]].
- [[IA — Conversación]].
- [[Arquitectura — Workers y tareas asíncronas]].
- [[Arquitectura — Seguridad]].
