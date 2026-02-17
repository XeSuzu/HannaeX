import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  ActivityType,
  Message,
  InteractionResponse,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { HoshikoClient } from "../../../index";

interface SlashCommand {
  data: SlashCommandBuilder | any;
  category: string;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: HoshikoClient,
  ) => Promise<void | Message | InteractionResponse>;
}

// Configuración de estados
const STATUS_CONFIG = {
  online: { color: 0x43b581, emoji: "🟢", name: "En línea", gradient: "💚" },
  idle: { color: 0xfaa61a, emoji: "🟡", name: "Ausente", gradient: "💛" },
  dnd: { color: 0xf04747, emoji: "🔴", name: "No molestar", gradient: "❤️" },
  offline: {
    color: 0x747f8d,
    emoji: "⚫",
    name: "Desconectado",
    gradient: "🖤",
  },
  streaming: {
    color: 0x593695,
    emoji: "🟣",
    name: "En directo",
    gradient: "💜",
  },
} as const;

const ACTIVITY_ICONS = {
  [ActivityType.Playing]: "🎮",
  [ActivityType.Streaming]: "📡",
  [ActivityType.Listening]: "🎵",
  [ActivityType.Watching]: "📺",
  [ActivityType.Competing]: "🏆",
  [ActivityType.Custom]: "✨",
} as const;

// Función para obtener badges
function getUserBadges(member: GuildMember | null): string[] {
  const badges: string[] = [];
  if (!member) return badges;

  if (member.permissions.has("Administrator"))
    badges.push("👑 **Administrador**");
  if (member.permissions.has("ManageGuild"))
    badges.push("⚙️ **Gestor del Servidor**");
  if (member.permissions.has("ModerateMembers"))
    badges.push("🛡️ **Moderador**");
  if (member.permissions.has("ManageChannels"))
    badges.push("📝 **Gestor de Canales**");
  if (member.premiumSince) badges.push(`💎 **Server Booster**`);
  if (member.user.bot) badges.push("🤖 **Bot Verificado**");

  return badges;
}

// Función para obtener actividades
function getActivities(member: GuildMember | null): string | null {
  if (!member?.presence?.activities.length) return null;

  const activities = member.presence.activities
    .filter((activity) => activity.type !== ActivityType.Custom)
    .map((activity) => {
      const icon = ACTIVITY_ICONS[activity.type] || "📌";
      const name = `**${activity.name}**`;
      const details = activity.details ? `\n   ├─ ${activity.details}` : "";
      const state = activity.state ? `\n   └─ ${activity.state}` : "";
      return `${icon} ${name}${details}${state}`;
    });

  return activities.length > 0 ? activities.join("\n\n") : null;
}

// Función para obtener estado personalizado
function getCustomStatus(member: GuildMember | null): string | null {
  if (!member?.presence?.activities) return null;

  const custom = member.presence.activities.find(
    (a) => a.type === ActivityType.Custom,
  );
  if (!custom) return null;

  const emoji = custom.emoji ? `${custom.emoji} ` : "";
  const state = custom.state || "";

  return emoji || state ? `${emoji}${state}` : null;
}

