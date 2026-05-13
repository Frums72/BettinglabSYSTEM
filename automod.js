// ─── automod.js ───────────────────────────────────────────────────────────────
// Spam- und Link-Schutz. Kein Drittanbieter noetig.

const { log } = require("./logger");

// ─── Config ───────────────────────────────────────────────────────────────────

// Rollen-IDs die vom Automod ausgenommen sind (Team etc.)
const EXEMPT_ROLES = ["963870711678640188"];

// Spam: wie viele Nachrichten in wie vielen Sekunden?
const SPAM_THRESHOLD = 5;   // Nachrichten
const SPAM_WINDOW_MS = 5000; // 5 Sekunden

// Timeout-Dauer bei Verstoessen (Millisekunden)
const TIMEOUT_SPAM_MS  = 5  * 60 * 1000; // 5 Min
const TIMEOUT_LINKS_MS = 10 * 60 * 1000; // 10 Min

// Link-/Invite-Pattern
const LINK_PATTERN   = /https?:\/\/\S+|www\.\S+/i;
const INVITE_PATTERN = /discord\.gg\/\S+|discord\.com\/invite\/\S+/i;

// Kanaele in denen Links erlaubt sind (Channel-IDs)
const LINK_ALLOWED_CHANNELS = [];

// ─── State ────────────────────────────────────────────────────────────────────

// userId -> [timestamp, timestamp, ...]
const spamTracker = new Map();

// FIX: Cleanup alle 15s statt 60s (verhindert RAM-Probleme bei vielen Usern)
setInterval(function() {
  const now = Date.now();
  const limit = 1000; // Max 1000 User im Tracker
  
  // Alte Eintraege entfernen
  spamTracker.forEach(function(times, userId) {
    const recent = times.filter(function(t) { return now - t < SPAM_WINDOW_MS; });
    if (recent.length === 0) {
      spamTracker.delete(userId);
    } else {
      spamTracker.set(userId, recent);
    }
  });
  
  // Wenn Map zu gross: aelteste Eintraege loeschen
  if (spamTracker.size > limit) {
    const entries = Array.from(spamTracker.entries());
    const toDelete = entries
      .sort(function(a, b) {
        const aOldest = Math.min(...a[1]);
        const bOldest = Math.min(...b[1]);
        return aOldest - bOldest;
      })
      .slice(0, spamTracker.size - limit);
    
    toDelete.forEach(function(entry) {
      spamTracker.delete(entry[0]);
    });
  }
}, 15000); // 15 Sekunden

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExempt(member) {
  if (!member) return false;
  for (const roleId of EXEMPT_ROLES) {
    if (member.roles.cache.has(roleId)) return true;
  }
  return false;
}

async function timeoutMember(member, durationMs, reason, client, message) {
  try {
    await member.timeout(durationMs, reason);
  } catch(e) {
    log(client, "WARN", "Timeout fehlgeschlagen", "User: " + member.user.tag + "\nGrund: " + e.message);
    return;
  }
  try { await message.delete(); } catch(e) {}
  try {
    await message.channel.send({
      content: "<@" + member.id + "> wurde fuer " + Math.round(durationMs / 60000) + " Min getimeouted: **" + reason + "**"
    }).then(function(msg) {
      setTimeout(function() { msg.delete().catch(function() {}); }, 8000);
    });
  } catch(e) {}
  
  // Log mit Nachrichteninhalt
  log(client, "MOD", "Automod - " + reason,
    "User: " + member.user.tag + " (" + member.user.id + ")\n" +
    "Channel: #" + message.channel.name + "\n" +
    "Timeout: " + Math.round(durationMs / 60000) + " Min\n" +
    "Nachricht: " + message.content.substring(0, 200)
  );
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

async function handleMessage(message, client) {
  // Bots ignorieren
  if (message.author.bot) return;
  // DMs ignorieren
  if (!message.guild) return;

  const member = message.member;
  if (!member) return;

  // Exempt-Rollen ignorieren
  if (isExempt(member)) return;

  const content = message.content || "";
  const now     = Date.now();

  // ── 1. Discord-Invite-Links ─────────────────────────────────────────────────
  if (INVITE_PATTERN.test(content)) {
    log(client, "MOD", "Discord-Invite-Link blockiert",
      "User: " + message.author.tag + " (" + message.author.id + ")\n" +
      "Channel: #" + message.channel.name + "\n" +
      "Nachricht: " + content.substring(0, 200)
    );
    await timeoutMember(member, TIMEOUT_LINKS_MS, "Discord Invite-Link", client, message);
    return;
  }

  // ── 2. Externe Links ────────────────────────────────────────────────────────
  if (LINK_PATTERN.test(content)) {
    const channelAllowed = LINK_ALLOWED_CHANNELS.includes(message.channel.id);
    if (!channelAllowed) {
      log(client, "MOD", "Link blockiert",
        "User: " + message.author.tag + " (" + message.author.id + ")\n" +
        "Channel: #" + message.channel.name + "\n" +
        "Nachricht: " + content.substring(0, 200)
      );
      await timeoutMember(member, TIMEOUT_LINKS_MS, "Kein Link-Posting erlaubt", client, message);
      return;
    }
  }

  // ── 3. Spam-Erkennung ───────────────────────────────────────────────────────
  const times = spamTracker.get(message.author.id) || [];
  const recent = times.filter(function(t) { return now - t < SPAM_WINDOW_MS; });
  recent.push(now);
  spamTracker.set(message.author.id, recent);

  if (recent.length >= SPAM_THRESHOLD) {
    spamTracker.delete(message.author.id); // Reset nach Aktion
    log(client, "MOD", "Spam erkannt",
      "User: " + message.author.tag + " (" + message.author.id + ")\n" +
      "Channel: #" + message.channel.name + "\n" +
      recent.length + " Nachrichten in " + SPAM_WINDOW_MS / 1000 + "s"
    );
    await timeoutMember(member, TIMEOUT_SPAM_MS, "Spam", client, message);
    return;
  }
}

module.exports = { handleMessage };
