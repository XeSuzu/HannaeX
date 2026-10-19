---
type: feature
status: planned
area: ai
scope: user-guild
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# IA — Contexto y memoria

## Propósito

Controlar qué información puede utilizar la IA durante una interacción y qué datos pueden conservarse para futuras conversaciones.

## Contextos

- Mensaje actual.
- Mensajes recientes.
- Canal.
- Guild.
- Usuario.
- Configuración.
- Estado conversacional.
- Feature activa.
- Memoria relevante.

## Alcances de memoria

```text
Temporal de interacción
        ↓
Canal o hilo
        ↓
Guild
        ↓
Usuario dentro de guild
        ↓
Preferencia global autorizada
```

El alcance debe acompañar cada registro.

## Flujo de memoria

```text
Detectar candidato
        ↓
Evaluar utilidad
        ↓
Determinar propietario
        ↓
Verificar consentimiento
        ↓
Guardar o descartar
        ↓
Indexar si corresponde
        ↓
Recuperar con filtro
        ↓
Eliminar o expirar cuando aplique
```

## Reglas

- No guardar todo automáticamente.
- No guardar secretos innecesarios.
- No mezclar guilds.
- Permitir corrección y eliminación.
- No usar memoria privada en canales públicos sin necesidad.
- Limitar la cantidad de recuerdos enviados al modelo.
- Verificar vigencia y relevancia.

## Datos derivados

Si existen embeddings, resúmenes o índices, también deben eliminarse o actualizarse cuando se elimina el recuerdo original.

## Errores

- Memoria sin propietario.
- Alcance inválido.
- Consentimiento desconocido.
- Registro eliminado recuperado por error.
- Índice desactualizado.
- Exposición entre guilds.

## Estado

Feature planificada. La arquitectura de persistencia y privacidad debe verificarse antes de implementarla.

## Notas relacionadas

- [[IA — Visión general]].
- [[IA — Conversación]].
- [[Arquitectura — Persistencia]].
- [[Arquitectura — Seguridad]].
- [[Hoshiko — Memoria]].
