import { EmbedBuilder, GuildMember, Message, TextChannel } from "discord.js";
import LevelConfig from "../Models/LevelConfig";
import LocalLevel from "../Models/LocalLevels";

// XP necesaria para subir del nivel N al N+1
export function xpForLevel(level: number): number {
  return 100 + level * 50;
}

// XP total acumulada hasta el nivel N
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

// Verificar si es un nivel "importante" (milestone)
function isMilestone(level: number): boolean {
  const milestones = [5, 10, 15, 20, 25, 30, 50, 75, 100];
  return milestones.includes(level);
}

export async function handleLevelXp(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  const config = await LevelConfig.findOne({ guildId: message.guild.id });

  // Si el sistema está desactivado, salir
  if (config && !config.enabled) return;

  // Ignorar bots si está configurado
  if (config?.ignoreBots && message.author.bot) return;

  // Canal ignorado
  if (config?.ignoredChannels.includes(message.channelId)) return;

  // Rol ignorado
  const memberRoles = message.member?.roles.cache.map((r) => r.id) ?? [];
  if (config?.ignoredRoles.some((r: string) => memberRoles.includes(r))) return;

  // Validar longitud mínima del mensaje
  const minLength = config?.xpMinLength ?? 5;
  if (message.content.length < minLength) return;

  const baseXp = config?.xpPerMessage ?? 20;
  const cooldownSecs = config?.xpCooldown ?? 60;
  const multiplier = config?.xpMultiplier ?? 1.0;

  const now = new Date();

  let profile = await LocalLevel.findOne({
    userId: message.author.id,
    guildId: message.guild.id,
  });

  if (!profile) {
    profile = await LocalLevel.create({
      userId: message.author.id,
      guildId: message.guild.id,
      xp: 0,
      level: 0,
      messagesSent: 0,
      lastXpGain: new Date(0),
    });
  }

  // Cooldown
  const secondsSinceLast =
    (now.getTime() - profile.lastXpGain.getTime()) / 1000;
  if (secondsSinceLast < cooldownSecs) {
    // igual contamos el mensaje
    await LocalLevel.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { messagesSent: 1 } },
    );
    return;
  }

  // XP base + bonus por menciones
  let earned = Math.floor(baseXp + Math.random() * baseXp * 0.5);

  // Bonus por menciones
  if (config?.xpMentionBonus && config.xpMentionBonus > 0) {
    const mentions = message.mentions.users.size;
    if (mentions > 0) {
      const mentionBonus = Math.min(
        mentions * config.xpMentionBonus,
        config.xpMentionMaxBonus ?? 25,
      );
      earned += Math.floor(mentionBonus);
    }
  }

  // Aplicar multiplicador
  earned = Math.floor(earned * multiplier);

  const newXp = profile.xp + earned;
  let newLevel = profile.level;

  // Calcular si subió de nivel
  while (newXp >= totalXpForLevel(newLevel + 1)) {
    newLevel++;
  }

  const leveledUp = newLevel > profile.level;
  const oldLevel = profile.level;

  await LocalLevel.updateOne(
    { userId: message.author.id, guildId: message.guild.id },
    {
      xp: newXp,
      level: newLevel,
      lastXpGain: now,
      $inc: { messagesSent: 1 },
    },
  );

  if (!leveledUp) return;

  // ── Asignar roles de nivel ──
  if (config?.levelRoles.length && message.member) {
    await assignLevelRoles(
      message.member,
      config.levelRoles,
      oldLevel,
      newLevel,
      message.guild,
    );
  }

  // ── Anuncio de subida de nivel ──
  const announceMode = config?.announceMode ?? "all";

  // Silencioso = no anunciar
  if (announceMode === "silent") return;

  // Milestone = solo niveles importantes
  if (announceMode === "milestone" && !isMilestone(newLevel)) return;

  const embed = new EmbedBuilder()
    .setColor(0xffb7c5)
    .setTitle("✨ ¡Subiste de nivel!")
    .setDescription(
      `**${message.author.displayName}** ha alcanzado el **nivel ${newLevel}** 🌸`,
    )
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      {
        name: "Nivel",
        value: `\`${oldLevel}\` → \`${newLevel}\``,
        inline: true,
      },
      { name: "XP Total", value: `\`${newXp}\``, inline: true },
    )
    .setFooter({ text: "Hoshiko Levels 🐾" })
    .setTimestamp();

  // DM
  if (config?.announceDM) {
    await message.author.send({ embeds: [embed] }).catch(() => null);
    return;
  }

  // Canal configurado o canal actual
  const announceChannelId = config?.announceChannelId ?? message.channelId;
  const channel = message.guild.channels.cache.get(announceChannelId) as
    | TextChannel
    | undefined;
  await channel?.send({ embeds: [embed] }).catch(() => null);
}

// Asignar roles gained al subir de nivel
async function assignLevelRoles(
  member: GuildMember,
  levelRoles: Array<{ level: number; roleId: string; message?: string | null }>,
  oldLevel: number,
  newLevel: number,
  guild: any,
): Promise<void> {
  // Roles que ganó con este nivel
  const rolesGained = levelRoles.filter(
    (lr) => lr.level > oldLevel && lr.level <= newLevel,
  );

  for (const roleConfig of rolesGained) {
    try {
      const role = guild.roles.cache.get(roleConfig.roleId);
      if (role && !member.roles.cache.has(roleConfig.roleId)) {
        await member.roles.add(roleConfig.roleId);

        // Enviar mensaje personalizado si existe
        if (roleConfig.message) {
          const channel =
            member.guild.systemChannel ??
            guild.channels.cache.find((c: any) => c.isTextBased());
          if (channel) {
            const roleMessage = roleConfig.message
              .replace("{user}", member.displayName)
              .replace("{role}", role.name)
              .replace("{level}", roleConfig.level.toString());
            await channel.send(roleMessage).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.error(
        `[LevelRoles] Error asignando rol ${roleConfig.roleId}:`,
        err,
      );
    }
  }
}

// Manejar XP por reacción (para voiceStateUpdate)
export async function handleVoiceXp(
  member: any,
  config: {
    xpVoiceEnabled: boolean;
    ignoredChannels: string[];
    ignoredRoles: string[];
    xpVoiceMinMinutes: number;
    xpPerMinuteVoice: number;
    xpMultiplier: number;
  },
  minutesInVoice: number,
): Promise<void> {
  if (!config.xpVoiceEnabled) return;
  if (config.ignoredChannels.includes(member.channelId)) return;
  if (config.ignoredRoles.some((r: string) => member.roles.cache.has(r)))
    return;

  const minMinutes = config.xpVoiceMinMinutes ?? 1;
  if (minutesInVoice < minMinutes) return;

  const xpGain = config.xpPerMinuteVoice ?? 10;
  const multiplier = config.xpMultiplier ?? 1.0;
  const earned = Math.floor(xpGain * minutesInVoice * multiplier);

  const profile = await LocalLevel.findOne({
    userId: member.id,
    guildId: member.guild.id,
  });

  if (!profile) return;

  const newXp = profile.xp + earned;
  let newLevel = profile.level;

  while (newXp >= totalXpForLevel(newLevel + 1)) {
    newLevel++;
  }

  await LocalLevel.updateOne(
    { userId: member.id, guildId: member.guild.id },
    { $set: { xp: newXp, level: newLevel } },
  );
}
