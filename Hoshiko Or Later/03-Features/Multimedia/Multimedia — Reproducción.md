---
type: feature
status: planned
area: multimedia
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Multimedia — Reproducción

## Propósito

Gestionar la reproducción de contenido en canales de voz.

## Estados

```text
idle
  ↓
connecting
  ↓
playing
  ↓
paused
  ↓
queued
  ↓
finished / stopped
```

## Operaciones

- Reproducir.
- Pausar.
- Continuar.
- Saltar.
- Detener.
- Vaciar cola.
- Ver cola.
- Repetir.
- Ajustar volumen dentro de límites.

## Flujo

```text
Solicitud
        ↓
Validar usuario y canal
        ↓
Verificar permisos de voz
        ↓
Resolver pista
        ↓
Crear o actualizar reproductor del guild
        ↓
Gestionar cola
        ↓
Responder estado
```

## Reglas

- Mantener una cola por guild o una política definida.
- Evitar dos reproductores activos para el mismo guild.
- Liberar recursos al detener.
- Recuperarse de desconexiones.
- Limitar volumen y duración cuando corresponda.
- No bloquear el proceso principal.

## Errores

- Bot sin permiso de conexión.
- Canal inaccesible.
- Pista no reproducible.
- Reproductor inexistente.
- Proveedor caído.
- Desconexión.

## Estado

Feature planificada.

## Notas relacionadas

- [[Multimedia — Visión general]].
- [[Multimedia — Música]].
- [[Multimedia — Integraciones]].
- [[Arquitectura — Workers y tareas asíncronas]].
