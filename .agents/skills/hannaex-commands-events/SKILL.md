---
name: hannaex-commands-events
description: Guía y contratos para crear o modificar comandos SlashCmds, PrefixCmd y listeners de eventos Discord.js v14 en HannaeX. Úsalo siempre que trabajes en src/Commands/ o src/Events/.
---

# HannaeX — Comandos y Eventos (Discord.js v14)

## Cuándo usar este skill
- Al crear, editar o depurar comandos en `src/Commands/SlashCmds/<Categoria>/` o `src/Commands/PrefixCmd/`.
- Al añadir o modificar listeners de eventos en `src/Events/`.

## Reglas de arquitectura
1. **Coordinadores delgados**: Los comandos y eventos solo validan entrada, gestionan permisos/cooldowns y responden a Discord; la lógica de negocio vive en `src/Features/` o `src/Services/`.
2. **Contratos tipados (`src/Interfaces/Command.ts`)**:
   - Usa `SlashCommand` para comandos de barra (`export default command` con `data: new SlashCommandBuilder()`, `options?: CommandOptions`, `execute(interaction, client)` y opcionalmente `prefixRun(client, message, args)` o `autocomplete(interaction, client)`).
   - Usa `PrefixCommand` para comandos exclusivos de prefijo en `src/Commands/PrefixCmd/`.
   - El cliente tipado es `HoshikoClient` (`src/client/HoshikoClient.ts`).
3. **Deferral y respuestas seguras**:
   - Si `options.defer` o `command.defer` está activo, el handler de interacción ya puede haber diferido la respuesta. Verifica `interaction.deferred || interaction.replied` antes de elegir entre `reply()` y `editReply()`.
   - Para respuestas efímeras en Discord.js v14, usa `MessageFlags.Ephemeral` o `options: { ephemeral: true }`.
4. **Seguridad y validación (`src/Security/`)**:
   - Reutiliza `Guardian` (`src/Security/Permissions/Guardian.ts`), `Limiter` (`src/Security/RateLimit/Limiter.ts`), `InputValidator` (`src/Security/Validators/InputValidator.ts`) y `AuditManager` (`src/Security/Logger/AuditManager.ts`).
5. **Verificación sin conectar a Discord**:
   - Compila con `npx tsc --noEmit` y `npm test` (no uses `npm run dev` para verificar).
