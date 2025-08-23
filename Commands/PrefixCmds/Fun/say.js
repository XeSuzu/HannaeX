module.exports = {
    name: 'say',
    description: 'Hace que el bot diga un mensaje ✨',
    async execute(message, args) {
        try {
            const msg = args.join(" ");
            
            // Si el bot no tiene permisos de hablar, no puede continuar.
            if (!message.guild.members.me.permissions.has('SendMessages')) {
                return message.author.send('❌ No tengo permisos para enviar mensajes en este canal.').catch(e => {
                    console.error(`No pude notificar al usuario ${message.author.tag} (${message.author.id}) sobre la falta de permisos.`, e);
                });
            }

            if (!msg) {
                // Se ha eliminado el 'reply' y se ha cambiado a 'channel.send' para evitar un bucle de respuestas
                // si el bot no tiene permisos de 'ReadMessageHistory' para hacer un reply.
                return message.channel.send(`❌ ${message.author}, debes escribir un mensaje para que lo diga.`);
            }

            // Evitar que se use para mencionar a todos
            if (msg.includes('@everyone') || msg.includes('@here')) {
                return message.channel.send(`🚫 ${message.author}, no puedes mencionar a todos con este comando.`);
            }

            // Borrar mensaje del usuario si el bot tiene permisos
            if (message.guild.members.me.permissions.has("ManageMessages")) {
                await message.delete();
            } else {
                // Notificar al usuario si el bot no pudo borrar el mensaje
                message.channel.send(`⚠️ No tengo permiso para borrar tu mensaje, pero he enviado el texto.`);
            }

            await message.channel.send(msg);

        } catch (error) {
            console.error('Error en el comando aneko:', error);
            await message.channel.send(`❌ Ocurrió un error al ejecutar el comando. Error: \`${error.message}\``);
        }
    }
};