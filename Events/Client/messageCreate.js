
module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const prefix = config.prefix;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName);

        if (command) {
            try {
                return command.execute(message, args, client);
            } catch (err) {
                console.error("Error executing command:", err);
                return message.reply("There was an error executing that command.");
            }
        }
    }
};
