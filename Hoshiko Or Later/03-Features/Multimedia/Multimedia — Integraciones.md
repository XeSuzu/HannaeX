---
type: feature
status: planned
area: multimedia
scope: system
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# Multimedia — Integraciones

## Propósito

Aislar proveedores de música, audio, metadatos y letras mediante adapters y contratos internos.

## Principio

```text
Las features consumen capacidades internas;
los adapters conocen los detalles del proveedor.
```

## Capacidades

```ts
interface MusicProvider {
  search(query: string): Promise<MusicSearchResult>;
  resolveTrack(input: ResolveTrackInput): Promise<ResolvedTrack>;
}

interface MetadataProvider {
  getMetadata(input: MetadataInput): Promise<TrackMetadata>;
}
```

## Reglas

- No importar SDKs directamente desde comandos.
- Definir timeouts.
- Clasificar errores.
- Aplicar rate limits.
- Cachear solo datos seguros.
- Respetar disponibilidad y términos de cada proveedor.
- Permitir mocks en tests.
- Limitar tamaño y duración del contenido.

## Fallback

Si un proveedor falla:

- Probar una alternativa compatible cuando sea seguro.
- Informar si no hay fallback.
- No enviar datos a otro proveedor sin revisar privacidad.
- Evitar reintentos indefinidos.

## Observabilidad

Registrar de forma segura:

- Proveedor.
- Operación.
- Latencia.
- Estado.
- Rate limits.
- Reintentos.
- `correlationId`.

## Estado

Feature planificada.

## Notas relacionadas

- [[Multimedia — Visión general]].
- [[Multimedia — Música]].
- [[Multimedia — Letras y metadatos]].
- [[Multimedia — Reproducción]].
- [[Arquitectura — Integraciones externas]].
