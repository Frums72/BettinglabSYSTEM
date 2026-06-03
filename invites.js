const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

// Invite-Code Cache (guild.id -> Map<code, uses>)
const cache = new Map();

const TEAM_ROLE_ID = "963870711678640188";
const COLOR        = 0xE67E22;
const IMAGE        = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";

// ─── DB Helpers ──────────────────────────────────────────────────────────────

async function getUser(userId) {
  const { data } = await supabase
    .from("invites")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data || { user_id: userId, normal: 0, betlab: 0 };
}

async function saveUser(userId, normal, betlab) {
  await supabase.from("invites").upsert(
    { user_id: userId, normal, betlab },
    { onConflict: "user_id" }
  );
}

async function getAllUsers() {
  const { data } = await supabase.from("invites").select("*");
  return data || [];
}

// ─── Atomare Increment/Decrement Funktionen (kein Race Condition) ─────────────

async function incrementNormal(userId) {
  await supabase.rpc("increment_normal_invites", { uid: userId });
}

async function decrementNormal(userId) {
  await supabase.rpc("decrement_normal_invites", { uid: userId });
}

// ─── DB-persisted JoinTracker (survives bot restarts) ────────────────────────

async function saveJoinTrack(memberId, inviterId, code) {
  await supabase.from("join_tracker").upsert({
    member_id:  memberId,
    inviter_id: inviterId,
    code:       code,
    joined_at:  new Date().toISOString()
  });
}

async function getJoinTrack(memberId) {
  const { data } = await supabase
    .from("join_tracker")
    .select("*")
    .eq("member_id", memberId)
    .single();
  return data || null;
}

async function deleteJoinTrack(memberId) {
  await supabase.from("join_tracker").delete().eq("member_id", memberId);
}

// ─── Invite Cache ─────────────────────────────────────────────────────────────

async function cacheInvites(guild) {
  const invites = await guild.invites.fetch().catch(function() { return null; });
  if (!invites) {
    return;
  }
  cache.set(guild.id, new Map(invites.map(function(i) { return [i.code, i.uses]; })));
}

// ─── Join ─────────────────────────────────────────────────────────────────────

async function handleJoin(member, client) {
  const guild = member.guild;

  const oldInvites = cache.get(guild.id);
  const newInvites = await guild.invites.fetch().catch(function() { return null; });

  if (!newInvites || !oldInvites) {
    if (newInvites) {
      cache.set(guild.id, new Map(newInvites.map(function(i) { return [i.code, i.uses]; })));
    }
    
    log(client, "WARN", "Join ohne Invite-Cache",
      "User: " + member.user.tag + " (" + member.id + ")\n" +
      "Cache vorhanden: " + !!oldInvites + " | Invites abrufbar: " + !!newInvites
    );
    return;
  }

  // Vergleich: Welcher Invite wurde benutzt?
  let used = null;
  newInvites.forEach(function(inv) {
    const oldUses = oldInvites.get(inv.code) || 0;
    if ((inv.uses || 0) > oldUses) used = inv;
  });

  // Cache aktualisieren (nach Vergleich!)
  cache.set(guild.id, new Map(newInvites.map(function(i) { return [i.code, i.uses]; })));

  if (!used || !used.inviter) {
    log(client, "WARN", "Join ohne erkennbaren Inviter",
      "User: " + member.user.tag + " (" + member.id + ")\n" +
      "Moeglicherweise Vanity-URL oder abgelaufener Link"
    );
    return;
  }

  const inviterId = used.inviter.id;

  // In DB persistieren (Bot-Restart-sicher)
  await saveJoinTrack(member.id, inviterId, used.code);

  // ✅ Atomares Increment – kein Race Condition möglich
  await incrementNormal(inviterId);

  // Aktuellen Stand für den Log holen
  const inviterData = await getUser(inviterId);

  log(client, "JOIN",
    "Mitglied beigetreten",
    "Eingeladen: " + member.user.tag + " (" + member.id + ")\n" +
    "Einlader: " + used.inviter.tag + " (" + inviterId + ")\n" +
    "Code: " + used.code + "\n" +
    "Einlader jetzt: " + inviterData.normal + " Normal / " + inviterData.betlab + " Betlab",
    used.inviter
  );
}

// ─── Leave ────────────────────────────────────────────────────────────────────

