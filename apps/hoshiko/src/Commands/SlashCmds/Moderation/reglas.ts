import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { SettingsManager } from "../../../Database/guild/SettingsManager";
import type { IServerRule } from "../../../Database/guild/serverConfig.model";
import { SlashCommand } from "../../../Interfaces/Command";

const MAX_RULES = 10;
const MAX_RULE_LENGTH = 200;

const command: SlashCommand = {
  category: "Moderation",
  defer: false,
  data: new SlashCommandBuilder()
    .setName("reglas")
    .setDescription("📜 Consulta y administra las reglas oficiales de este servidor.")
    .addSubcommand((sub) =>
      sub.setName("ver").setDescription("Muestra las reglas vigentes del servidor.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("agregar")
        .setDescription("Añade una nueva regla al servidor (Staff).")
        .addStringOption((opt) =>
          opt
            .setName("texto")
            .setDescription(`Descripción de la regla (máx. ${MAX_RULE_LENGTH} caracteres).`)
            .setRequired(true)
            .setMaxLength(MAX_RULE_LENGTH)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("editar")
        .setDescription("Modifica una regla existente por su número (Staff).")
        .addIntegerOption((opt) =>
          opt.setName("numero").setDescription("Número ID de la regla a editar.").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("texto")
            .setDescription(`Nuevo texto de la regla (máx. ${MAX_RULE_LENGTH} caracteres).`)
            .setRequired(true)
            .setMaxLength(MAX_RULE_LENGTH)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("eliminar")
        .setDescription("Elimina una regla por su número (Staff).")
        .addIntegerOption((opt) =>
          opt.setName("numero").setDescription("Número ID de la regla a eliminar.").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("publicar")
        .setDescription("Publica el panel oficial de reglas en un canal de texto (Staff).")
        .addChannelOption((opt) =>
          opt
            .setName("canal")
            .setDescription("Canal donde publicar las reglas.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const settings = await SettingsManager.getSettings(guildId);
    const rules: IServerRule[] = settings.rules || [];

    // ─── 1. VER REGLAS (Público) ─────────────────────────────────────────────
    if (sub === "ver") {
      if (rules.length === 0) {
        await interaction.reply({
          content: "📜 Este servidor no tiene reglas configuradas todavía.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📜 Reglas Oficiales de ${interaction.guild.name}`)
        .setDescription(
          rules.map((r) => `**${r.id}.** ${r.text}`).join("\n\n"),
        )
        .setColor(0xeba6d1)
        .setThumbnail(interaction.guild.iconURL() || null)
        .setFooter({ text: "Hoshiko Sentinel • Cumplimiento Obligatorio" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Comprobar permisos de moderación para editar/añadir/eliminar/publicar
    const member = interaction.member;
    const isStaff =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      await interaction.reply({
        content: "⛔ Solo miembros con permiso de **Gestionar Servidor** pueden modificar las reglas.",
        ephemeral: true,
      });
      return;
    }

    // ─── 2. AGREGAR REGLA ────────────────────────────────────────────────────
    if (sub === "agregar") {
      if (rules.length >= MAX_RULES) {
        await interaction.reply({
          content: `⚠️ Se ha alcanzado el límite máximo de **${MAX_RULES} reglas** por servidor.`,
          ephemeral: true,
        });
        return;
      }

      const texto = interaction.options.getString("texto", true).trim();
      const nextId = rules.length > 0 ? Math.max(...rules.map((r) => r.id)) + 1 : 1;
      const updatedRules = [...rules, { id: nextId, text: texto }];

      await SettingsManager.updateSettings(guildId, { rules: updatedRules });

      await interaction.reply({
        content: `✅ Regla **#${nextId}** agregada con éxito:\n> ${texto}`,
        ephemeral: true,
      });
      return;
    }

    // ─── 3. EDITAR REGLA ─────────────────────────────────────────────────────
    if (sub === "editar") {
      const numero = interaction.options.getInteger("numero", true);
      const texto = interaction.options.getString("texto", true).trim();

      const index = rules.findIndex((r) => r.id === numero);
      if (index === -1) {
        await interaction.reply({
          content: `❌ No se encontró ninguna regla con el número **#${numero}**.`,
          ephemeral: true,
        });
        return;
      }

      rules[index].text = texto;
      await SettingsManager.updateSettings(guildId, { rules });

      await interaction.reply({
        content: `✅ Regla **#${numero}** actualizada:\n> ${texto}`,
        ephemeral: true,
      });
      return;
    }

    // ─── 4. ELIMINAR REGLA ───────────────────────────────────────────────────
    if (sub === "eliminar") {
      const numero = interaction.options.getInteger("numero", true);
      const filtered = rules.filter((r) => r.id !== numero);

      if (filtered.length === rules.length) {
        await interaction.reply({
          content: `❌ No se encontró ninguna regla con el número **#${numero}**.`,
          ephemeral: true,
        });
        return;
      }

      // Reindexar IDs secuencialmente
      const reindexed = filtered.map((r, idx) => ({ id: idx + 1, text: r.text }));
      await SettingsManager.updateSettings(guildId, { rules: reindexed });

      await interaction.reply({
        content: `🗑️ Regla **#${numero}** eliminada. Las reglas restantes han sido reindexadas.`,
        ephemeral: true,
      });
      return;
    }

    // ─── 5. PUBLICAR REGLAS EN CANAL ─────────────────────────────────────────
    if (sub === "publicar") {
      const canal = interaction.options.getChannel("canal", true);
      if (!("send" in canal) || typeof (canal as any).send !== "function") {
        await interaction.reply({
          content: "❌ El canal seleccionado debe ser un canal de texto.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📜 Normas de Convivencia • ${interaction.guild.name}`)
        .setDescription(
          rules.map((r) => `**${r.id}.** ${r.text}`).join("\n\n"),
        )
        .setColor(0xeba6d1)
        .setThumbnail(interaction.guild.iconURL() || null)
        .setFooter({ text: "Hoshiko Sentinel • Cumplimiento Obligatorio" })
        .setTimestamp();

      await (canal as TextChannel).send({ embeds: [embed] }).catch(() => null);

      await interaction.reply({
        content: `📢 Panel de reglas publicado correctamente en <#${canal.id}>.`,
        ephemeral: true,
      });
    }
  },
};

export default command;
