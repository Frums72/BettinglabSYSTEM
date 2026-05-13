const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const { cacheInvites, handleJoin, handleLeave, handleCommand } = require("./invites");
const { handleInteraction, restoreTickets } = require("./tickets");
const { log } = require("./logger");
const { updateStats } = require("./stats");
const { startEmbedBuilder, handleEmbedBuilder } = require("./embedbuilder");
const { handleMessage } = require("./automod");
const { handleXPGain, handleLevelCommands } = require("./levels");
const { handleModerationCommands } = require("./moderation");

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
  // ─── Info & Help ───────────────────────────────────────────────────────────
  new SlashCommandBuilder().setName("betlabhelp").setDescription("Alle Commands anzeigen"),
  
  // ─── Embed & Tickets ───────────────────────────────────────────────────────
  new SlashCommandBuilder().setName("betlabsend").setDescription("Embed Builder"),
  new SlashCommandBuilder().setName("betlabsendticketpanel").setDescription("Ticket Panel senden"),
  
  // ─── Invites ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("betlabinvites")
    .setDescription("Invite-Stats anzeigen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User (optional)"); }),
  new SlashCommandBuilder().setName("betlabranking").setDescription("Top 5 Invite Ranking"),
  new SlashCommandBuilder()
    .setName("betlabinvitesedit")
    .setDescription("Invites manuell setzen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addStringOption(function(o) {
      return o.setName("type").setDescription("Typ").setRequired(true)
        .addChoices({ name: "Normal", value: "normal" }, { name: "Betlab", value: "betlab" });
    })
    .addIntegerOption(function(o) { return o.setName("amount").setDescription("Anzahl").setRequired(true); }),
  new SlashCommandBuilder()
    .setName("betlabinviteclear")
    .setDescription("Invites zuruecksetzen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); }),
  new SlashCommandBuilder()
    .setName("betlabsendbetlab")
    .setDescription("Betlab-Invites vergeben")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addIntegerOption(function(o) { return o.setName("amount").setDescription("Anzahl").setRequired(true); }),
  
  // ─── Level & Economy ───────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("betlabxp")
    .setDescription("XP Stats anzeigen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User (optional)"); }),
  new SlashCommandBuilder()
    .setName("betlabcoins")
    .setDescription("Coin Stats anzeigen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User (optional)"); }),
  new SlashCommandBuilder().setName("betlableaderboard").setDescription("Level Leaderboard - Top 10"),
  new SlashCommandBuilder()
    .setName("betlabcoinflip")
    .setDescription("Coinflip Minigame")
    .addIntegerOption(function(o) { return o.setName("anzahl").setDescription("Einsatz (Coins)").setRequired(true).setMinValue(1); }),
  new SlashCommandBuilder()
    .setName("betlabcf")
    .setDescription("Coinflip Minigame (Kurzform)")
    .addIntegerOption(function(o) { return o.setName("anzahl").setDescription("Einsatz (Coins)").setRequired(true).setMinValue(1); }),
  new SlashCommandBuilder()
    .setName("betlabeditcoins")
    .setDescription("Coins manuell setzen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addIntegerOption(function(o) { return o.setName("anzahl").setDescription("Anzahl").setRequired(true).setMinValue(0); }),
  new SlashCommandBuilder()
    .setName("betlabeditxp")
    .setDescription("XP manuell setzen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addIntegerOption(function(o) { return o.setName("anzahl").setDescription("XP").setRequired(true).setMinValue(0); }),
  
  // ─── Moderation ────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("betlabban")
    .setDescription("User bannen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addStringOption(function(o) { return o.setName("grund").setDescription("Grund"); })
    .addIntegerOption(function(o) { return o.setName("delete_messages").setDescription("Nachrichten loeschen (Tage, 0-7)").setMinValue(0).setMaxValue(7); }),
  new SlashCommandBuilder()
    .setName("betlabunban")
    .setDescription("User entbannen")
    .addStringOption(function(o) { return o.setName("user_id").setDescription("User ID").setRequired(true); })
    .addStringOption(function(o) { return o.setName("grund").setDescription("Grund"); }),
  new SlashCommandBuilder()
    .setName("betlabkick")
    .setDescription("User kicken")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addStringOption(function(o) { return o.setName("grund").setDescription("Grund"); }),
  new SlashCommandBuilder()
    .setName("betlabtimeout")
    .setDescription("User timeouten")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addIntegerOption(function(o) { return o.setName("dauer").setDescription("Dauer (Minuten)").setRequired(true).setMinValue(1).setMaxValue(40320); })
    .addStringOption(function(o) { return o.setName("grund").setDescription("Grund"); }),
  new SlashCommandBuilder()
    .setName("betlabuntimeout")
    .setDescription("Timeout aufheben")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addStringOption(function(o) { return o.setName("grund").setDescription("Grund"); }),
  new SlashCommandBuilder()
    .setName("betlabwarn")
    .setDescription("User verwarnen")
    .addUserOption(function(o) { return o.setName("user").setDescription("User").setRequired(true); })
    .addStringOption(function(o) { return o.setName("grund").setDescription("Grund").setRequired(true); }),
  
  // ─── Chat Management ───────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("betlabclearchat")
    .setDescription("Nachrichten loeschen")
    .addIntegerOption(function(o) {
      return o.setName("anzahl").setDescription("Anzahl (1-100)").setRequired(true).setMinValue(1).setMaxValue(100);
    })
].map(function(c) { return c.toJSON(); });

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async function() {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("Commands registriert (" + commands.length + " Commands)");
  } catch (e) { console.error("Commands fehlgeschlagen:", e); }
})();

client.once("clientReady", async function() {
  console.log("Online als " + client.user.tag);
  for (const guild of client.guilds.cache.values()) {
    await cacheInvites(guild);
    await updateStats(guild, client);
    await restoreTickets(guild, client);
  }
  log(client, "SUCCESS", "Bot gestartet", "Tag: " + client.user.tag + "\nCommands: " + commands.length);
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

// Automod & XP System
client.on("messageCreate", async function(message) {
  try {
    // Automod zuerst (kann Nachricht löschen)
    await handleMessage(message, client);
    // XP System (nach Automod, falls Nachricht nicht gelöscht wurde)
    await handleXPGain(message, client);
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
      
      // Command Handler (Reihenfolge wichtig!)
      const inviteHandled = await handleCommand(i, client);
      if (inviteHandled) return;
      
      const levelHandled = await handleLevelCommands(i);
      if (levelHandled) return;
      
      const modHandled = await handleModerationCommands(i);
      if (modHandled) return;
    }
    
    // Embed Builder Interactions
    const ebHandled = await handleEmbedBuilder(i);
    if (ebHandled !== false) return;
    
    // Ticket Interactions
    await handleInteraction(i, client);
  } catch (e) {
    console.error("Interaction Fehler:", e);
    log(client, "ERROR", "Interaction Fehler", e && e.message ? e.message : String(e));
  }
});

client.login(TOKEN);
