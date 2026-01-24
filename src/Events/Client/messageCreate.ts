import { Events, Message, Collection } from 'discord.js';
import { HoshikoClient } from '../../index';
import handleAfk from '../../Features/afkHandler';
import handleMemes from '../../Features/memeHandler';
import handleAi from '../../Features/aiHandler';
import { handleCulture } from '../../Features/cultureHandler';
import { Blacklist } from '../../Security/Defense/Blacklist';
import { RateLimiter } from '../../Security/Defense/RateLimiter';
import { Sanitizer } from '../../Security/Defense/Sanitizer';
import { handleLinkProtection } from '../../Features/linkProtector';
import { SettingsManager } from '../../Database/SettingsManager';
import { InfractionManager } from '../../Features/InfractionManager';

export default {
    name: Events.MessageCreate,
    async execute(message: Message, client: HoshikoClient) {
        // 0. Ignoramos bots y mensajes fuera de servidores
        if (message.author.bot || !message.guild) return;

        try {
            // =========================================================
            // 🛡️ FASE 1: SEGURIDAD Y FILTROS
            // =========================================================
            if (Blacklist.isBlocked(message.author.id)) return;

            if (RateLimiter.isSpamming(message.author.id)) {
                console.log(`⚠️ [RateLimit] Spam detectado de: ${message.author.tag}`);
                Blacklist.add(message.author.id, "Spam excesivo", "TEMPORAL", 15);
                
                if (message.member) {
                    try {
                        await InfractionManager.addPoints(message.member, "Spam excesivo", message);
                    } catch (e) { console.error(e); }
                }
                return message.reply("🌸 ¡Oye! Vas muy rápido. Descansa 15 minutos.");
            }

            if (await handleLinkProtection(message)) return;

            // =========================================================
            // ⚙️ FASE 2: PREPARACIÓN
            // =========================================================
            const settings = await SettingsManager.getSettings(message.guild.id);
            const dbPrefix = settings?.prefix || client.config.prefix;
            
            await handleCulture(message);

            // =========================================================
            // 📜 FASE 3: LÓGICA DE COMANDOS (BÚSQUEDA UNIVERSAL)
            // =========================================================
            
            // 1. Detectar Prefijo
            const rawPrefixes = [dbPrefix, 'hoshi ', 'Hoshi ', 'h! '];
            const possiblePrefixes = rawPrefixes.filter((p): p is string => !!p);
            const content = message.content;
            const prefix = possiblePrefixes.find(p => content.startsWith(p));
            
            if (prefix) {
                console.log(`[DEBUG] ✅ Prefijo detectado: "${prefix}"`);

                const args = content.slice(prefix.length).trim().split(/ +/g);
                const commandName = args.shift()?.toLowerCase();
                
                if (commandName) {
                    // 2. BUSCAR EL COMANDO (Aquí está la magia ✨)
                    // Intentamos encontrar el comando en TODAS las colecciones posibles
                    
                    // A. Buscamos en Legacy (PrefixCmds)
                    let command: any = client.commands.get(commandName) || 
                                       client.commands.find((cmd: any) => cmd.aliases && cmd.aliases.includes(commandName));

                    // B. Si no está, buscamos en Slash (SlashCmds / SubCommands)
                    if (!command) {
                        // Accedemos a propiedades dinámicas porque no sabemos cómo llamó tu handler a la colección
                        const c = client as any;
                        const slashCollection = c.slashCommands || c.subCommands || c.slash || c.commands;

                        if (slashCollection && slashCollection instanceof Collection) {
                            command = slashCollection.get(commandName) || 
                                      slashCollection.find((cmd: any) => cmd.data && cmd.data.name === commandName);
                        }
                    }

                    // 3. EJECUTAR EL COMANDO
                    if (command) {
                        console.log(`[DEBUG] 🚀 Ejecutando comando: ${command.name || command.data?.name}`);

                        try {
                            // Si el comando tiene soporte para texto (lo que agregamos en hug.ts)
                            if (command.prefixRun) {
                                await command.prefixRun(client, message, args);
                            } 
                            // Si es un comando viejo (Legacy)
                            else if (command.execute && !command.data) {
                                await command.execute(message, args, client);
                            } 
                            // Si es solo Slash y no tiene soporte de texto
                            else {
                                message.reply(`🌸 Este comando solo funciona escribiendo **/${commandName}**`);
                            }
                        } catch (error) {
                            console.error(`💥 Error ejecutando ${commandName}:`, error);
                            message.reply("🌸 Hubo un error interno.");
                        }
                        return; // Detenemos aquí (no pasa a la IA)
                    } else {
                        // LOG DIAGNÓSTICO (Solo saldrá si falla)
                        console.log(`[DEBUG] ❌ Comando "${commandName}" NO encontrado.`);
                        console.log(`[DEBUG] 🗝️ Claves disponibles en Client:`, Object.keys(client));
                    }
                }
            }

            // =========================================================
            // ✨ FASE 4: FEATURES SECUNDARIAS & IA
            // =========================================================
            
            Sanitizer.clean(message.content);

            if (await handleAfk(message)) return;
            if (await handleMemes(message)) return;
            
            // Solo si no fue un comando, responde la IA
            if (await handleAi(message, client)) return;

        } catch (err: any) {
            console.error("💥 Error crítico en messageCreate:", err.message);
        }
    },
};