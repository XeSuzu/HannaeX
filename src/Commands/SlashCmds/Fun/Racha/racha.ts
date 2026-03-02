// src/Commands/SlashCmds/Fun/Racha/racha.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ComponentType,
} from "discord.js";
import { SlashCommand } from "../../../../Interfaces/Command";
import { StreakGroup } from "../../../../Models/StreakGroup";
import { generateStreakCard } from "../../../../Services/CardService";
import { HoshikoClient } from "../../../../index";

// 🛠️ Helper para obtener Nombre y Emoji del Tier desde la DB
function getTierInfo(tier: string): { name: string; emoji: string } {
  const tiers: Record<string, { name: string; emoji: string }> = {
    Mayoi:    { name: "Mayoi", emoji: "🖤" },
    Ketsui:   { name: "Ketsui", emoji: "🔥" },
    Aruki:    { name: "Aruki", emoji: "💜" },
    Negai:    { name: "Negai", emoji: "🌌" },
    Arashi:   { name: "Arashi", emoji: "🌈" },
    Kiseki:   { name: "Kiseki", emoji: "👑" },
    // Legacy
    starter:  { name: "Mayoi", emoji: "🖤" },
    burning:  { name: "Ketsui", emoji: "🔥" },
    star:     { name: "Aruki", emoji: "💜" },
    guardian: { name: "Negai", emoji: "🌌" },
    legend:   { name: "Arashi", emoji: "🌈" },
    immortal: { name: "Kiseki", emoji: "👑" },
  };
  return tiers[tier] || { name: "Desconocido", emoji: "❓" };
}

const helpContent = {
  basico: {
    title: "❓ Conceptos Básicos",
    description: "El sistema de rachas te permite mantener un contador de días seguidos con amigos. ¡La constancia es la clave!",
    fields: [
      { name: "1. Crear una Racha", value: "Usa `/racha-crear` para iniciar una racha. Puedes hacer un 'duo' (2 personas) o un 'grupo' (3-5 personas)." },
      { name: "2. Reclamar Diariamente", value: "Cada día, todos los miembros deben usar `/racha ver` y presionar el botón '✅ Reclamar'. Tienes una ventana de 24 horas desde el primer reclamo." },
      { name: "3. Mantener la Racha", value: "Si todos reclaman, la racha sube. Si alguien falla, la racha podría romperse o congelarse. ¡No dejes a tus compañeros colgados!" },
    ],
    color: 0x5865f2,
  },
  tiers: {
    title: "🏆 Tiers y Recompensas",
    description: "A medida que tu racha crece, desbloqueas nuevos Tiers, que se muestran con un emoji y un fondo de tarjeta especial.",
    fields: [
      { name: "🖤 Mayoi (0+ días)", value: "El comienzo de un nuevo camino." },
      { name: "🔥 Ketsui (7+ días)", value: "La determinación empieza a arder." },
      { name: "💜 Aruki (14+ días)", value: "Ya es un hábito, ¡sigue así!" },
      { name: "🌌 Negai (30+ días)", value: "Tu deseo de continuar es fuerte." },
      { name: "🌈 Arashi (60+ días)", value: "Una tormenta de constancia." },
      { name: "👑 Kiseki (100+ días)", value: "Un milagro. Eres una leyenda." },
    ],
    color: 0xf1c40f,
  },
  mecanicas: {
    title: "⚙️ Mecánicas Avanzadas",
    description: "Hay más que solo reclamar. ¡Usa estas herramientas para sobrevivir!",
    fields: [
      { name: "❄️ Freezes (Congelaciones)", value: "Un comodín que te salva si olvidas reclamar. El sistema lo usa automáticamente si solo una persona falla. También puedes usarlo manualmente desde el panel de gestión (`/racha ver` -> `Mis Rachas`)." },
      { name: "💀 Romper una Racha", value: "Si 2 o más miembros olvidan reclamar, la racha se rompe y vuelve a 0. ¡Auch! Recibirán una notificación por DM." },
      { name: "👑 Hall of Fame", value: "Alcanzar 100 días con una racha perfecta (sin romperse, con alta puntualidad, etc.) la inscribe en el Salón de la Fama para siempre. ¡El máximo honor!" },
    ],
    color: 0xe74c3c,
  },
  comandos: {
    title: "⌨️ Lista de Comandos",
    description: "Estos son los comandos principales para interactuar con el sistema.",
    fields: [
      { name: "`/racha ver`", value: "Tu panel principal. Muestra tu mejor racha y los botones de acción." },
      { name: "`/racha top`", value: "Muestra los rankings globales con pestañas interactivas." },
      { name: "`/racha help`", value: "Muestra esta guía de ayuda." },
      { name: "`/racha-crear`", value: "Inicia el proceso para crear una nueva racha." },
    ],
    color: 0x3498db,
  },
};

