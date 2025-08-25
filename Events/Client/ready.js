const { ActivityType } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    // ===== Mensaje de inicio =====
    console.log(`🌸 Nyaa~ ${client.user.tag} está lista para ronronear 💖`);

    // ===== Actividades dinámicas =====
    const activities = [
      { name: "jugando contigo >w<", type: ActivityType.Playing },
      { name: "tus historias kawaii 😽", type: ActivityType.Listening },
      { name: "cómo crece tu servidor 🐾", type: ActivityType.Watching },
      { name: "trayendo diversión y mimos 💖", type: ActivityType.Playing }
    ];
    let i = 0;
    client.user.setPresence({
      activities: [{ name: activities[i].name, type: activities[i].type }],
      status: "online"
    });
    setInterval(() => {
      i = (i + 1) % activities.length;
      client.user.setPresence({
        activities: [{ name: activities[i].name, type: activities[i].type }],
        status: "online"
      });
    }, 15000);
    
    console.log("🌟 ¡Todo listo para ronronear! >w<");
  },
};