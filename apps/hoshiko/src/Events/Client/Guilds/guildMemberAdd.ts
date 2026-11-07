import {
  EmbedBuilder,
  Events,
  GuildMember,
} from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import { UserHistoryManager } from "../../../Database/tracking/UserHistoryManager";
import { HoshikoLogger } from "../../../Security/Logger/HoshikoLogger";

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember, client: any): Promise<void> {
    if (member.user.bot) return;

    try {
      await UserHistoryManager.addUser(member.id, {
        username: member.user.username,
        discriminator: member.user.discriminator,
        tag: member.user.tag,
        displayName: member.displayName,
        avatarUrl: member.user.displayAvatarURL({
          size: 1024,
          extension: member.user.avatar?.startsWith("a_") ? "gif" : "png",
        }),
        bannerUrl: member.user.bannerURL({ size: 1024 }),
        guildId: member.guild.id,
        guildName: member.guild.name,
        source: "member",
      });
    } catch (error) {
      console.error(
        "Error guardando historial de usuario en guildMemberAdd:",
        error,
      );
    }

    // [SEPARACIÓN ARQUITECTÓNICA]: Funcionalidades de Sentinel, Anti-Raid, Lockdown y Anti-Alt
    // desactivadas explícitamente en Hoshiko; delegadas a apps/hoshiko-security.

    const settings = await SettingsManager.getSettings(member.guild.id);
    if (!settings) return;

    // ─── 1. AUTO-JOIN ────────────────────────────────────────────────────────
    const rolesToGive: string[] = [];
    const rolesGivenNames: string[] = [];
    let errorOccurred: string | null = null;

    if (settings.autoJoin?.enabled && settings.autoJoin.roles.length > 0) {
      try {
        const botMember = member.guild.members.me;
        if (!botMember) throw new Error("No puedo encontrarme en el servidor.");

        const botHighestRole = botMember.roles.highest.position;

        for (const roleId of settings.autoJoin.roles) {
          const role = member.guild.roles.cache.get(roleId);
          if (role && role.position < botHighestRole) {
            rolesToGive.push(roleId);
            rolesGivenNames.push(role.name);
          } else if (role) {
            console.warn(`[AutoJoin] Rol "${role.name}" omitido por jerarquía.`);
          }
        }

        if (rolesToGive.length > 0) {
          await member.roles.add(rolesToGive, "🤖 Hoshiko Auto-Join");
        } else {
          errorOccurred =
            "No pude dar ningún rol. Verifica que mi rol esté por encima de los roles a asignar.";
        }
      } catch (error: any) {
        console.error(`❌ Error en Auto-Join (${member.guild.name}):`, error);
        errorOccurred = error.message || "Error desconocido.";
      }
    }

    // ─── 3. LOG DE ENTRADA EN JOINLOG ────────────────────────────────────────
    const createdTimestampSec = Math.floor(
      member.user.createdTimestamp / 1000,
    );
    const joinEmbed = new EmbedBuilder()
      .setTitle("🚪 Nuevo Miembro")
      .setColor(errorOccurred ? 0xed4245 : 0x57f287)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "Usuario",
          value: `${member.user.tag} \`(${member.user.id})\``,
          inline: true,
        },
        {
          name: "Cuenta creada",
          value: `<t:${createdTimestampSec}:R>`,
          inline: true,
        },
        {
          name: "Miembro #",
          value: `\`${member.guild.memberCount}\``,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Hoshiko • Join Log" });

    if (rolesGivenNames.length > 0) {
      joinEmbed.addFields({
        name: "Roles Auto-Join",
        value: rolesGivenNames.map((r) => `\`@${r}\``).join(", "),
      });
    } else if (errorOccurred) {
      joinEmbed.addFields({
        name: "⚠️ Error Auto-Join",
        value: `\`${errorOccurred}\``,
      });
    }

    await HoshikoLogger.sendToChannel(member.guild, "joinlog", joinEmbed);
  },
};
