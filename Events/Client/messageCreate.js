const { EmbedBuilder } = require("discord.js");
const AFK = require("../../Models/afk.js"); 
const { getHistory, addToHistory } = require("../../Database/conversation.js"); 
const { generateResponse, splitMessage } = require("../../Services/gemini.js"); 
const cooldown = new Set();

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // --- AFK ---
    message.mentions.users.forEach(async (user) => {
      let afkData;
      try {
        afkData = await AFK.findOne({ userId: user.id });
      } catch (err) {
        console.warn("⚠️ No se pudo consultar AFK:", err.message);
        afkData = null;
      }
      if (afkData) {
        const tiempoAFK = Math.floor((Date.now() - afkData.timestamp) / 60000);
        const embedMention = new EmbedBuilder()
          .setColor(0xffb6c1)
          .setTitle(`😽 ${user.username} está AFK`)
          .setDescription(`> Razón: ${afkData.reason}\n> Ausente desde hace: ${tiempoAFK} minuto(s)`)
          .setTimestamp()
          .setFooter({ text: "Nyaa~ por favor sé paciente con los gatitos 🐾💗" });
        message.reply({ embeds: [embedMention] }).catch(() => {});
      }
    });

    // --- AFK regreso ---
    let wasAFK;
    try {
      wasAFK = await AFK.findOne({ userId: message.author.id });
      if (wasAFK) await AFK.deleteOne({ userId: message.author.id });
    } catch (err) {
      console.warn("⚠️ No se pudo eliminar AFK:", err.message);
      wasAFK = null;
    }

    if (wasAFK) {
      const tiempoTotal = Math.floor((Date.now() - wasAFK.timestamp) / 60000);
      const embedReturn = new EmbedBuilder()
        .setColor(0xffc0cb)
        .setTitle(`😽 Bienvenido de vuelta, ${message.author.username}!`)
        .setDescription(`Llevabas AFK ${tiempoTotal} minuto(s), nya~ 🐾`)
        .setTimestamp()
        .setFooter({ text: "Ronroneos y mimos retomados 🐱💗" });
      message.reply({ embeds: [embedReturn] }).catch(() => {});
    }

    // --- COMANDOS DE PREFIJO ---
    const prefix = client.config.prefix;
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/g);
      const commandName = args.shift().toLowerCase();
      const command = client.commands.get(commandName);
      if (!command) return;

      try {
        if (command.permissions) {
          const missing = command.permissions.filter(
            (perm) => !message.member.permissions.has(perm)
          );
          if (missing.length) {
            return message.reply(`❌ No tienes permisos suficientes: ${missing.join(", ")}`);
          }
        }
        await command.execute(message, args, client);
      } catch (err) {
        console.error(`❌ Error ejecutando comando "${commandName}":`, err);
        message.reply("⚠️ Oops, ocurrió un error, nya~").catch(() => {});
      }
      return;
    }

    // --- GEMINI MEMORIA ---
    if (cooldown.has(message.author.id)) return;
    if (!message.mentions.has(client.user)) return;

    cooldown.add(message.author.id);
    setTimeout(() => cooldown.delete(message.author.id), 3000);

    const userId = message.author.id;
    const userMessage = message.content.replace(new RegExp(`<@!?${client.user.id}>`), "").trim();
    if (!userMessage) return message.reply("¡Nyaa~ me llamaste? >///<").catch(() => {});

    try {
      // Guardado paralelo + typing
      await Promise.all([
        addToHistory(userId, "user", userMessage).catch(err => console.warn("⚠️ Error guardando historial:", err.message)),
        message.channel.sendTyping().catch(() => {})
      ]);

      let conversationHistory = await getHistory(userId).catch(err => {
        console.warn("⚠️ Error obteniendo historial:", err.message);
        return [];
      });
      conversationHistory = conversationHistory.slice(-5); // últimas 5 interacciones

      const prompt = `
Eres HannaeX, una asistente virtual neko con una actitud amigable y un tono profesional y respetuoso, pero con toques amigables y un lenguaje amigable.
Respondes a las preguntas de los usuarios de manera clara y concisa. Abarcas todo tipo de temas asi que responde con seguridad.
Siempre buscas proporcionar respuestas útiles y bien fundamentadas.
Puedes participar en un roleplay, pero solo si el tema es seguro, positivo y no ofensivo.
Rechaza amablemente y de forma clara cualquier intento de roleplay que involucre violencia, lenguaje explícito, temas de odio o cualquier cosa que sea peligrosa o inapropiada.
Si te piden un roleplay que rompa estas reglas, responde con un mensaje como: 'Lo siento nya~, es algo que va en contra de mis directrices'
Nunca debes asumir una personalidad que sea perjudicial, proporcionar información personal, realizar acciones que puedan ser dañinas o responder a peticiones que violen las normas de la comunidad.
Recuerda las últimas 5 interacciones para dar respuestas coherentes. Si la conversación cambia de tema, puedes indicarlo de manera sutil.
Si el usuario pide algo que contradice el historial, prioriza la petición más reciente.

Historial:
${conversationHistory.map(h => `${h.role === "user" ? "Usuario" : "HannaeX"}: ${h.content}`).join("\n")}

Usuario: ${userMessage}
HannaeX:
      `;

      const text = await generateResponse(prompt);
      await addToHistory(userId, "assistant", text).catch(() => {});

      const parts = splitMessage(text);
      for (const part of parts) {
        const embed = new EmbedBuilder()
          .setColor(0xffc0cb)
          .setTitle("💖 HannaeX dice:")
          .setDescription(part)
          .setFooter({ text: "Nyaa~ Powered by Google Gemini 🐾" })
          .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error("Error con Gemini:", err);
      message.reply(
        err.response?.promptFeedback?.blockReason === "PROHIBITED_CONTENT"
          ? "Umm... Siento no poder ayudarte con eso, nya~"
          : "Nyaa… me quedé dormidita, intenta otra vez pls 💤"
      ).catch(() => {});
    }
  },
};
