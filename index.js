const path = require("path")
const fs = require("fs")
require('dotenv').config();
const {Client, Collection, GatewayIntentBits, Guild} = require('discord.js');

const eventHandler = require('./Handlers/eventHandler.js');
const cmdHandler = require('./Handlers/cmdHandler.js');

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
})

client.config = {
    token: process.env.TOKEN,
    BotId: process.env.BOT_ID,
    GuildId: process.env.GUILD_ID,
    prefix: process.env.PREFIX
};

client.commands = new Collection();
client.slashCommands = new Collection();

eventHandler(client);
cmdHandler(client);

client.login(process.env.TOKEN)