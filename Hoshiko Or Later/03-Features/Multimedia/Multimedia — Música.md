---
type: feature
status: planned
area: multimedia
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Multimedia — Música

## Propósito

Buscar y seleccionar contenido musical compatible con las integraciones disponibles.

## Entradas

- Texto de búsqueda.
- URL permitida.
- Identificador de pista.
- Comando de reproducción.

## Flujo

```text
Consulta o URL
        ↓
Validar entrada
        ↓
Buscar o resolver
        ↓
Mostrar resultados
        ↓
Seleccionar pista
        ↓
Añadir a cola
```

## Reglas

- Limitar resultados.
- Validar origen.
- Informar cuando una pista no esté disponible.
- No descargar contenido si la integración no lo permite.
- Aplicar rate limits.
- Verificar permisos del usuario y del bot.
- Evitar duplicar solicitudes costosas.

## Resultados

Un resultado puede incluir:

- Título.
- Artista.
- Duración.
- Fuente.
- Identificador externo.
- URL de reproducción o resolución.

## Errores

- Consulta vacía.
- URL inválida.
- Proveedor no disponible.
- Resultado no encontrado.
- Contenido no reproducible.
- Rate limit.
- Permiso de voz insuficiente.

## Estado

Feature planificada.

## Notas relacionadas

- [[Multimedia — Visión general]].
- [[Multimedia — Reproducción]].
- [[Multimedia — Letras y metadatos]].
- [[Multimedia — Integraciones]].
