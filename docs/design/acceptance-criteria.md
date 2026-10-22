# Criterios de aceptación — resultado

## Dirección artística
- [x] Concepto visual escrito y aplicado: Mundo de Hoshiko.
- [x] La página conserva identidad sakura/anime y producto real.
- [x] Las referencias incluyen URL y principio adaptado en `art-direction.md`.
- [x] No se añadieron dependencias externas ni assets stock.

## Hero
- [x] El personaje/escena es el foco visual.
- [x] La ilustración usa `object-fit: contain` y conserva proporción.
- [x] El copy queda separado del escenario por el `hero-wash`.
- [x] La silueta cambió respecto al banner recortado: escenario separado, composición editorial y escala deliberada.
- [x] El hero tiene una versión móvil intencional con imagen arriba y copy debajo.
- [x] El movimiento ambiental se limita al hero y respeta `prefers-reduced-motion`.

## Página completa
- [x] Galería recompuesta como mosaico editorial con nota de campo.
- [x] Moderación recompuesta como layout editorial asimétrico con demo de producto.
- [x] Se alternan escena, editorial, funciones, galería y producto.
- [x] No se inventan capacidades: moderación se describe como asistencia/contexto para staff.
- [x] CTA y fallback de invitación se mantienen claros.
- [x] No se inventaron enlaces legales o de soporte.

## Sistema y accesibilidad
- [x] Se reutilizan tokens existentes de crema, sakura, plum y lavanda.
- [x] Se mantienen como máximo dos familias tipográficas del sistema existente.
- [x] Alt text útil en imágenes principales y decorativas marcadas como tales.
- [x] `prefers-reduced-motion` implementado.
- [x] No se agregaron paquetes.

## Verificación ejecutada
- [x] `npm run web:build` — Next.js 16.4.2 compila correctamente; queda solo warning informativo de `metadataBase`.
- [x] Preview 1440×900 — hero, navegación, escena y shortcuts revisados; captura `/tmp/agent-browser/pack-1440.png`.
- [x] Preview 800×755 — composición intermedia revisada; captura `/tmp/agent-browser/pack-800.png`.
- [x] Preview 375×812 — menú móvil, orden imagen/copy y CTA revisados; captura `/tmp/agent-browser/pack-375.png`.
- [x] Overflow horizontal — `scrollWidth` coincide con `innerWidth` en 375px.

## Pendientes conocidos
- `metadataBase` sigue siendo un warning informativo si no se configura un dominio canónico verificable.
- La URL de invitación conserva el fallback “Invitación próximamente” mientras no exista una URL configurada.
