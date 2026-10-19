---
type: feature
status: planned
area: ai
scope: system
stability: high
created: 2026-09-22
updated: 2026-09-22
---

# IA — Herramientas

## Propósito

Permitir que la IA solicite operaciones controladas de HannaeX mediante herramientas tipadas y autorizadas.

## Principio

```text
La IA puede proponer una herramienta.
HannaeX decide si puede ejecutarse.
```

Una respuesta de IA nunca equivale a una autorización.

## Herramienta

Cada herramienta debe definir:

- Nombre.
- Descripción.
- Esquema de entrada.
- Alcance.
- Permisos.
- Efectos secundarios.
- Reversibilidad.
- Confirmación necesaria.
- Resultado.
- Auditoría.

## Clases

### Lectura

- Consultar configuración.
- Leer perfil propio.
- Consultar ranking.
- Obtener estado de una feature.

### Preparación

- Crear un borrador.
- Preparar un resumen.
- Proponer una configuración.
- Preparar una respuesta.

### Escritura

- Cambiar configuración.
- Guardar memoria.
- Crear una recompensa.
- Enviar un mensaje.

### Acciones sensibles

- Borrar datos.
- Moderar usuarios.
- Modificar saldo.
- Exportar información.
- Ejecutar pagos.

Las herramientas de escritura o sensibles deben validar permisos y confirmar cuando corresponda.

## Flujo

```text
Modelo solicita herramienta
        ↓
Validar esquema
        ↓
Validar usuario y guild
        ↓
Validar permisos
        ↓
Evaluar policy
        ↓
Pedir confirmación si aplica
        ↓
Ejecutar servicio
        ↓
Auditar
        ↓
Devolver resultado limitado al modelo
```

## Reglas

- No ejecutar código generado.
- No permitir nombres de herramientas dinámicos sin registro.
- No enviar secretos al modelo.
- No aceptar IDs fuera del contexto.
- Aplicar idempotencia.
- Registrar acciones sensibles.
- Separar resultado técnico de mensaje final.

## Estado

Feature planificada.

## Notas relacionadas

- [[IA — Visión general]].
- [[Arquitectura — Seguridad]].
- [[Arquitectura — Integraciones externas]].
- [[Arquitectura — Flujo de eventos]].
