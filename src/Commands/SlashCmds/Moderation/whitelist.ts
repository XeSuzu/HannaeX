import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { SettingsManager } from "../../../Database/SettingsManager";
import { SlashCommand } from "../../../Interfaces/Command";

const command: SlashCommand = {
  category: "Moderation",
  cooldown: 5, // 5 segundos entre cambios de whitelist
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Gestiona los dominios permitidos en el servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Añade un dominio a la lista blanca.")
        .addStringOption((opt) =>
          opt
            .setName("dominio")
            .setDescription("Ej: dropbox.com")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Quita un dominio de la lista blanca.")
        .addStringOption((opt) =>
          opt
            .setName("dominio")
            .setDescription("Dominio a remover")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Muestra los dominios permitidos."),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const subcommand = interaction.options.getSubcommand();
    const domain = interaction.options.getString("dominio")?.toLowerCase();

    // Obtenemos ajustes actuales
    const settings = (await SettingsManager.getSettings(guildId)) || {
      allowedLinks: [],
    };
    let allowedLinks: string[] = settings.allowedLinks || [];

    const embed = new EmbedBuilder().setColor(0xffb6c1).setTimestamp();

    if (subcommand === "add" && domain) {
      if (allowedLinks.includes(domain)) {
        await interaction.reply({
          content: `🌸 El dominio \`${domain}\` ya está en la lista.`,
          ephemeral: true,
        });
        return;
      }
      allowedLinks.push(domain);
      await SettingsManager.updateSettings(guildId, { allowedLinks });
      embed
        .setTitle("✅ Dominio Añadido")
        .setDescription(`Se ha añadido \`${domain}\` a la whitelist.`);
    }

    if (subcommand === "remove" && domain) {
      if (!allowedLinks.includes(domain)) {
        await interaction.reply({
          content: `❌ El dominio \`${domain}\` no está en la lista.`,
          ephemeral: true,
        });
        return;
      }
      allowedLinks = allowedLinks.filter((d) => d !== domain);
      await SettingsManager.updateSettings(guildId, { allowedLinks });
      embed
        .setTitle("🗑️ Dominio Removido")
        .setDescription(`Se ha quitado \`${domain}\` de la whitelist.`);
    }

    if (subcommand === "list") {
      const list =
        allowedLinks.length > 0
          ? allowedLinks.map((d) => `• ${d}`).join("\n")
          : "No hay dominios personalizados.";
      embed
        .setTitle("📜 Whitelist de Enlaces")
        .setDescription(
          `**Dominios permitidos en este servidor:**\n\n${list}\n\n*Nota: YouTube, Spotify y Tenor son permitidos por defecto.*`,
        );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
export default command;