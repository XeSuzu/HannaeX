import { 
    Events, 
    GuildMember, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { SettingsManager } from '../../../Database/SettingsManager';
import { HoshikoLogger, LogLevel } from '../../../Security/Logger/HoshikoLogger';

export default {
    name: Events.GuildMemberAdd,
    async execute(member: GuildMember): Promise<void> {
        const settings = await SettingsManager.getSettings(member.guild.id);
        if (!settings?.securityModules?.antiAlt) return;

        // ⏱️ Edad mínima: 2 días
        const MIN_AGE = 1000 * 60 * 60 * 24 * 2;
        const accountAge = Date.now() - member.user.createdTimestamp;

        if (accountAge < MIN_AGE) {
            // 🛡️ Si es muy nueva, la marcamos
            try {
                const ageInHours = (accountAge / (1000 * 60 * 60)).toFixed(1);
                
                const embed = new EmbedBuilder()
                    .setTitle('🌸 Verificación de Seguridad')
                    .setDescription(`¡Hola! Tu cuenta es muy reciente (${ageInHours}h). Para evitar ataques, necesitamos que confirmes que eres un humano real haciendo clic abajo.`)
                    .setColor(0xFFA500)
                    .setFooter({ text: 'Hoshiko Sentinel • Seguridad Activa' });

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_alt_${member.id}`)
                        .setLabel('¡Soy Humano! ✨')
                        .setStyle(ButtonStyle.Success)
                );

                // Intentamos enviárselo al privado
                const dm = await member.send({ embeds: [embed], components: [row] }).catch(() => null);

                if (!dm) {
                    // Si tiene el DM cerrado, lo ideal sería tener un canal de #verificación
                    HoshikoLogger.log({
                        level: LogLevel.WARN,
                        context: 'Security/AntiAlt',
                        message: `No pude enviar mensaje de verificación a ${member.user.tag} (DM cerrado).`,
                        guildId: member.guild.id
                    });
                }

                // Log para el Staff
                await HoshikoLogger.sendLog(
                    member.guild,
                    "⚠️ Cuenta Joven Detectada",
                    `El usuario **${member.user.tag}** tiene una cuenta de solo ${ageInHours} horas. Se le ha pedido verificación por botón.`,
                    0xffff00,
                    member.user
                );

            } catch (err) {
                console.error("❌ Error en Anti-Alt Interact:", err);
            }
        }
    }
};