const command: SlashCommand = {
  category: "Fun",
  data: new SlashCommandBuilder()
    .setName("racha")
    .setDescription("🔥 Sistema de rachas diarias.")
    .addSubcommand((sub) =>
      sub
        .setName("ver")
        .setDescription("Ver tu panel de rachas.")
        .addBooleanOption(option => 
          option.setName("publico")
          .setDescription("¿Mostrar el panel públicamente? (Por defecto es privado)")
          .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("top").setDescription("Top global de rachas.")
    )
    .addSubcommand((sub) =>
      sub.setName("help").setDescription("Guía completa del sistema.")
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) { // This check happens before any defer.
      await interaction.reply({ content: "❌ Las rachas solo funcionan en servidores.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    // ── VER (CONECTADO A MONGODB) ──────────────────────────────────────────
    if (sub === "ver") {
      const publico = interaction.options.getBoolean("publico") ?? false;
      await interaction.deferReply({ ephemeral: !publico });

      const userId = interaction.user.id;

      // 1. Buscamos la mejor racha activa del usuario en la base de datos
      const bestStreak = await StreakGroup.aggregate([
        { $match: { memberIds: userId, status: "active" } },
        { $addFields: { currentStreakNum: { $toInt: "$currentStreak" } } },
        { $sort: { currentStreakNum: -1 } },
        { $limit: 1 },
      ]);

      const hasActive = bestStreak.length > 0;
      const embed = new EmbedBuilder()
        .setColor(hasActive ? 0xff6b6b : 0x666666)
        .setTitle("🔥 Panel de Rachas")
        .setFooter({
          text: "Reclama diariamente para mantener tu racha 🔥",
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      const files: AttachmentBuilder[] = [];

      if (hasActive) {
        const streakData = bestStreak[0];
        const tierInfo = getTierInfo(streakData.tier);

        embed.setDescription(`**Mejor racha activa:** ${streakData.name} — **${streakData.currentStreak} días** ${tierInfo.emoji}`);

        // 2. Dibujar la tarjeta y adjuntarla
        try {
          const imageBuffer = await generateStreakCard(streakData._id.toString(), interaction.client as HoshikoClient);
          const attachment = new AttachmentBuilder(imageBuffer, { name: "racha-card.png" });
          files.push(attachment);
          
          embed.setImage("attachment://racha-card.png");
        } catch (error) {
          console.error("❌ Error en Canvas:", error);
          embed.addFields({ name: "⚠️ Error", value: "No se pudo generar la tarjeta de tu racha." });
        }
      } else {
        embed.setDescription("No tienes rachas activas en este momento. ¡Crea una con `/racha_crear` o espera a que alguien te invite! 😿");
      }

      // 3. Botones de interacción
      const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("racha_claim_pending").setLabel("✅ Reclamar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("racha_my_streaks").setLabel("🔽 Mis rachas").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("racha_top").setLabel("🏆 Top").setStyle(ButtonStyle.Secondary),
      );

      const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("racha_help").setLabel("❓ Ayuda").setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row1, row2],
        files: files.length > 0 ? files : undefined,
      });
      return;
    }

    // ── TOP (con pestañas) ──────────────────────────────────────────────────
    if (sub === "top") {
      await interaction.deferReply(); // Public by default

      // Helper functions to generate content for each tab
      const getActiveTop = async () => {
        const top = await StreakGroup.find({ status: "active" }).sort({ currentStreak: -1 }).limit(10);
        if (top.length === 0) return "No hay rachas activas todavía. ¡Sé el primero!";
        return top.map((s, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
          return `${medal} **${s.name}** ${getTierInfo(s.tier).emoji} — **${s.currentStreak} días** \`(ID: ${s._id})\``;
        }).join("\n");
      };

      const getHistoricTop = async () => {
        const top = await StreakGroup.find({ bestStreak: { $gt: 0 } }).sort({ bestStreak: -1 }).limit(10);
        if (top.length === 0) return "Aún no hay rachas con un récord histórico.";
        return top.map((s, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
          return `${medal} **${s.name}** ${getTierInfo(s.tier).emoji} — **${s.bestStreak} días** \`(ID: ${s._id})\``;
        }).join("\n");
      };

      const getHofTop = async () => {
        const top = await StreakGroup.find({ "hallOfFame.achieved": true }).sort({ "hallOfFame.entryNumber": 1 }).limit(10);
        if (top.length === 0) return "El Salón de la Fama aún espera a sus primeras leyendas. 👑";
        return top.map((s) => {
          const entry = s.hallOfFame.entryNumber;
          const medal = entry === 1 ? "🥇" : entry === 2 ? "🥈" : entry === 3 ? "🥉" : `**#${entry}**`;
          return `${medal} **${s.name}** 👑 — **${s.bestStreak} días** (Alcanzado <t:${Math.floor(s.hallOfFame.achievedAt!.getTime() / 1000)}:R>) \`(ID: ${s._id})\``;
        }).join("\n");
      };

      // Initial state: Active
      const initialDescription = await getActiveTop();
      const embed = new EmbedBuilder()
        .setTitle("🏆 Top Rachas: Activas")
        .setColor(0xffd700)
        .setDescription(initialDescription)
        .setFooter({ text: "Reclama cada día para mantenerte en el top 🔥" });

      const buildButtons = (activeTab: 'active' | 'historic' | 'hof', disabled = false) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`top_active`).setLabel("Activas").setStyle(activeTab === 'active' ? ButtonStyle.Primary : ButtonStyle.Secondary).setEmoji("🏆").setDisabled(disabled || activeTab === 'active'),
          new ButtonBuilder().setCustomId(`top_historic`).setLabel("Históricas").setStyle(activeTab === 'historic' ? ButtonStyle.Primary : ButtonStyle.Secondary).setEmoji("📜").setDisabled(disabled || activeTab === 'historic'),
          new ButtonBuilder().setCustomId(`top_hof`).setLabel("Hall of Fame").setStyle(activeTab === 'hof' ? ButtonStyle.Primary : ButtonStyle.Secondary).setEmoji("👑").setDisabled(disabled || activeTab === 'hof')
        );

      const reply = await interaction.editReply({ // This will work because of the deferReply above
        embeds: [embed],
        components: [buildButtons('active')],
      });

      const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 5 * 60 * 1000, // 5 minutes
      });

      collector.on("collect", async (i) => {
        await i.deferUpdate();
        let newDescription: string;
        let newTitle: string;
        let activeTab: 'active' | 'historic' | 'hof';

        switch (i.customId) {
          case "top_historic":
            newTitle = "📜 Top Rachas: Históricas";
            newDescription = await getHistoricTop();
            activeTab = 'historic';
            break;
          case "top_hof":
            newTitle = "👑 Top Rachas: Hall of Fame";
            newDescription = await getHofTop();
            activeTab = 'hof';
            break;
          default: // "top_active"
            newTitle = "🏆 Top Rachas: Activas";
            newDescription = await getActiveTop();
            activeTab = 'active';
            break;
        }

        embed.setTitle(newTitle).setDescription(newDescription);
        await interaction.editReply({ embeds: [embed], components: [buildButtons(activeTab)] });
      });

      collector.on("end", () => {
        interaction.editReply({ components: [buildButtons('active', true)] }).catch(() => {});
      });

      return;
    }

    // ── HELP ───────────────────────────────────────────────────────────────
    if (sub === "help") {
      await interaction.deferReply({ ephemeral: true });

      const buildHelpEmbed = (topic: keyof typeof helpContent) => {
        const content = helpContent[topic];
        return new EmbedBuilder()
          .setTitle(content.title)
          .setDescription(content.description)
          .setColor(content.color)
          .addFields(content.fields)
          .setFooter({ text: "Sistema de Rachas de Hoshiko" });
      };

      const buildHelpButtons = (activeTopic: keyof typeof helpContent, disabled = false) => {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          Object.keys(helpContent).map(topic => 
            new ButtonBuilder()
              .setCustomId(`racha_help_${topic}`)
              .setLabel(helpContent[topic as keyof typeof helpContent].title.split(" ")[1])
              .setStyle(activeTopic === topic ? ButtonStyle.Primary : ButtonStyle.Secondary)
              .setEmoji(helpContent[topic as keyof typeof helpContent].title.split(" ")[0])
              .setDisabled(disabled)
          )
        );
      };

      const reply = await interaction.editReply({
        embeds: [buildHelpEmbed('basico')],
        components: [buildHelpButtons('basico')],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id,
        time: 5 * 60 * 1000, // 5 minutes
      });

      collector.on("collect", async i => {
        if (!i.isButton() || !i.customId.startsWith("racha_help_")) return;
        
        const topic = i.customId.replace("racha_help_", "") as keyof typeof helpContent;
        
        await i.update({
          embeds: [buildHelpEmbed(topic)],
          components: [buildHelpButtons(topic)],
        });
      });

      collector.on("end", async () => {
        const finalButtons = buildHelpButtons('basico', true);
        // Set all to secondary style
        finalButtons.components.forEach(c => c.setStyle(ButtonStyle.Secondary));
        await interaction.editReply({ components: [finalButtons] }).catch(() => {});
      });

      return;
    }
  },
};

export default command;