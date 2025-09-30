const { ActivityType } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    // ===== Mensaje de inicio =====
    console.log(`🌸 Nyaa~ ${client.user.tag} está lista 💖`);

    // ===== Lista de Actividades =====
    const activities = [
      { name: `en ${client.guilds.cache.size} servidores`, type: ActivityType.Watching },
      { name: 'mis comandos con /', type: ActivityType.Playing },
      { name: `a ${client.users.cache.size} usuarios`, type: ActivityType.Listening },
      { name: 'que todo funcione bien', type: ActivityType.Competing }
    ];
    
    let i = 0;

    // Establecer la primera actividad inmediatamente
    client.user.setPresence({
        activities: [{ name: activities[i].name, type: activities[i].type }],
        status: 'online' // Puedes poner 'online', 'idle', 'dnd' (no molestar)
    });

    // Cambiar la actividad cada 15 segundos
    setInterval(() => {
        // Ciclamos al siguiente índice de la lista
        i = (i + 1) % activities.length;

        // Actualizamos la presencia del bot
        client.user.setActivity(activities[i].name, { type: activities[i].type });

    }, 15000); // 15000 milisegundos = 15 segundos
    
    console.log("🌟 ¡Estados dinámicos cargados!");
  },
};