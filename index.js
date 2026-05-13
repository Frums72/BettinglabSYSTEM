const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const { cacheInvites, handleJoin, handleLeave, handleCommand } = require("./invites");
const { handleInteraction, restoreTicketsOnStartup } = require("./tickets");
const { log } = require("./logger");
const { updateStats } = require("./stats");
const { startEmbedBuilder, handleEmbedBuilder } = require("./embedbuilder");
const { handleMessage } = require("./automod");

const TOKEN     = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent   // Fuer Automod (Nachrichteninhalt lesen)
  ]
});

const commands = [
  new SlashCommandBuilder().setName("betlabhelp").setDescription("Alle Commands anzeigen"),
  new SlashCommandBuilder().setName("betlabsend").setDescription("Embed Builder"),
  new SlashCommandBuilder().setName("betlabsendticketpanel").setDescription("Ticket Panel senden"),
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
    console.log("Commands registriert");
  } catch (e) { console.error("Commands fehlgeschlagen:", e); }
})();

client.once("clientReady", async function() {
  console.log("Online als " + client.user.tag);
  for (const guild of client.guilds.cache.values()) {
    await cacheInvites(guild);
    await updateStats(guild, client);
    // NEU: Tickets nach Restart wiederherstellen
    await restoreTicketsOnStartup(guild, client);
  }
  log(client, "SUCCESS", "Bot gestartet", "Tag: " + client.user.tag);
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

// Automod: jede Nachricht pruefen
client.on("messageCreate", async function(message) {
  try {
    await handleMessage(message, client);
  } catch(e) {
    console.error("Automod Fehler:", e);
    log(client, "ERROR", "Automod Fehler", e && e.message ? e.message : String(e));
  }
});

client.on("interactionCreate", async function(i) {
  try {
    if (i.isChatInputCommand()) {
      if (i.commandName === "betlabsend") return startEmbedBuilder(i);
      const handled = await handleCommand(i, client);
      if (handled) return;
    }
    const ebHandled = await handleEmbedBuilder(i);
    if (ebHandled !== false) return;
    await handleInteraction(i, client);
  } catch (e) {
    console.error("Interaction Fehler:", e);
    log(client, "ERROR", "Interaction Fehler", e && e.message ? e.message : String(e));
  }
});

client.login(TOKEN);
