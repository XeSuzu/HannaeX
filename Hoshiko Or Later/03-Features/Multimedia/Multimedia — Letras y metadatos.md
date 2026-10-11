---
type: feature
status: planned
area: multimedia
scope: guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Multimedia — Letras y metadatos

## Propósito

Obtener información descriptiva o letras mediante proveedores compatibles.

## Datos posibles

- Título.
- Artista.
- Álbum.
- Duración.
- Imagen.
- Género.
- Identificador externo.
- Letras, si están disponibles y permitidas.

## Flujo

```text
Pista o búsqueda
        ↓
Resolver metadatos
        ↓
Consultar proveedor de letras si aplica
        ↓
Validar coincidencia
        ↓
Formatear respuesta
        ↓
Cachear datos permitidos
```

## Reglas

- Indicar cuando los datos provienen de un proveedor externo.
- No presentar coincidencias inciertas como exactas.
- Respetar derechos y términos de uso.
- Limitar solicitudes repetidas mediante caché.
- No mostrar contenido que el proveedor no permita.
- Evitar registrar letras completas innecesariamente.

## Errores

- Coincidencia ambigua.
- Letras no disponibles.
- Proveedor caído.
- Datos incompletos.
- Límite externo.

## Estado

Feature planificada.

## Notas relacionadas

- [[Multimedia — Visión general]].
- [[Multimedia — Música]].
- [[Multimedia — Integraciones]].
- [[Arquitectura — Integraciones externas]].
