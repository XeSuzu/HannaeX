---
type: feature
status: planned
area: utilities
scope: guild-user
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Utilidades — Recordatorios

## Propósito

Crear y gestionar recordatorios asociados a usuarios, guilds o canales autorizados.

## Componentes

- Texto.
- Fecha y hora.
- Zona horaria.
- Propietario.
- Destino.
- Estado.
- Identificador.
- Reintentos.

## Estados

```text
scheduled
  ↓
delivered
  ↓
completed / cancelled / failed
```

## Flujo

```text
Solicitud
        ↓
Validar texto y fecha
        ↓
Resolver zona horaria
        ↓
Validar destino y permisos
        ↓
Guardar recordatorio
        ↓
Programar trabajo
        ↓
Enviar al momento indicado
        ↓
Registrar resultado
```

## Reglas

- Confirmar la zona horaria.
- No enviar a canales sin autorización.
- Permitir editar y eliminar.
- Usar scheduler o worker.
- Evitar duplicación tras reinicio.
- Validar fechas pasadas.
- Limitar cantidad y frecuencia por usuario o guild.

## Errores

- Fecha inválida.
- Zona horaria desconocida.
- Canal inaccesible.
- Recordatorio inexistente.
- Permiso insuficiente.
- Scheduler no disponible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Utilidades — Visión general]].
- [[Arquitectura — Workers y tareas asíncronas]].
- [[Arquitectura — Persistencia]].
- [[Arquitectura — Recuperación ante fallos]].
