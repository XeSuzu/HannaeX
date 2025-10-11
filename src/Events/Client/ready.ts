import { ActivityType, Events } from 'discord.js';
import { HoshikoClient } from '../../index'; // Importamos nuestra interfaz de cliente personalizada

/**
 * Esta función inicia el rotador de estados dinámicos para el bot.
 * @param client El cliente de Hoshiko.
 */
function startActivityRotator(client: HoshikoClient) {
    // ✨ MEJORA: En lugar de un array de objetos, creamos un array de FUNCIONES.
    // Cada función generará el estado con datos actualizados al momento de ser llamada.
    const activityGenerators = [
        () => ({ name: `en ${client.guilds.cache.size} servidores`, type: ActivityType.Watching }),
        () => ({ name: 'mis comandos con /', type: ActivityType.Playing }),
        () => {
            // Calculamos el total de miembros reales en lugar de los usuarios en caché.
            const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            return { name: `a ${totalMembers} usuarios`, type: ActivityType.Listening };
        },
        () => ({ name: 'que todo funcione bien', type: ActivityType.Competing })
    ];
    
    let currentIndex = 0;

    // Cambiar la actividad cada 15 segundos
    setInterval(() => {
        // Obtenemos la siguiente función generadora
        const generator = activityGenerators[currentIndex];
        // Ejecutamos la función para obtener el estado CON DATOS FRESCOS
        const newActivity = generator();

        // Actualizamos la presencia del bot
        client.user?.setActivity(newActivity.name, { type: newActivity.type });

        // Pasamos al siguiente índice
        currentIndex = (currentIndex + 1) % activityGenerators.length;
    }, 15000); // 15 segundos

    console.log("🌟 ¡Estados dinámicos cargados!");
}


export = {
    // Usamos el enum 'Events' de discord.js para evitar errores de tipeo.
    name: Events.ClientReady,
    once: true,
    execute(client: HoshikoClient) {
        // Verificamos que client.user no sea nulo antes de usarlo.
        if (!client.user) return;

        console.log(`🌸 Nyaa~ ${client.user.tag} está lista 💖`);

        // Inicia el rotador de estados dinámicos
        startActivityRotator(client);
    }
};