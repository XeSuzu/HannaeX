---
type: feature
status: planned
area: community
scope: guild
stability: medium
created: 2026-09-22
updated: 2026-09-22
---

# Comunidad — Rankings

## Propósito

Mostrar posiciones o progresos relativos dentro de un guild o periodo definido.

## Tipos

- XP total.
- XP semanal.
- XP mensual.
- Nivel.
- Voz.
- Economía.
- Misiones.
- Logros.

## Flujo

```text
Solicitud
        ↓
Determinar guild y periodo
        ↓
Consultar datos indexados
        ↓
Ordenar o cargar agregado
        ↓
Aplicar paginación
        ↓
Renderizar resultado
```

## Reglas

- No mezclar guilds.
- Definir cómo se tratan usuarios salidos.
- Respetar preferencias de privacidad.
- Limitar resultados y consultas costosas.
- Indicar el periodo del ranking.
- Usar caché cuando sea seguro.

## Rendimiento

Para rankings grandes pueden utilizarse:

- Índices.
- Agregados periódicos.
- Caché breve.
- Paginación.
- Actualización asíncrona.

## Errores

- Guild inexistente.
- Periodo inválido.
- Datos incompletos.
- Consulta lenta.
- Configuración de privacidad incompatible.

## Estado

Feature planificada.

## Notas relacionadas

- [[Comunidad — Visión general]].
- [[Comunidad — XP y niveles]].
- [[Arquitectura — Persistencia]].
- [[Arquitectura — Escalabilidad]].