async function handleLeave(member, client) {
  const tracked = await getJoinTrack(member.id);

  if (!tracked) {
    log(client, "LEAVE",
      "Mitglied verlassen (kein Tracker-Eintrag)",
      "User: " + member.user.tag + " (" + member.id + ")\n" +
      "Kein Invite-Eintrag vorhanden – kein Abzug moeglich"
    );
    return;
  }

  // Sofort loeschen – verhindert Doppelabzug bei Race Conditions
  await deleteJoinTrack(member.id);

  const joinedAt    = new Date(tracked.joined_at);
  const stayMinutes = Math.floor((Date.now() - joinedAt.getTime()) / 60000);

  // ✅ Atomares Decrement – kein Race Condition möglich
  await decrementNormal(tracked.inviter_id);

  // Aktuellen Stand für den Log holen
  const inviterData = await getUser(tracked.inviter_id);

  log(client, "LEAVE",
    "Mitglied verlassen – Invite abgezogen",
    "User: " + member.user.tag + " (" + member.id + ")\n" +
    "Einlader ID: " + tracked.inviter_id + "\n" +
    "Code: " + tracked.code + "\n" +
    "Aufenthalt: " + stayMinutes + " Min\n" +
    "Einlader danach: " + inviterData.normal + " Normal / " + inviterData.betlab + " Betlab"
  );
}

// ─── Permission Check ─────────────────────────────────────────────────────────

function isTeam(i) {
  return i.member && i.member.roles && i.member.roles.cache.has(TEAM_ROLE_ID);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function betlabinvites(i) {
  const target = i.options.getUser("user") || i.user;
  const data   = await getUser(target.id);
  const normal = data.normal;
  const betlab = data.betlab;
  const total  = normal + (betlab * 2);

  const all    = await getAllUsers();
  const sorted = all.sort(function(a, b) {
    return (b.normal + b.betlab * 2) - (a.normal + a.betlab * 2);
  });
  const rank     = sorted.findIndex(function(u) { return u.user_id === target.id; }) + 1;
  const rankText = rank > 0 ? "#" + rank : "unranked";

  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("Invites - Uebersicht")
        .setDescription(
          "User: " + target.username + "\n\n" +
          "Normal: " + normal + "\n" +
          "BETLAB: " + betlab + " (x2 = " + (betlab * 2) + ")\n\n" +
          "Gesamtpunkte: **" + total + "**\n\n" +
          "Ranking: **" + rankText + "**"
        )
        .setImage(IMAGE)
    ],
    flags: 64
  });
}

async function betlabranking(i) {
  const all    = await getAllUsers();
  const sorted = all
    .map(function(u) {
      return {
        user_id: u.user_id,
        normal:  u.normal  || 0,
        betlab:  u.betlab  || 0,
        total:   (u.normal || 0) + ((u.betlab || 0) * 2)
      };
    })
    .sort(function(a, b) { return b.total - a.total; })
    .slice(0, 5);

  const medals = ["1.", "2.", "3.", "4.", "5."];
  let desc = "";
  for (let idx = 0; idx < sorted.length; idx++) {
    const u = sorted[idx];
    let username = "Unbekannt";
    try { username = (await i.client.users.fetch(u.user_id)).username; } catch(e) {}
    desc += medals[idx] + " **" + username + "**\n";
    desc += "Normal: " + u.normal + "\n";
    desc += "BETLAB: " + u.betlab + " (x2 = " + (u.betlab * 2) + ")\n";
    desc += "Gesamtpunkte: **" + u.total + "**\n\n";
  }

  return i.reply({
    embeds: [new EmbedBuilder().setColor(COLOR).setTitle("Invite Ranking").setDescription(desc).setImage(IMAGE)],
    flags: 64
  });
}

async function betlabhelp(i) {
  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("📋 BETLAB COMMANDS")
        .setDescription(
          "**🎫 System**\n" +
          "`/betlabsend` - Embed Builder\n" +
          "`/betlabsendticketpanel` - Ticket Panel senden\n\n" +
          
          "**👥 Invites**\n" +
          "`/betlabinvites [user]` - Invite Stats anzeigen\n" +
          "`/betlabranking` - Top 5 Invite Ranking\n" +
          "`/betlabsendbetlab <user> <amount>` - Betlab Invites vergeben\n" +
          "`/betlabinvitesedit <user> <type> <amount>` - Invites setzen\n" +
          "`/betlabinviteclear <user>` - Invites zurücksetzen\n\n" +
          
          "**🏆 Level & Coins**\n" +
          "`/betlabxp [user]` - XP und Level anzeigen\n" +
          "`/betlabcoins [user]` - Coins anzeigen\n" +
          "`/betlableaderboard` - Level Ranking Top 10\n" +
          "`/betlabcoinflip <anzahl>` - Coinflip spielen\n" +
          "`/betlabcf <anzahl>` - Coinflip (Kurzform)\n" +
          "`/betlabeditcoins <user> <anzahl>` - Coins setzen (Team)\n" +
          "`/betlabeditxp <user> <anzahl>` - XP setzen (Team)\n\n" +
          
          "**🛡️ Moderation**\n" +
          "`/betlabban <user> [grund]` - User bannen\n" +
          "`/betlabunban <userid> [grund]` - User entbannen\n" +
          "`/betlabkick <user> [grund]` - User kicken\n" +
          "`/betlabtimeout <user> <dauer> [grund]` - User timeouten\n" +
          "`/betlabuntimeout <user>` - Timeout aufheben\n" +
          "`/betlabwarn <user> <grund>` - User verwarnen\n" +
          "`/betlabclearchat <anzahl>` - Nachrichten löschen\n\n" +
          
          "💡 **Level System:** Schreibe Nachrichten um XP zu sammeln!\n" +
          "🪙 **Coins:** Du erhältst 1 Coin pro Level-Up!"
        )
        .setImage(IMAGE)
        .setFooter({ text: "BETLAB Bot v2.0 • Level & Coins System" })
    ],
    flags: 64
  });
}

