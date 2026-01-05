import { Events, Message } from 'discord.js';
import { HoshikoClient } from '../../index';
import handleAfk from '../../Features/afkHandler';
import handleMemes from '../../Features/memeHandler';
import handleAi from '../../Features/aiHandler';

// ✨ Importamos los escudos de la Fase 1
import { Blacklist } from '../../Security/Defense/Blacklist';
import { RateLimiter } from '../../Security/Defense/RateLimiter';
import { Sanitizer } from '../../Security/Defense/Sanitizer';

// ⚙️ Importamos el gestor de configuración de la Fase 2 y el motor de la Fase 3
import { SettingsManager } from '../../Database/SettingsManager';
import { InfractionManager } from '../../Features/InfractionManager';

export default {
    name: Events.MessageCreate,
    async execute(message: Message, client: HoshikoClient) {
        // Ignoramos bots y mensajes fuera de servidores 🐾
        if (message.author.bot || !message.guild) return;

        try {
            // 🛡️ SEGURIDAD NIVEL 1: Filtros de Acceso
            if (Blacklist.isBlocked(message.author.id)) return;

            if (RateLimiter.isSpamming(message.author.id)) {
                // 1. Bloqueo en el sistema de archivos local (Blacklist)
                Blacklist.add(message.author.id, "Spam excesivo (RateLimit)", "TEMPORAL", 15);
                
                // 2. ✨ CONEXIÓN FASE 3: Sumamos puntos para activar el Mute automático
                // Le sumamos 50 puntos (o lo necesario según tus autoActions)
                if (message.member) {
                    await InfractionManager.addPoints(
                        message.member, 
                        50, 
                        "Spam excesivo detectado por RateLimiter", 
                        message
                    );
                }

                return message.reply("🌸 ¡Oye! Vas muy rápido. Te he bloqueado temporalmente por 15 minutos para que descanses.");
            }

            // ⚙️ FASE 2: Carga de Configuración Personalizada
            const settings = await SettingsManager.getSettings(message.guild.id);

            // Sanitización básica del contenido
            const cleanContent = Sanitizer.clean(message.content);

            // 📜 Lógica de Comandos de Prefijo
            const prefix = settings.prefix || client.config.prefix;
            
            if (prefix && cleanContent.startsWith(prefix)) {
                const args = cleanContent.slice(prefix.length).trim().split(/ +/g);
                const commandName = args.shift()?.toLowerCase();
                
                if (!commandName) return;

                const command = client.commands.get(commandName);

                if (command) {
                    try {
                        await command.execute(message, args, client);
                    } catch (cmdError) {
                        console.error(`💥 Error en comando ${commandName}:`, cmdError);
                        message.reply("🌸 Nyaa... hubo un problemita al ejecutar ese comando.");
                    }
                    return; 
                }
            }

            // ✨ Cadena de Responsabilidad (Features)
            if (await handleAfk(message)) return;
            if (await handleMemes(message)) return;
            if (await handleAi(message, client)) return;

        } catch (err: any) {
            console.error("💥 Error crítico en messageCreate:", err.message);
        }
    },
};