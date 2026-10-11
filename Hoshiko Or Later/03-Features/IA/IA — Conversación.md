---
type: feature
status: planned
area: ai
scope: guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# IA — Conversación

## Propósito

Permitir que usuarios interactúen con Hoshiko mediante mensajes o comandos, respetando el contexto del servidor, las preferencias permitidas y los principios de seguridad.

## Entradas

- Mensaje del usuario.
- Comando de conversación.
- Guild y canal.
- Configuración aplicable.
- Memoria autorizada.
- Mensajes recientes limitados.
- Estado conversacional.

## Flujo

```text
Recibir interacción
        ↓
Comprobar canal y permisos
        ↓
Aplicar cooldown y límites
        ↓
Construir contexto
        ↓
Resolver configuración de Hoshiko
        ↓
Consultar IA
        ↓
Validar respuesta
        ↓
Responder en Discord
```

## Reglas

- No enviar todo el historial por defecto.
- No mezclar datos de otros guilds.
- No revelar memoria privada.
- Respetar límites de longitud y coste.
- Responder de forma diferida cuando sea necesario.
- Informar si el proveedor no está disponible.
- No presentar propuestas como código existente.

## Configuración

- Canal permitido.
- Idioma.
- Formalidad.
- Longitud.
- Humor.
- Emojis.
- Intensidad neko.
- Memoria activada.
- Cooldown.

## Errores

- Canal no permitido.
- Falta de configuración.
- Rate limit.
- Proveedor caído.
- Timeout.
- Respuesta inválida.
- Contexto insuficiente.

## Estado

Feature planificada. La integración real debe verificarse en el código.

## Notas relacionadas

- [[IA — Visión general]].
- [[IA — Contexto y memoria]].
- [[Hoshiko — Lenguaje y voz]].
- [[Arquitectura — Integraciones externas]].
