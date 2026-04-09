import { Events, MessageReaction, PartialUser, User } from "discord.js";

export = {
  // Usamos el enum 'Events' para mayor seguridad y claridad
  name: Events.MessageReactionRemove,

  async execute(reaction: MessageReaction, user: User | PartialUser) {
    // Asegura que `user` y `reaction` estén completamente cargados antes de procesar
    // Si el usuario es parcial (no está en caché), lo cargamos
    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error(
          "No se pudo buscar al usuario que quitó la reacción:",
          error,
        );
        return;
      }
    }

    // Ahora que estamos seguros de que 'user' es un objeto completo, podemos verificar si es un bot
    if (user.bot) return;

    // Si la reacción es parcial, la cargamos
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("No se pudo buscar la reacción:", error);
        return;
      }
    }
  },
};
