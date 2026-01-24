import { ActivityType, Events } from 'discord.js';
import { HoshikoClient } from '../../index'; 
// 👇 Importamos el Schema para buscar los roles vencidos
import ActiveRole from '../../Database/Schemas/ActiveRole'; 

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

        client.user?.setPresence({
            activities: [newActivity],
            status: 'online'
        });

        currentIndex = (currentIndex + 1) % activityGenerators.length;
    }, 15000);

    console.log("🌟 ¡Estados dinámicos iniciados con éxito!");
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: HoshikoClient) {
    if (!client.user) return;

    console.log('\n═══════════════════════════════════════');
    console.log(`🌸 ✨ ¡Hoshiko ha despertado!`);
    console.log(`💖 Conectada como: ${client.user.tag}`);
    console.log('═══════════════════════════════════════\n');

    // 1. Iniciamos los estados bonitos
    startActivityRotator(client);

    // =========================================================
    // ⏰ PASO 5: SISTEMA DE LIMPIEZA DE ROLES TEMPORALES
    // =========================================================
    console.log("⏰ Iniciando reloj de limpieza de roles...");

    setInterval(async () => {
        try {
            const now = new Date();
            // Buscamos roles cuya fecha de expiración ya pasó (es menor o igual a ahora)
            const expiredRoles = await ActiveRole.find({ expiresAt: { $lte: now } });

            for (const doc of expiredRoles) {
                // Obtenemos el servidor
                const guild = client.guilds.cache.get(doc.guildId);
                
                // Si el bot ya no está en el server, solo borramos el registro de la DB
                if (!guild) {
                    await ActiveRole.deleteOne({ _id: doc._id });
                    continue;
                }

                // Intentamos buscar al usuario
                const member = await guild.members.fetch(doc.userId).catch(() => null);
                
                if (member) {
                    // Quitamos el rol
                    await member.roles.remove(doc.roleId).catch(err => 
                        console.error(`⚠️ No pude quitar el rol a ${member.user.tag}:`, err.message)
                    );
                    console.log(`⏳ Rol temporal retirado a ${member.user.tag} en ${guild.name}`);
                }

                // Borramos el registro de la base de datos para no procesarlo de nuevo
                await ActiveRole.deleteOne({ _id: doc._id });
            }
        } catch (error) {
            console.error('❌ Error en el ciclo de limpieza de roles:', error);
        }
    }, 60 * 1000); // Se ejecuta cada 60 segundos (1 minuto)
  }
};