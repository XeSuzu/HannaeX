import { ActivityType, Events } from 'discord.js';
import { HoshikoClient } from '../../index'; 

/**
 * Inicia el rotador de estados dinámicos para Hoshiko 🌸
 */
function startActivityRotator(client: HoshikoClient) {
    const activityGenerators = [
        () => ({ name: `en ${client.guilds.cache.size} servidores 🏠`, type: ActivityType.Watching }),
        () => ({ name: 'mis comandos con / ✨', type: ActivityType.Playing }),
        () => {
            const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            return { name: `a ${totalMembers} personitas 👥`, type: ActivityType.Listening };
        },
        () => ({ name: 'que todo brille 🌟', type: ActivityType.Competing })
    ];
    
    let currentIndex = 0;

    setInterval(() => {
        const generator = activityGenerators[currentIndex];
        const newActivity = generator();

        // Usamos setPresence para que sea más robusto ✨
        client.user?.setPresence({
            activities: [newActivity],
            status: 'online'
        });

        currentIndex = (currentIndex + 1) % activityGenerators.length;
    }, 15000);

    console.log("🌟 ¡Estados dinámicos iniciados con éxito!");
}

// Cambiamos a export default para mayor compatibilidad con tu Handler
export default {
  name: Events.ClientReady,
  once: true,
  execute(client: HoshikoClient) {
    if (!client.user) return;

    console.log('\n═══════════════════════════════════════');
    console.log(`🌸 ✨ ¡Hoshiko ha despertado!`);
    console.log(`💖 Conectada como: ${client.user.tag}`);
    console.log('═══════════════════════════════════════\n');

    startActivityRotator(client);
  }
};