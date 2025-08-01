const { name } = require("../../../Events/Client/ready");

module.exports = {
    name: 'say',
    description: 'Make the bot say something',
    async execute(message, args) {
        const msg = args.join(" ");
        if (!msg) return message.reply("Please provide a message to say.");
            message.delete();
        message.channel.send(msg)
    }
}