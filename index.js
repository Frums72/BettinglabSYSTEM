const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const { cacheInvites, handleJoin, handleLeave, handleCommand: handleInviteCommand } = require("./invites");
const { handleInteraction: handleTicketInteraction, restoreTickets } = require("./tickets");
const { log } = require("./logger");
const { updateStats } = require("./stats");
const { startEmbedBuilder, handleEmbedBuilder } = require("./embedbuilder");
const { handleMessage: handleAutomod } = require("./automod");
const { handleMessage: handleLevelMessage, handleReaction, handleCommand: handleLevelCommand, handleBlackjackButton, handleHighLowButton, handleRaceButton } = require("./levels");
const { handleDailySpinButton } = require("./dailyspin");
const { handleGiveawayReaction } = require("./giveaway");
const { handleInvestmentButton, startInvestmentSystem } = require("./investments");
const { startReminderSystem } = require("./reminders");
const { startLeaderboardSystem } = require("./leaderboard");
const { handleCommand: handleModCommand } = require("./moderation");
const { postDailyRewards, handleDailyButton } = require("./dailyrewards");
const { postDailyQuests, postWeeklyQuests, handleQuestButton, handleQuestClaim } = require("./quests");

const TOKEN     = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  // Help & Info
  new SlashCommandBuilder().setName("betlabhelp").setDescription("Alle Commands anzeigen"),
  
  // Embed Builder
  new SlashCommandBuilder().setName("betlabsend").setDescription("Embed Builder"),
  new SlashCommandBuilder().setName("betlabsendticketpanel").setDescription("Ticket Panel senden"),
  
  // Invites
  new SlashCommandBuilder()
    .setName("betlabinvites")
    .setDescription("Invite-Stats anzeigen")
    .addUserOption(o => o.setName("user").setDescription("User (optional)")),
  new SlashCommandBuilder()
    .setName("betlabinvitesedit")
    .setDescription("Invites manuell setzen")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("type").setDescription("Typ").setRequired(true)
      .addChoices({ name: "Normal", value: "normal" }, { name: "Betlab", value: "betlab" }))
    .addIntegerOption(o => o.setName("amount").setDescription("Anzahl").setRequired(true)),
  new SlashCommandBuilder()
    .setName("betlabinviteclear")
    .setDescription("Invites zurücksetzen")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("betlabsendbetlab")
    .setDescription("Betlab-Invites vergeben")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("amount").setDescription("Anzahl").setRequired(true)),
  
  // Moderation
  new SlashCommandBuilder()
    .setName("betlabban")
    .setDescription("User bannen")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("grund").setDescription("Grund"))
    .addIntegerOption(o => o.setName("tage").setDescription("Nachrichten löschen (0-7 Tage)").setMinValue(0).setMaxValue(7)),
  new SlashCommandBuilder()
    .setName("betlabtimeout")
    .setDescription("User timeouten")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("minuten").setDescription("Dauer in Minuten").setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName("grund").setDescription("Grund")),
  new SlashCommandBuilder()
    .setName("betlabkick")
    .setDescription("User kicken")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("grund").setDescription("Grund")),
  new SlashCommandBuilder()
    .setName("betlabunban")
    .setDescription("User entbannen")
    .addStringOption(o => o.setName("userid").setDescription("User ID").setRequired(true))
    .addStringOption(o => o.setName("grund").setDescription("Grund")),
  new SlashCommandBuilder()
    .setName("betlabclearchat")
    .setDescription("Nachrichten löschen")
    .addIntegerOption(o => o.setName("anzahl").setDescription("Anzahl (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)),
  
  // Level & Coins System
  new SlashCommandBuilder()
    .setName("betlabcoins")
    .setDescription("Coins & Level anzeigen")
    .addUserOption(o => o.setName("user").setDescription("User (optional)")),
  new SlashCommandBuilder()
    .setName("betlabxp")
    .setDescription("XP & Level Stats anzeigen")
    .addUserOption(o => o.setName("user").setDescription("User (optional)")),
  new SlashCommandBuilder()
    .setName("betlabcoinflip")
    .setDescription("Coinflip - Glücksspiel!")
    .addIntegerOption(o => o.setName("anzahl").setDescription("Wie viele Coins setzen?").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("betlabdice")
    .setDescription("Dice - Rate die Zahl! (1-6)")
    .addIntegerOption(o => o.setName("anzahl").setDescription("Wie viele Coins setzen?").setRequired(true).setMinValue(1))
    .addIntegerOption(o => o.setName("zahl").setDescription("Welche Zahl? (1-6)").setRequired(true).setMinValue(1).setMaxValue(6)),
  new SlashCommandBuilder()
    .setName("betlabblackjack")
    .setDescription("Blackjack - Komm näher an 21!")
    .addIntegerOption(o => o.setName("anzahl").setDescription("Wie viele Coins setzen?").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("betlabhighlow")
    .setDescription("High/Low - Rate höher oder niedriger!")
    .addIntegerOption(o => o.setName("anzahl").setDescription("Wie viele Coins setzen?").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("betlabrace")
    .setDescription("Race - 10 Tiere rennen!")
    .addIntegerOption(o => o.setName("anzahl").setDescription("Wie viele Coins setzen?").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("betlabspin")
    .setDescription("Daily Spin - 1x pro Tag kostenlos!"),
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Starte ein Giveaway!")
    .addChannelOption(o => o.setName("channel").setDescription("In welchem Channel?").setRequired(true))
    .addStringOption(o => o.setName("gewinn").setDescription("Was gibt es zu gewinnen? (z.B. '500 Coins' oder 'Nitro')").setRequired(true))
    .addIntegerOption(o => o.setName("dauer").setDescription("Dauer in Minuten (Standard: 60)").setMinValue(1)),
  new SlashCommandBuilder()
    .setName("betlabinvest")
    .setDescription("Investiere in Projekte!")
    .addStringOption(o => o.setName("projekt").setDescription("Welches Projekt?").setRequired(true).addChoices(
      { name: "🏪 SHOP (Sicher)", value: "shop" },
      { name: "🏭 FABRIK (Mittel)", value: "fabrik" },
      { name: "💎 CASINO (Hoch)", value: "casino" }
    ))
    .addIntegerOption(o => o.setName("anzahl").setDescription("Wie viele Coins investieren?").setRequired(true).setMinValue(100)),
  new SlashCommandBuilder()
    .setName("betlabeditcoins")
    .setDescription("Coins manuell setzen (Team Only)")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("anzahl").setDescription("Anzahl").setRequired(true)),
  new SlashCommandBuilder()
    .setName("betlabeditxp")
    .setDescription("XP manuell setzen (Team Only)")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("xp").setDescription("Total XP Anzahl").setRequired(true)),
  new SlashCommandBuilder()
    .setName("betlabranking")
    .setDescription("TOP 5 Rankings")
    .addStringOption(o => o.setName("type").setDescription("Typ").setRequired(true)
      .addChoices(
        { name: "Invites", value: "invites" },
        { name: "Coins", value: "coins" },
        { name: "XP/Level", value: "xp" }
      ))
  
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async function() {
  try {
    console.log("Registriere Commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ " + commands.length + " Commands registriert!");
  } catch (e) { 
    console.error("❌ Commands fehlgeschlagen:", e); 
  }
})();

let postsAlreadyDone = false;

client.once("clientReady", async function() {
  console.log("🚀 Online als " + client.user.tag);
  
  for (const guild of client.guilds.cache.values()) {
    await cacheInvites(guild);
    await updateStats(guild, client);
    await restoreTickets(guild, client);
  }
  
  // Auto-Post Daily/Weekly
  if (!postsAlreadyDone) {
    postsAlreadyDone = true;
    console.log("📋 Starte Auto-Post...");
    
    try {
      await postDailyRewards(client);
      console.log("✅ Daily Rewards gepostet");
    } catch(e) {
      console.error("❌ Daily Rewards Fehler:", e);
    }
    
    try {
      await postDailyQuests(client);
      console.log("✅ Daily Quests gepostet");
    } catch(e) {
      console.error("❌ Daily Quests Fehler:", e);
    }
    
    try {
      await postWeeklyQuests(client);
      console.log("✅ Weekly Quests gepostet");
    } catch(e) {
      console.error("❌ Weekly Quests Fehler:", e);
    }
  } else {
    console.log("⚠️ Posts bereits gemacht, überspringe...");
  }
  
  log(client, "SUCCESS", "Bot gestartet", "Tag: " + client.user.tag);
  
  // Reminder System starten
  startReminderSystem(client);
  
  // Leaderboard System starten
  startLeaderboardSystem(client);
  
  // Investment System starten
  startInvestmentSystem(client);
});

client.on("guildCreate", async function(guild) {
  await cacheInvites(guild);
  await updateStats(guild, client);
  log(client, "INFO", "Neuer Server beigetreten", "Guild: " + guild.name + " (" + guild.id + ")");
});

client.on("guildMemberAdd", async function(member) {
  await handleJoin(member, client);
  await updateStats(member.guild, client);
});

client.on("guildMemberRemove", async function(member) {
  await handleLeave(member, client);
  await updateStats(member.guild, client);
});

client.on("guildMemberUpdate", async function(oldMember, newMember) {
  await updateStats(newMember.guild, client);
});

// Nachrichten: Automod + Level System
client.on("messageCreate", async function(message) {
  try {
    await handleAutomod(message, client);
    await handleLevelMessage(message, client);
  } catch(e) {
    console.error("Message Handler Fehler:", e);
    log(client, "ERROR", "Message Handler Fehler", e && e.message ? e.message : String(e));
  }
});

client.on("interactionCreate", async function(i) {
  try {
    if (i.isChatInputCommand()) {
      // Embed Builder
      if (i.commandName === "betlabsend") return startEmbedBuilder(i);
      
      // Invite Commands
      const inviteHandled = await handleInviteCommand(i, client);
      if (inviteHandled) return;
      
      // Level Commands
      const levelHandled = await handleLevelCommand(i);
      if (levelHandled) return;
      
      // Moderation Commands
      const modHandled = await handleModCommand(i);
      if (modHandled) return;
    }
    
    // Embed Builder Interactions
    const ebHandled = await handleEmbedBuilder(i);
    if (ebHandled !== false) return;
    
    // Daily Rewards Buttons
    if (i.customId && i.customId.startsWith("daily_claim_")) {
      await handleDailyButton(i);
      return;
    }
    
    // Blackjack Buttons
    if (i.customId && (i.customId === "bj_hit" || i.customId === "bj_stand" || i.customId === "bj_double" || i.customId === "bj_surrender")) {
      await handleBlackjackButton(i, client);
      return;
    }
    
    // High/Low Buttons
    if (i.customId && (i.customId === "hl_higher" || i.customId === "hl_lower" || i.customId === "hl_cashout")) {
      await handleHighLowButton(i, client);
      return;
    }
    
    // Race Buttons
    if (i.customId && i.customId.startsWith("race_")) {
      await handleRaceButton(i, client);
      return;
    }
    
    // Daily Spin Button
    if (i.customId === "daily_spin") {
      await handleDailySpinButton(i);
      return;
    }
    
    // Investment Buttons
    if (i.customId && (i.customId === "invest_confirm" || i.customId === "invest_cancel")) {
      await handleInvestmentButton(i, client);
      return;
    }
    
    // Giveaway Draw Button
    if (i.customId === "giveaway_draw") {
      await handleGiveawayDraw(i);
      return;
    }
    
    // Show Quest Buttons
    if (i.customId && (i.customId === "show_daily_quests" || i.customId === "show_weekly_quests")) {
      await handleQuestButton(i, client);
      return;
    }
    
    // Quest Claim Buttons
    if (i.customId && (i.customId.startsWith("claim_daily_") || i.customId.startsWith("claim_weekly_"))) {
      await handleQuestClaim(i, client);
      return;
    }
    
    // Ticket Interactions
    await handleTicketInteraction(i, client);
  } catch (e) {
    console.error("Interaction Fehler:", e);
    log(client, "ERROR", "Interaction Fehler", e && e.message ? e.message : String(e));
  }
});

// Reaction Listener
client.on("messageReactionAdd", async function(reaction, user) {
  try {
    if (reaction.partial) await reaction.fetch();
    await handleReaction(reaction, user, client);
    await handleGiveawayReaction(reaction, user, client);
  } catch(e) {
    console.error("Reaction Fehler:", e);
  }
});

client.login(TOKEN);
