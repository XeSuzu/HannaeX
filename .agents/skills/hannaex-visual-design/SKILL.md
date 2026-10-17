---
name: hannaex-visual-design
description: Sistema de diseño visual de HannaeX (Hoshiko): tarjetas gráficas con @napi-rs/canvas (src/Renderers/) e interfaz interactiva de Discord (Embeds, ActionRows, Buttons y Select Menus). Úsalo siempre al diseñar o mejorar tarjetas Canvas o mensajes visuales del bot.
---

# HannaeX — Diseño Visual (Canvas & Discord UI/UX)

## Cuándo usar este skill
- Al crear o rediseñar tarjetas gráficas con `@napi-rs/canvas` en `src/Renderers/` (`rankCardRenderer.ts`, `statCardRenderer.ts`, `profileRenderer.ts`, `streakRenderer.ts`, `welcomeRenderer.ts`, etc.).
- Al diseñar o pulir la experiencia visual en Discord (`EmbedBuilder`, botones, menús de selección, modales, paginación y mensajes de estado).

---

## 1. Diseño de Tarjetas en `@napi-rs/canvas` (`src/Renderers/`)

### Composición, Rejilla y Jerarquía
- **Margen de seguridad (Padding)**: Mantén un padding exterior consistente (24px–32px) y separa bloques funcionales con tarjetas internas semitransparentes (`roundRect`).
- **Jerarquía tipográfica clara**:
  1. **Primario (Nombre/Nivel/Rango)**: Fuente bold/extrabold, alto contraste (`#FFFFFF`), con truncado dinámico usando `ctx.measureText(text).width` para que nombres largos nunca desborden ni se monten sobre badges.
  2. **Secundario (Subtítulos/Tag/Estado)**: Gris claro o tono pastel suave (`rgba(255, 255, 255, 0.72)`).
  3. **Métricas y Etiquetas (XP, Voz, Mensajes, Racha)**: Etiquetas compactas en mayúsculas o semibold con valores numéricos formateados (`toLocaleString()`).

### Acabado Visual (Glassmorphism, Sombras y Degradados)
- **Paneles tipo cristal (Glassmorphism)**:
  - Usa fondos oscuros translúcidos (`rgba(18, 18, 26, 0.65)` a `0.80`) con un borde sutil de `1px` (`rgba(255, 255, 255, 0.12)`) para garantizar legibilidad sobre cualquier banner o fondo personalizado.
- **Avatares y Recortes (`ctx.clip()`)**:
  - Envuelve siempre los recortes circulares o redondeados en `ctx.save()` y `ctx.restore()`.
  - Añade un anillo exterior o sombra suave (`shadowColor`, `shadowBlur`) para separar el avatar del fondo.
- **Barras de progreso**:
  - Evita que un porcentaje muy bajo (`1%–3%`) deforme las esquinas redondeadas: aplica `ctx.clip()` sobre la pista base de la barra antes de pintar el relleno con `createLinearGradient`.

---

## 2. Diseño de Interfaz en Discord (Embeds y Componentes)

### Estética y Paleta de Hoshiko
- **Colores consistentes por contexto**:
  - Identidad Hoshiko / General: Rosa pastel / Lavanda / Acento suave (`0xffb7c5`, `0xf4a261`, `0x9b72cf`).
  - Éxito / Confirmación: Verde suave (`0x57f287` o `0x43b581`).
  - Advertencia / Cooldown: Ámbar (`0xfee75c` o `0xfaa61a`).
  - Error / Moderación crítica: Coral / Rojo suave (`0xed4245` o `0xff6b6b`).
- **Densidad de lectura en Embeds**:
  - Evita muros de texto: usa listas con viñetas limpias, bloques cortos, `inline: true` en campos comparables (máximo 3 por fila) y timestamps/footers concisos.
- **Componentes Interactivos (`ActionRowBuilder`, `ButtonBuilder`, `StringSelectMenuBuilder`)**:
  - Deshabilita botones expirados o tras finalizar una acción crítica.
  - Usa estilos semánticos (`ButtonStyle.Primary` para acción principal, `Secondary` para navegación/filtros, `Danger` para acciones destructivas como confirmar borrado o fin de lockdown).