async function betlabsendbetlab(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabsendbetlab ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }
  
  await i.deferReply({ flags: 64 });
  const user   = i.options.getUser("user");
  const amount = i.options.getInteger("amount");
  const data   = await getUser(user.id);
  await saveUser(user.id, data.normal, data.betlab + amount);
  
  log(i.client, "INVITE", "Betlab Invites vergeben",
    "User: " + user.tag + " (" + user.id + ")\n" +
    "+" + amount + " Betlab-Invites\n" +
    "Neuer Stand: " + data.normal + " Normal / " + (data.betlab + amount) + " Betlab",
    i.user
  );
  
  return i.editReply("+" + amount + " Betlab-Invites an " + user.username + " vergeben.");
}

async function betlabinvitesedit(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabinvitesedit ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }
  
  await i.deferReply({ flags: 64 });
  const user   = i.options.getUser("user");
  const type   = i.options.getString("type");
  const amount = i.options.getInteger("amount");
  const data   = await getUser(user.id);
  const oldVal = type === "normal" ? data.normal : data.betlab;
  const normal = type === "normal" ? amount : data.normal;
  const betlab = type === "betlab" ? amount : data.betlab;
  await saveUser(user.id, normal, betlab);
  
  log(i.client, "INVITE", "Invites manuell bearbeitet",
    "User: " + user.tag + " (" + user.id + ")\n" +
    "Typ: " + type + "\n" +
    "Vorher: " + oldVal + " -> Nachher: " + amount,
    i.user
  );
  
  return i.editReply(type + " Invites von " + user.username + " auf " + amount + " gesetzt.");
}

async function betlabinviteclear(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabinviteclear ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }
  
  await i.deferReply({ flags: 64 });
  const user = i.options.getUser("user");
  const old  = await getUser(user.id);
  await saveUser(user.id, 0, 0);
  
  log(i.client, "INVITE", "Invites zurueckgesetzt",
    "User: " + user.tag + " (" + user.id + ")\n" +
    "Vorher: " + old.normal + " Normal / " + old.betlab + " Betlab -> 0 / 0",
    i.user
  );
  
  return i.editReply("Invites von " + user.username + " zurueckgesetzt.");
}

async function betlabclearchat(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabclearchat ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }
  
  const anzahl = i.options.getInteger("anzahl");
  await i.deferReply({ flags: 64 });
  const deleted = await i.channel.bulkDelete(anzahl, true).catch(function() { return null; });
  
  if (!deleted) return i.editReply("Fehler. Nachrichten aelter als 14 Tage koennen nicht geloescht werden.");
  
  log(i.client, "MOD", "Chat geleert",
    "Channel: #" + i.channel.name + " (" + i.channel.id + ")\n" +
    "Geloescht: " + deleted.size + " Nachrichten",
    i.user
  );
  
  return i.editReply(deleted.size + " Nachrichten geloescht.");
}

async function betlabsendticketpanel(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabsendticketpanel ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }
  
  const { sendPanel } = require("./tickets");
  await i.deferReply({ flags: 64 });
  await sendPanel(i.channel);
  
  log(i.client, "INFO", "Ticket Panel gesendet",
    "Channel: #" + i.channel.name + " (" + i.channel.id + ")",
    i.user
  );
  
  return i.editReply("Ticket Panel gesendet.");
}

// ─── Command Router ───────────────────────────────────────────────────────────

async function handleCommand(i, client) {
  const name = i.commandName;
  if (name === "betlabhelp")             { betlabhelp(i);             return true; }
  if (name === "betlabinvites")          { betlabinvites(i);          return true; }
  if (name === "betlabranking")          { betlabranking(i);          return true; }
  if (name === "betlabsendbetlab")       { betlabsendbetlab(i);       return true; }
  if (name === "betlabinvitesedit")      { betlabinvitesedit(i);      return true; }
  if (name === "betlabinviteclear")      { betlabinviteclear(i);      return true; }
  if (name === "betlabclearchat")        { betlabclearchat(i);        return true; }
  if (name === "betlabsendticketpanel")  { betlabsendticketpanel(i);  return true; }
  return false;
}

module.exports = { cacheInvites, handleJoin, handleLeave, handleCommand };
