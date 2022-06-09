'use strict';

// Import modules
require('dotenv').config()
const Discord = require('discord.js');
const {
    MessageEmbed, MessageAttachment
} = require('discord.js');
const fs = require('graceful-fs');
const canvacord = require("canvacord");
const Canvas = require('@napi-rs/canvas');
const { createCanvas, Image } = require('@napi-rs/canvas');
//const Canvas = require("discord-canvas-easy");
const { readFile } = require('fs/promises');
const { request } = require('undici');
const img = "https://cdn.discordapp.com/embed/avatars/0.png";




// Create an instance of a Discord client
const client = new Discord.Client({
    intents: ["GUILD_PRESENCES", "GUILD_MEMBERS", "GUILDS", "GUILD_BANS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "GUILD_EMOJIS_AND_STICKERS", "GUILD_INTEGRATIONS", "GUILD_WEBHOOKS", "GUILD_INVITES", "GUILD_MESSAGE_TYPING", "DIRECT_MESSAGE_REACTIONS", "DIRECT_MESSAGE_TYPING", "GUILD_VOICE_STATES", "GUILD_MESSAGE_REACTIONS"]
})

//DB
const SQLite = require("better-sqlite3");
const sql = new SQLite("./scores.sqlite");

// Setup repeater
const sleep = ms => new Promise(res => setTimeout(res, ms));

client.on('ready', async () => {
    console.log('I am ready!');
      // Check if the table "points" exists.
  const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'scores';").get();
  if (!table['count(*)']) {
    // If the table isn't there, create it and setup the database correctly.
    sql.prepare("CREATE TABLE scores (id TEXT PRIMARY KEY, user TEXT, level INTEGER, xp INTEGER, totalXp INTEGER, messageCount INTEGER, lastMessage INTEGER, date INTEGER);").run();
    // Ensure that the "id" row is always unique and indexed.
    sql.prepare("CREATE UNIQUE INDEX idx_scores_id ON scores (id);").run();
    sql.pragma("synchronous = 1");
    sql.pragma("journal_mode = wal");
  }

  // Queries
  client.getScore = sql.prepare("SELECT * FROM scores WHERE user = ?");
  client.setScore = sql.prepare("INSERT OR REPLACE INTO scores (id, user, level, xp, totalXp, messageCount, lastMessage, date) VALUES (@id, @user, @level, @xp, @totalXp, @messageCount, @lastMessage, @date);");
  client.getEveryone = sql.prepare("SELECT * FROM scores")
  client.getRankOrder = sql.prepare("SELECT ROW_NUMBER () OVER ( ORDER BY totalXp DESC) RowNum,user,xp,totalXp,messageCount,level FROM scores LIMIT 10;")
});

const prefix = "?";

function generateRandomInteger(min, max) {
    return Math.floor(min + Math.random()*(max - min + 1))
  }

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    let findMember;
    if (message.guild) {
        findMember = client.getScore.get(message.author.id);
        if (!findMember) {
            findMember = { id: `${message.guild.id}-${message.author.id}`, user: `${message.author.id}`, level: 0, xp: 0, totalXp: 0, messageCount: 0, lastMessage: 0, date: 0 }
          }
        let checkTimeout = Date.now() - findMember.lastMessage > 1000
        if(checkTimeout && !message.content.startsWith(prefix)){
            let randomEXP = 30 //generateRandomInteger(30,50)
            findMember.xp = findMember.xp + randomEXP;
            findMember.totalXp = randomEXP + findMember.totalXp
            findMember.lastMessage = Date.now()
            findMember.messageCount = findMember.messageCount + 1
            let checkLevel = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - findMember.xp
            if(checkLevel <= 0){
                findMember.level = findMember.level + 1
                findMember.xp = -checkLevel
                console.log("new level!" + findMember.level)
            } 
        console.log(findMember, " this is find member")
        client.setScore.run(findMember);
      }
    }

    if(message.content.startsWith(prefix + 'give')){
        let myArray = message.content.split(" ")
        const user = message.mentions.users.first() || client.users.cache.get(myArray[1]);
        if (!user) return message.reply("You must mention someone or give their ID!");
        findMember = client.getScore.get(user.id);
        const pointsToAdd = parseInt(myArray[2], 10);
        if (!pointsToAdd) return message.reply("You didn't tell me how many points to give...");
        if (!findMember) {
            findMember = { id: `${user.id}-${user.id}`, user: `${user.id}`, level: 0, xp: 0, totalXp: 0, messageCount: 0, lastMessage: 0, date: 0 }
            findMember.xp = findMember.xp + Number(pointsToAdd)
            findMember.totalXp = Number(pointsToAdd) + findMember.totalXp
            let checkLevel = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - findMember.xp
            while(checkLevel <= 0){
                findMember.level = findMember.level + 1
                findMember.xp = -checkLevel
                checkLevel = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - findMember.xp
            }
            client.setScore.run(findMember);
        } else{
            console.log(user, pointsToAdd)
            findMember.xp = findMember.xp + Number(pointsToAdd)
            findMember.totalXp = Number(pointsToAdd) + findMember.totalXp
            let checkLevel = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - findMember.xp
            while(checkLevel <= 0){
                findMember.level = findMember.level + 1
                findMember.xp = -checkLevel
                checkLevel = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - findMember.xp
            }
            client.setScore.run(findMember);
        }

    }
    if(message.content.startsWith(prefix + 'take')){
        let myArray = message.content.split(" ")
        const user = message.mentions.users.first() || client.users.cache.get(myArray[1]);
        if (!user) return message.reply("You must mention someone or give their ID!");
        findMember = client.getScore.get(user.id);
        if (!findMember) {
            findMember = { id: `${message.guild.id}-${message.author.id}`, user: `${message.author.id}`, level: 0, xp: 0, totalXp: 0, messageCount: 0, lastMessage: 0, date: 0 }
          }
        const pointsToTake = parseInt(myArray[2], 10);
        if (!pointsToTake) return message.reply("You didn't tell me how many points to give...");
        findMember = client.getScore.get(user.id);
        let checkLevel = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - findMember.xp
        let checkPoints = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - 0
        let noNeedToLevelDown = findMember.xp - Number(pointsToTake)
        findMember.totalXp = findMember.totalXp - Number(pointsToTake)
        if(noNeedToLevelDown >= 0){
            findMember.xp = findMember.xp - Number(pointsToTake)
        } else {
            console.log(checkLevel, checkPoints)
            let takenPointsLeft = Number(pointsToTake) - findMember.xp // 4970
            while(takenPointsLeft > 0){
                    //findMember.xp = Number(pointsToTake) - findMember.xp
                    console.log(findMember.xp)
                    findMember.level = findMember.level - 1 //15 // 14
                    checkPoints = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - 0 // 1975 //1780 how many max points there is for that level
                    //findMember.xp = findMember.xp - (checkPoints) //-1945//-3725
                    takenPointsLeft = takenPointsLeft - checkPoints //2995//1215
                    }
                    if(takenPointsLeft <= 0){
                        findMember.xp = -takenPointsLeft
                    }
                    //findMember.xp = checkPoints + findMember.xp
        }

        client.setScore.run(findMember);
    }
    if(message.content.startsWith(prefix + 'give-xp-everyone')){
        let myArray = message.content.split(" ")
        let amount = myArray[1].toString();
        let json = client.getEveryone.all()
            json.forEach(function(e){
                e.xp = e.xp + Number(amount)
                e.totalXp = e.xp + Number(amount)
                let checkLevel = (5 * (e.level ** 2)) + (50 * e.level) + 100 - e.xp
                while(checkLevel <= 0){
                    e.level = e.level + 1
                    e.xp = -checkLevel
                    checkLevel = (5 * (e.level ** 2)) + (50 * e.level) + 100 - e.xp
                }
                client.setScore.run(e);
            });
    }
    if (message.content.startsWith(prefix + 'rank')) {

        findMember = client.getScore.get(message.author.id);
        console.log(findMember)
        let checkLevel = (5 * (findMember.level ** 2)) + (50 * findMember.level) + 100 - findMember.xp
        const userData = findMember;
        console.log(userData.totalXp)
        let userAvatar = "https://cdn.discordapp.com/avatars/"+message.author.id+"/"+message.author.avatar+".jpeg"
        if(message.author.avatar == null){
            userAvatar = img
        }
        let getRank = client.getRankOrder.all()
        var myObject = getRank.filter(function(element) {
            if(element.user == message.author.id){
                return element;
            }
        })
        const rank = new canvacord.Rank()
            .setAvatar(userAvatar)
            .setCurrentXP(userData.xp)
            .setRequiredXP(userData.xp + checkLevel)
            .setLevel(userData.level)
            .setRank(myObject[0].RowNum)
            .setProgressBar("#FFFFFF", "COLOR")
            .setUsername(message.author.username.toString())
            .setDiscriminator(message.author.discriminator.toString());
        rank.build()
            .then(r => {
                const attachment = new Discord.MessageAttachment(r, img);
                message.channel.send({ files: [attachment]});
            });
    };

    if (message.content.startsWith(prefix + 'leaderboard')) {
/*
        const canvas = Canvas.createCanvas(700, 600);
		const context = canvas.getContext('2d');

        const backgroundFile = await readFile('./wallpaper.jpg');
        const background = new Canvas.Image();
        background.src = backgroundFile;
    
        // This uses the canvas dimensions to stretch the image onto the entire canvas
        context.drawImage(background, 0, 0, canvas.width, canvas.height);
        context.strokeRect(0, 0, canvas.width, canvas.height);
        console.log(message.author.displayAvatarURL({ format: 'jpg' }))
        const { body } = await request(message.author.displayAvatarURL({ format: 'jpg' }));
        //const body = await message.author.displayAvatarURL({ format: 'jpg' });
	    const avatar = new Canvas.Image();
	    //avatar.src = Buffer.from(await body);
        avatar.src = Buffer.from(await body.arrayBuffer());
        const circle = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 70,
}

        context.beginPath();
        context.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, true);
        context.closePath();
        context.clip();
        // Compute aspectration
        const aspect = avatar.height / avatar.width;
        // Math.max is ued to have cover effect use Math.min for contain
        const hsx = circle.radius * Math.max(1.0 / aspect, 1.0);
        const hsy = circle.radius * Math.max(aspect, 1.0);
        // x - hsl and y - hsy centers the image
        context.drawImage(avatar,25,50,hsx * 2,hsy * 2);

        

        // Select the font size and type from one of the natively available fonts
        context.font = '30px sans-serif';
    
        // Select the style that will be used to fill the text in
        context.fillStyle = '#ffffff';
    
        // Actually fill the text with a solid color
        context.drawImage(avatar, 20, 50, 75, 75);
        context.drawImage(avatar, 20, 130, 75, 75);
        context.fillText("HeiseMo#7703 This is a test", 140, 100);
        context.fillText("HeiseMo#7703 This is a test", 140, 180);

    
        // Use the helpful Attachment class structure to process the file for you
        const attachment = new MessageAttachment(canvas.toBuffer('image/png'), 'profile-image.png');

        message.channel.send({
            files: [attachment]
        })

        let data = client.getRankOrder.all()
        console.log(data)
        const embed = new Discord.MessageEmbed()
        .setTitle(`Leaderboard`)
        .setColor('#810e0e')
        .setTimestamp()
        data.forEach(array => {
            let user = client.users.cache.get(array.user);
            console.log(user.username)
        embed.addFields({
            name: `${user.username}`,
            value: `Level: ${array.level}
                    Total XP: ${array.totalXp} 
                    Message Count: ${array.messageCount} `,
            inline: false
        });
    });

    message.channel.send({
        embeds: [embed]
    })
        
*/
        const leaderboard = client.getRankOrder.all()
        let count = leaderboard.length;
        const canvas = Canvas.createCanvas(1280, 700);
        const ctx = canvas.getContext("2d");

        const backgroundFile = await readFile('./wallpaper.jpg');
        const background = new Canvas.Image();
        background.src = backgroundFile;
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height)

        const opacityFile = await readFile(`./leaderboard_black.png`)
        const opacity = new Canvas.Image();
        opacity.src = opacityFile;
        ctx.drawImage(opacity, 0, 0, canvas.width, canvas.height)
        let d = [
            {
                RowNum: 3,
                user: '625506696705474590',
                xp: 90,
                totalXp: 13890,
                messageCount: 3,
                level: 16
              },
              {
                RowNum: 3,
                user: '625506696705474590',
                xp: 90,
                totalXp: 13890,
                messageCount: 3,
                level: 16
              },
              {
                RowNum: 3,
                user: '625506696705474590',
                xp: 90,
                totalXp: 13890,
                messageCount: 3,
                level: 16
              },
              {
                RowNum: 3,
                user: '625506696705474590',
                xp: 90,
                totalXp: 13890,
                messageCount: 3,
                level: 16
              },

        ]
        leaderboard.push(d)
        console.log(d)
        count = leaderboard.length;
        if(count <= 5) {
        
            for(let i = 0; i < count; i++) {
                console.log(leaderboard)
                let member = client.users.cache.get(leaderboard[i].user)
                const status = member ? member.presence ? member.presence.status : "offline" : "offline";
                console.log(member)
                console.log(member.discriminator, "member ctx")

                ctx.beginPath();
                ctx.arc(104, (104 + (i * 128)), 47, 0, 2 * Math.PI, true);
                ctx.closePath();
                ctx.fillStyle = status === "online" ? "#3ba55c" : status === "dnd" ? "#ed4245" : status === "stream" ? "#593695" : status === "idle" ? "#faa61a" : status === "offline" ? "#747f8d" : ""
                ctx.fill();

                ctx.font = '12px "Futura Book"';
                ctx.fillStyle = this.colorFont;
                ctx.fillText(`${member.username}#${member.discriminator}`, (104 - (ctx.measureText(`${member.discriminator.length > 20 ? member.discriminator.slice(0, 20) : member.discriminator}`).width / 2)), (165 + (i * 128)));

                ctx.font = '28px "Futura Book"';
                ctx.fillStyle = this.colorFont;
                ctx.fillText(`Rank : ${i + 1 === 1 ? "#1" : `#${i + 1}`}`, 200, (65 + ((i <= 4 ? i : i - 5) * 128)));
                ctx.fillText(`Level : ${leaderboard[i].level}`, 200, (95 + ((i <= 4 ? i : i - 5) * 128)));
                ctx.fillText(`XP : ${leaderboard[i].totalXp}`, 200, (125 + ((i <= 4 ? i : i - 5) * 128)));
                ctx.fillText(`Message Count : ${leaderboard[i].messageCount}`, 200, (155 + ((i <= 4 ? i : i - 5) * 128)));
            }

            ctx.beginPath();
            for(let i = 0; i < count; i++) {
                ctx.arc(104, (104 + ((i) * 128)), 42.5, 0, Math.PI * 2, true);
            }
            ctx.closePath();
            ctx.clip();

            for(let i = 0; i < count; i++) {

                const user = await client.users.fetch(leaderboard[i].user);
                const member = client.users.cache.get(leaderboard[i].user)
                
                if(user) {
                    const { body } = await request(member.displayAvatarURL({ format: 'jpg' }));
                    //const body = await message.author.displayAvatarURL({ format: 'jpg' });
                    const avatar = new Canvas.Image();
                    //avatar.src = Buffer.from(await body);
                    avatar.src = Buffer.from(await body.arrayBuffer());
                    ctx.drawImage(avatar, 62, (62 + (i * 128)), 85, 85);
                }
            }

        } else {

            for(let i = 0; i < count; i++) {

                if(i <= 4) {

                    const member = client.users.cache.get(leaderboard[i].user)
                    const status = member ? member.presence ? member.presence.status : "offline" : "offline";

                    ctx.beginPath();
                    ctx.arc(104, (84 + (i <= 4 ? i : i - 5) * 128), 47, 0, 2 * Math.PI, true);
                    ctx.closePath();
                    ctx.fillStyle = status === "online" ? "#3ba55c" : status === "dnd" ? "#ed4245" : status === "stream" ? "#593695" : status === "idle" ? "#faa61a" : status === "offline" ? "#747f8d" : ""
                    ctx.fill();

                    ctx.font = '12px "Futura Book"';
                    ctx.fillStyle = this.colorFont;
                    ctx.fillText(`${member.username}#${member.discriminator}`,(104 - (ctx.measureText(`${leaderboard[i].user.discriminator.length > 20 ? leaderboard[i].user.discriminator.slice(0, 20) : leaderboard[i].user.discriminator}`).width / 2)), (145 + ((i <= 4 ? i : i - 5) * 128)));

                    ctx.font = '28px "Futura Book"';
                    ctx.fillStyle = this.colorFont;
                    ctx.fillText(`Rank : ${i + 1 === 1 ? "" : `${i + 1}`}`, 200, (65 + ((i <= 4 ? i : i - 5) * 128)));
                    ctx.fillText(`Level : ${leaderboard[i].level}`, 200, (95 + ((i <= 4 ? i : i - 5) * 128)));
                    ctx.fillText(`Total XP : ${leaderboard[i].totalCp}`, 200, (125 + ((i <= 4 ? i : i - 5) * 128)));
                    ctx.fillText(`Total XP : ${leaderboard[i].messageCount}`, 200, (155 + ((i <= 4 ? i : i - 5) * 128)));
                
                } else {

                    const member = client.users.cache.get(leaderboard[i].user.id)
                    const status = member ? member.presence ? member.presence.status : "offline" : "offline";

                    ctx.beginPath();
                    ctx.arc(744, ((84 + (i <= 4 ? i : i - 5) * 128)), 47, 0, 2 * Math.PI, true);
                    ctx.closePath();
                    ctx.fillStyle = status === "online" ? "#3ba55c" : status === "dnd" ? "#ed4245" : status === "stream" ? "#593695" : status === "idle" ? "#faa61a" : status === "offline" ? "#747f8d" : ""
                    ctx.fill();

                    ctx.font = '12px "Futura Book"';
                    ctx.fillStyle = this.colorFont;
                    ctx.fillText(`${member.username}#${member.discriminator}`, (744 - (ctx.measureText(`${leaderboard[i].user.discriminator.length > 20 ? leaderboard[i].user.discriminator.slice(0, 20) : leaderboard[i].user.discriminator}`).width / 2)), (145 + ((i <= 4 ? i : i - 5) * 128)));

                    ctx.font = '28px "Futura Book"';
                    ctx.fillStyle = this.colorFont;
                    ctx.fillText(`Rank : ${i + 1 === 1 ? "1er" : `${i + 1}ème`}`, 840, (65 + ((i <= 4 ? i : i - 5) * 128)));
                    ctx.fillText(`Level : ${leaderboard[i].level}`, 840, (95 + ((i <= 4 ? i : i - 5) * 128)));
                    ctx.fillText(`XP : ${leaderboard[i].totalXp}`, 840, (125 + ((i <= 4 ? i : i - 5) * 128)));
                    ctx.fillText(`Message Count : ${leaderboard[i].messageCount}`, 840, (155 + ((i <= 4 ? i : i - 5) * 128)));
                }
            }

            ctx.beginPath();
            ctx.arc(104, (84 + (0 * 128)), 42.5, 0, Math.PI * 2);
            ctx.arc(744, (84 + (0 * 128)), 42.5, Math.PI * 1, Math.PI * 3);
            ctx.arc(104, (84 + (1 * 128)), 42.5, 0, Math.PI * 2);
            ctx.arc(744, (84 + (1 * 128)), 42.5, Math.PI * 1, Math.PI * 3);
            ctx.arc(104, (84 + (2 * 128)), 42.5, 0, Math.PI * 2);
            ctx.arc(744, (84 + (2 * 128)), 42.5, Math.PI * 1, Math.PI * 3);
            ctx.arc(104, (84 + (3 * 128)), 42.5, 0, Math.PI * 2);
            ctx.arc(744, (84 + (3 * 128)), 42.5, Math.PI * 1, Math.PI * 3);
            ctx.arc(104, (84 + (4 * 128)), 42.5, 0, Math.PI * 2);
            ctx.arc(744, (84 + (4 * 128)), 42.5, Math.PI * 1, Math.PI * 3);
            ctx.closePath();
            ctx.clip();

            for(let i = 0; i < 5; i++) {

                const user = await this.bot.users.fetch(leaderboard[i].user.id);
                const member = await client.users.cache.get(user.id)

                if(user) {
                    const avatar = await Canvas.loadImage(member ? member.avatar ? member.avatarURL({format: "png"}) : user.displayAvatarURL({ format: "png" }) : user.displayAvatarURL({ format: "png" }))
                    ctx.drawImage(avatar, 62, (42 + (i * 128)), 85, 85);
                }
            }

            for(let i = 5; i < count; i++) {

                const user = await client.users.fetch(leaderboard[i].user.id);
                const member = await client.users.cache.get(user.id)

                if(user) {
                    const avatar = await Canvas.loadImage(member ? member.avatar ? member.avatarURL({format: "png"}) : user.displayAvatarURL({ format: "png" }) : user.displayAvatarURL({ format: "png" }))
                    ctx.drawImage(avatar, 702, (42 + ((i - 5) * 128)), 85, 85);
                }
            }
        }
        const attachment = new MessageAttachment(canvas.toBuffer('image/png'), 'profile-image.png');

        message.channel.send({
            files: [attachment]
        })

    };

    if(message.content.startsWith(prefix + 'mine')){
        let rng = Math.random() < 0.5
        console.log(rng)
    }

});

// Log our bot in using the token from https://discord.com/developers/applications
client.login(process.env.DISCORDBOTTOKEN);