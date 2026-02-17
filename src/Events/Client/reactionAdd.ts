import {
  MessageReaction,
  User,
  PartialUser,
  Events,
  PermissionFlagsBits,
} from "discord.js"; // 👈 Agregamos PermissionFlagsBits
import Meme from "../../Database/meme";
import ServerConfig from "../../Models/serverConfig";
import ReactionConfig from "../../Database/Schemas/ReactionConfig";
import ViralSetup from "../../Database/Schemas/ViralSetup";
import ActiveRole from "../../Database/Schemas/ActiveRole";

export default {
  name: Events.MessageReactionAdd,

  async execute(reaction: MessageReaction, user: User | PartialUser) {
    if (user.partial) await user.fetch().catch(() => null);
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }

    const { message } = reaction;
    const guildId = message.guild?.id;
    if (!guildId || !message.guild) return;

    // ⚙️ Carga de configuración
    const config = await ServerConfig.findOne({ guildId: guildId });
    const emojiName = reaction.emoji.name;

    // =========================================================
    // 1. LÓGICA MEMES
    // =========================================================
    if (config && message.channel.id === config.memeChannelId) {
      const emojisConPuntos: { [key: string]: number } = { "👍": 1, "👎": -1 };
      if (emojiName && emojisConPuntos[emojiName]) {
        try {
          await Meme.findOneAndUpdate(
            { messageId: message.id, guildId: guildId },
            {
              $inc: { points: emojisConPuntos[emojiName] },
              $setOnInsert: {
                authorId: message.author?.id,
                memeUrl: message.attachments.first()?.url,
                channelId: message.channel.id,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        } catch (e) {}
      }
    }

    // =========================================================
    // 2. LÓGICA IA VISUAL
    // =========================================================
    // ... (Tu código de IA queda igual) ...
    const UMBRAL_REACCIONES = 3;
    const esPositivo =
      emojiName === "👍" ||
      emojiName === "😂" ||
      emojiName === "🔥" ||
      emojiName === "❤️";
    if (
      config &&
      config.aiMode === "libre" &&
      esPositivo &&
      (reaction.count || 0) >= UMBRAL_REACCIONES
    ) {
      // ... lógica de guardar imagen ...
    }

    // Seguridad: asigna roles de forma segura verificando existencia y permisos
    const safeAddRole = async (
      member: any,
      roleId: string,
      duration: number,
    ) => {
      try {
        // 1. Buscamos el rol en el servidor
        const role = message.guild?.roles.cache.get(roleId);

        // Comprueba existencia y permisos antes de asignar
        if (!role) return console.log(`El rol ${roleId} no existe.`);
        if (!role.editable)
          return console.log(
            `Permiso denegado: ${role.name} por encima del bot.`,
          );

        // Asignar si aún no lo tiene
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
          console.log(`🎁 Rol entregado a ${member.user.tag}`);

          if (duration > 0) {
            const expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + duration);
            await ActiveRole.create({
              userId: member.id,
              guildId: guildId,
              roleId: roleId,
              expiresAt: expiration,
            });
          }
        }
      } catch (err) {
        console.error(`❌ Error controlado dando rol:`, err);
      }
    };

    // =========================================================
    // 3. DESAFÍO ESPECÍFICO (Reaction Config)
    // =========================================================
    const challengeConfig = await ReactionConfig.findOne({
      messageId: message.id,
      emoji: emojiName,
    });

    if (
      challengeConfig &&
      (reaction.count || 0) >= challengeConfig.requiredCount
    ) {
      const member = await message.guild.members
        .fetch(user.id)
        .catch(() => null);
      if (member) {
        // Usamos la función segura
        await safeAddRole(
          member,
          challengeConfig.roleId,
          challengeConfig.durationMinutes,
        );
      }
    }

    // =========================================================
    // 4. VIRAL ROLE (Global)
    // =========================================================
    const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
    if (emojiIdentifier) {
      const viralConfig = await ViralSetup.findOne({
        guildId: guildId,
        emoji: emojiIdentifier,
      });

      if (viralConfig && (reaction.count || 0) >= viralConfig.requiredCount) {
        const authorId = message.author?.id;
        if (authorId && !message.author?.bot) {
          const authorMember = await message.guild.members
            .fetch(authorId)
            .catch(() => null);
          if (authorMember) {
            // Usamos la función segura
            await safeAddRole(
              authorMember,
              viralConfig.roleId,
              viralConfig.durationMinutes,
            );
          }
        }
      }
    }
  },
};
