const { SlashCommandBuilder } = require('discord.js');
const { InteractionResponseFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message to say')
                .setRequired(true)
        ),

    async execute(interaction) {
        const msg = interaction.options.getString('message');
        await interaction.reply({
            content: "Message sent!",
            flags: [64]
        })
        await interaction.channel.send(msg);
    }
};