// Función para calcular antigüedad
function getMembershipInfo(member: GuildMember | null): string {
  if (!member?.joinedTimestamp) return "Desconocido";

  const days = Math.floor(
    (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24),
  );

  if (days < 1) return "Hoy";
  if (days === 1) return "1 día";
  if (days < 7) return `${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} semana${weeks !== 1 ? "s" : ""}`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} mes${months !== 1 ? "es" : ""}`;
  }

  const years = Math.floor(days / 365);
  return `${years} año${years !== 1 ? "s" : ""}`;
}

// Función para crear embed de permisos
function createPermissionsEmbed(
  member: GuildMember,
  targetUser: any,
): EmbedBuilder {
  const perms = member.permissions;

  const adminPerms: string[] = [];
  const modPerms: string[] = [];
  const generalPerms: string[] = [];

  // Permisos administrativos
  if (perms.has("Administrator")) adminPerms.push("👑 Administrador");
  if (perms.has("ManageGuild")) adminPerms.push("⚙️ Gestionar servidor");
  if (perms.has("ManageRoles")) adminPerms.push("🎭 Gestionar roles");
  if (perms.has("ManageChannels")) adminPerms.push("📝 Gestionar canales");
  if (perms.has("ManageWebhooks")) adminPerms.push("🔗 Gestionar webhooks");

  // Permisos de moderación
  if (perms.has("KickMembers")) modPerms.push("👢 Expulsar miembros");
  if (perms.has("BanMembers")) modPerms.push("🔨 Banear miembros");
  if (perms.has("ModerateMembers")) modPerms.push("⏱️ Aislar miembros");
  if (perms.has("ManageMessages")) modPerms.push("🗑️ Gestionar mensajes");
  if (perms.has("ManageNicknames")) modPerms.push("✏️ Gestionar apodos");
  if (perms.has("ViewAuditLog")) modPerms.push("📋 Ver registro de auditoría");

  // Permisos generales
  if (perms.has("MentionEveryone")) generalPerms.push("📢 Mencionar @everyone");
  if (perms.has("ManageEmojisAndStickers"))
    generalPerms.push("😀 Gestionar emojis");
  if (perms.has("ManageEvents")) generalPerms.push("📅 Gestionar eventos");
  if (perms.has("CreateInstantInvite"))
    generalPerms.push("📨 Crear invitaciones");
  if (perms.has("AttachFiles")) generalPerms.push("📎 Adjuntar archivos");
  if (perms.has("EmbedLinks")) generalPerms.push("🔗 Insertar enlaces");

  const embed = new EmbedBuilder()
    .setColor(member.displayHexColor || 0x5865f2)
    .setAuthor({
      name: `Permisos de ${targetUser.username}`,
      iconURL: targetUser.displayAvatarURL(),
    })
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  if (adminPerms.length > 0) {
    embed.addFields({
      name: "🔐 Permisos Administrativos",
      value: adminPerms.join("\n"),
      inline: false,
    });
  }

  if (modPerms.length > 0) {
    embed.addFields({
      name: "🛡️ Permisos de Moderación",
      value: modPerms.join("\n"),
      inline: false,
    });
  }

  if (generalPerms.length > 0) {
    embed.addFields({
      name: "⚡ Permisos Generales",
      value: generalPerms.join("\n"),
      inline: false,
    });
  }

  if (
    adminPerms.length === 0 &&
    modPerms.length === 0 &&
    generalPerms.length === 0
  ) {
    embed.setDescription("Este usuario tiene los permisos básicos de miembro.");
  }

  const totalPerms = Array.from(perms).length;
  embed.setFooter({ text: `Total de permisos: ${totalPerms}` });

  return embed;
}

const command: SlashCommand = {
  category: "Profiles",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Revela un perfil detallado de un usuario, nyaa~!")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario del que deseas ver la información")
        .setRequired(false),
    ),

  async execute(interaction, client) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ Este comando solo puede usarse en un servidor.",
      });
      return;
    }

    try {
      await interaction.deferReply(); // Público

      const targetUser =
        interaction.options.getUser("usuario") ?? interaction.user;
      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      const fetchedUser = await targetUser.fetch();

      // Determinar estado
      const status = member?.presence?.status ?? "offline";
      const statusInfo =
        STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
        STATUS_CONFIG.offline;

      // Crear embed principal
      const embed = new EmbedBuilder()
        .setColor(member?.displayHexColor || statusInfo.color)
        .setAuthor({
          name: `${statusInfo.gradient} ${statusInfo.name.toUpperCase()}`,
          iconURL: targetUser.displayAvatarURL(),
        })
        .setTitle(`━━━━━━ ✦ ${targetUser.username} ✦ ━━━━━━`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
        .setTimestamp()
        .setFooter({
          text: `Consultado por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      // Estado personalizado
      const customStatus = getCustomStatus(member);
      if (customStatus) {
        embed.setDescription(`\`\`\`fix\n${customStatus}\n\`\`\``);
      }

      // Banner
      if (fetchedUser.banner) {
        const bannerURL = fetchedUser.bannerURL({ size: 1024 });
        if (bannerURL) {
          embed.setImage(bannerURL);
        }
      }

      // Info general
      const userType = targetUser.bot ? "🤖 Bot" : "👤 Usuario";
      const accountAge = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D>`;
      embed.addFields({
        name: "┌─ 📋 INFORMACIÓN GENERAL",
        value: [
          `│ **Nombre:** ${targetUser.username}`,
          `│ **Tag:** ${targetUser.tag}`,
          `│ **ID:** \`${targetUser.id}\``,
          `│ **Tipo:** ${userType}`,
          `└─ **Creado:** ${accountAge} (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`,
        ].join("\n"),
        inline: false,
      });

      // Actividad
      const activities = getActivities(member);
      if (activities) {
        embed.addFields({
          name: "┌─ 🎯 ACTIVIDAD ACTUAL",
          value: `│\n${activities}\n└─`,
          inline: false,
        });
      }

      // Info servidor
      if (member) {
        const membershipDuration = getMembershipInfo(member);
        const joinedDate = member.joinedTimestamp
          ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`
          : "Desconocido";
        const boostInfo = member.premiumSince
          ? `\n│ **Boosting:** Desde <t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:R>`
          : "";

        embed.addFields({
          name: "┌─ 🏰 INFORMACIÓN DEL SERVIDOR",
          value: [
            `│ **Apodo:** ${member.nickname || "*Sin apodo*"}`,
            `│ **Unido:** ${joinedDate} (Hace ${membershipDuration})`,
            `│ **Rol más alto:** ${member.roles.highest}${boostInfo}`,
            `└─`,
          ].join("\n"),
          inline: false,
        });

        // Badges
        const badges = getUserBadges(member);
        if (badges.length > 0) {
          embed.addFields({
            name: "┌─ 🏅 INSIGNIAS Y RECONOCIMIENTOS",
            value: `│ ${badges.join("\n│ ")}\n└─`,
            inline: false,
          });
        }

        // Roles
        const roles = member.roles.cache
          .filter((role) => role.id !== interaction.guild!.id)
          .sort((a, b) => b.position - a.position)
          .map((role) => role.toString());
        if (roles.length > 0) {
          const displayRoles = roles.slice(0, 20);
          const remaining = roles.length - displayRoles.length;
          const roleText = displayRoles.join(" ");
          embed.addFields({
            name: `┌─ 🎨 ROLES DEL SERVIDOR [${roles.length}]`,
            value: `│ ${roleText}${remaining > 0 ? ` **+${remaining} más**` : ""}\n└─`,
            inline: false,
          });
        }
      } else {
        embed.addFields({
          name: "⚠️ ESTADO DEL MIEMBRO",
          value: "``````",
          inline: false,
        });
      }

      // Botones
      const buttons = new ActionRowBuilder<ButtonBuilder>();
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`avatar_${targetUser.id}`)
          .setLabel("Ver Avatar")
          .setEmoji("🖼️")
          .setStyle(ButtonStyle.Primary),
      );
      if (fetchedUser.banner) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`banner_${targetUser.id}`)
            .setLabel("Ver Banner")
            .setEmoji("🎨")
            .setStyle(ButtonStyle.Primary),
        );
      }
      if (member) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`perms_${targetUser.id}`)
            .setLabel("Ver Permisos")
            .setEmoji("🔐")
            .setStyle(ButtonStyle.Success),
        );
      }
      buttons.addComponents(
        new ButtonBuilder()
          .setURL(`discord://-/users/${targetUser.id}`)
          .setLabel("Abrir Perfil")
          .setEmoji("👤")
          .setStyle(ButtonStyle.Link),
      );

      const response = await interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });

      // Collector
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutos
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          return buttonInteraction.reply({
            content:
              "❌ Solo quien ejecutó el comando puede usar estos botones.",
            ephemeral: true,
          });
        }
        const [action, userId] = buttonInteraction.customId.split("_");

        if (action === "avatar") {
          const avatarEmbed = new EmbedBuilder()
            .setColor(member?.displayHexColor || statusInfo.color)
            .setAuthor({
              name: `Avatar de ${targetUser.username}`,
              iconURL: targetUser.displayAvatarURL(),
            })
            .setImage(targetUser.displayAvatarURL({ size: 4096 }))
            .setDescription(
              `[Descargar Avatar](${targetUser.displayAvatarURL({ size: 4096 })})`,
            )
            .setFooter({ text: 'Presiona el botón "Volver" para regresar' });
          const backButton =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("back")
                .setLabel("← Volver")
                .setStyle(ButtonStyle.Secondary),
            );
          await buttonInteraction.update({
            embeds: [avatarEmbed],
            components: [backButton],
          });
        } else if (action === "banner") {
          const bannerURL = fetchedUser.bannerURL({ size: 4096 });
          if (!bannerURL) {
            return buttonInteraction.reply({
              content: "❌ Este usuario no tiene un banner configurado.",
              ephemeral: true,
            });
          }
          const bannerEmbed = new EmbedBuilder()
            .setColor(member?.displayHexColor || statusInfo.color)
            .setAuthor({
              name: `Banner de ${targetUser.username}`,
              iconURL: targetUser.displayAvatarURL(),
            })
            .setImage(bannerURL)
            .setDescription(`[Descargar Banner](${bannerURL})`)
            .setFooter({ text: 'Presiona el botón "Volver" para regresar' });
          const backButton =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("back")
                .setLabel("← Volver")
                .setStyle(ButtonStyle.Secondary),
            );
          await buttonInteraction.update({
            embeds: [bannerEmbed],
            components: [backButton],
          });
        } else if (action === "perms" && member) {
          const permsEmbed = createPermissionsEmbed(member, targetUser);
          const backButton =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("back")
                .setLabel("← Volver")
                .setStyle(ButtonStyle.Secondary),
            );
          await buttonInteraction.update({
            embeds: [permsEmbed],
            components: [backButton],
          });
        } else if (action === "back") {
          await buttonInteraction.update({
            embeds: [embed],
            components: [buttons],
          });
        }
      });

      collector.on("end", () => {
        const disabledButtons = new ActionRowBuilder<ButtonBuilder>();
        buttons.components.forEach((button) => {
          if (button.data.style !== ButtonStyle.Link) {
            disabledButtons.addComponents(
              ButtonBuilder.from(button).setDisabled(true),
            );
          } else {
            disabledButtons.addComponents(button);
          }
        });
        interaction
          .editReply({ components: [disabledButtons] })
          .catch(() => {});
      });
    } catch (error: any) {
      console.error("❌ Error en /userinfo:", error);
      const errorMessage = {
        content: "❌ Ocurrió un error al obtener la información del usuario.",
        embeds: [],
        components: [],
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage).catch(console.error);
      } else {
        await interaction.reply(errorMessage).catch(console.error);
      }
    }
  },
};

export = command;
