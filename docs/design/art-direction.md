# Dirección artística — Hoshiko

## Dirección elegida
**B. Mundo de Hoshiko.** La landing alterna escena de personaje, bloques editoriales, funciones y demostración de producto. Se eligió sobre “Hoshiko protagonista” porque los assets disponibles son banners/escenas completas: preservan mejor sus puntos focales cuando viven en un escenario `contain`, mientras el producto conserva suficiente peso narrativo para explicar el bot.

## Concepto aplicado
Sakura nocturna, luz suave y tecnología amable: crema cálida para la bienvenida y el CTA, rosa para exploración, ciruela/lavanda para la demo de moderación. La identidad no depende de partículas: la silueta proviene de la escena hero, la alternancia editorial y la interfaz de producto.

## Referencias investigadas
- Magic UI Particles — https://magicui.design/docs/components/particles — patrón de partículas y `prefers-reduced-motion`; no se instaló ni se usó como decoración global.
- Aceternity Background Beams — https://ui.aceternity.com/components/background-beams — estudiado para profundidad por capas; se reprodujo solo el principio de escenario ambiental, sin dependencia.
- shadcn/ui Card — https://ui.shadcn.com/docs/components/card — referencia para separar superficies de contenido; adaptado con CSS local.
- 21st.dev — https://21st.dev/ — revisado como catálogo de patrones; no se copió ningún componente ni se añadió dependencia.

No se instalaron componentes externos: el proyecto ya usa Next.js/React y la adaptación local reduce peso, preserva la identidad y evita dependencias de versión innecesarias.

## Decisiones de composición
- Hero: copy editorial a la izquierda y asset completo en un escenario independiente a la derecha; sin `object-fit: cover` ni recorte curvo.
- Funciones: tarjetas con pesos visuales distintos y copy verificable.
- Galería: mosaico asimétrico con imagen dominante, stack secundario y nota editorial.
- Moderación: copy a la izquierda y demo legible a la derecha; en móvil se apila sin rotación.
- CTA: bloque propio con estado beta/fallback, sin prometer una invitación configurada si no existe URL.

## Reglas
Se priorizan personaje, composición, claridad del producto y movimiento. Pétalos/halos solo aparecen en el hero y se desactivan con `prefers-reduced-motion`; no sustituyen información ni iconos funcionales.
