const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const COLOR = 0xE67E22;
const IMAGE = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";

// ─── XP Config ────────────────────────────────────────────────────────────────

const XP_PER_MESSAGE = { min: 15, max: 25 };  // Zufällig zwischen 15-25 XP
const XP_COOLDOWN_MS = 60000;                 // 1 Minute Cooldown zwischen XP-Gains
const COINS_PER_LEVELUP = 1;                  // 1 Coin pro Level-Up

// Level-Rollen (Level -> RoleID)
const LEVEL_ROLES = {
  5:  "ROLE_ID_LEVEL_5",    // Ersetze mit echten IDs!
  10: "ROLE_ID_LEVEL_10",
  25: "ROLE_ID_LEVEL_25",
  50: "ROLE_ID_LEVEL_50",
  75: "ROLE_ID_LEVEL_75",
  100: "ROLE_ID_LEVEL_100"
};

// XP benötigt für Level (Level -> XP Total)
function getXPForLevel(level) {
  // Formel: 100 * level^1.5 (exponentielles Wachstum)
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ─── Cooldown Tracker ─────────────────────────────────────────────────────────

const xpCooldowns = new Map(); // userId -> timestamp

// Cleanup alle 5 Minuten
setInterval(function() {
  const now = Date.now();
  xpCooldowns.forEach(function(time, userId) {
    if (now - time > XP_COOLDOWN_MS) {
      xpCooldowns.delete(userId);
    }
  });
}, 300000);

// ─── DB Helpers ───────────────────────────────────────────────────────────────

async function getUserLevel(userId) {
  const { data } = await supabase
    .from("levels")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  return data || { 
    user_id: userId, 
    xp: 0, 
    level: 1, 
    coins: 0,
    total_messages: 0
  };
}

async function saveUserLevel(userId, xp, level, coins, totalMessages) {
  await supabase.from("levels").upsert({ 
    user_id: userId, 
    xp: xp, 
    level: level, 
    coins: coins,
    total_messages: totalMessages
  });
}

async function getTopUsers(limit = 10) {
  const { data } = await supabase
    .from("levels")
    .select("*")
    .order("level", { ascending: false })
    .order("xp", { ascending: false })
    .limit(limit);
  
  return data || [];
}

// ─── XP Handler ───────────────────────────────────────────────────────────────

async function handleXPGain(message, client) {
  // Bots ignorieren
  if (message.author.bot) return;
  // DMs ignorieren
  if (!message.guild) return;

  const userId = message.author.id;
  
  // Cooldown Check
  const lastXP = xpCooldowns.get(userId);
  const now = Date.now();
  if (lastXP && (now - lastXP) < XP_COOLDOWN_MS) {
    return; // Noch im Cooldown
  }

  // XP vergeben
  const xpGain = Math.floor(Math.random() * (XP_PER_MESSAGE.max - XP_PER_MESSAGE.min + 1)) + XP_PER_MESSAGE.min;
  
  const data = await getUserLevel(userId);
  const oldLevel = data.level;
  let newXP = data.xp + xpGain;
  let newLevel = data.level;
  let newCoins = data.coins;
  const newMessages = data.total_messages + 1;

  // Level-Up Check
  while (newLevel < 100 && newXP >= getXPForLevel(newLevel + 1)) {
    newLevel++;
    newCoins += COINS_PER_LEVELUP;
  }

  // Speichern
  await saveUserLevel(userId, newXP, newLevel, newCoins, newMessages);
  xpCooldowns.set(userId, now);

  // Level-Up Nachricht & Rolle
  if (newLevel > oldLevel) {
    await handleLevelUp(message, oldLevel, newLevel, newCoins, client);
  }
}

// ─── Level-Up Handler ─────────────────────────────────────────────────────────

async function handleLevelUp(message, oldLevel, newLevel, coins, client) {
  const user = message.author;
  const member = message.member;

  // Level-Up Embed
  const xpNeeded = getXPForLevel(newLevel + 1);
  
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("🎉 LEVEL UP!")
    .setDescription(
      "**" + user.username + "** ist aufgestiegen!\n\n" +
      "🆙 Level: **" + oldLevel + " → " + newLevel + "**\n" +
      "🪙 Coins: **" + coins + "** (+1)\n" +
      "✨ XP bis Level " + (newLevel + 1) + ": **" + xpNeeded + " XP**\n\n" +
      "Weiter so! 💪"
    )
    .setThumbnail(user.displayAvatarURL())
    .setImage(IMAGE)
    .setTimestamp();

  try {
    await message.channel.send({ embeds: [embed] });
  } catch(e) {
    console.log("Konnte Level-Up Nachricht nicht senden:", e.message);
  }

  // Level-Rolle vergeben
  const roleId = LEVEL_ROLES[newLevel];
  if (roleId && member) {
    const role = message.guild.roles.cache.get(roleId);
    if (role) {
      try {
        await member.roles.add(role);
        
        log(client, "SUCCESS", "Level-Rolle vergeben",
          "User: " + user.tag + " (" + user.id + ")\n" +
          "Level: " + newLevel + "\n" +
          "Rolle: " + role.name + " (" + role.id + ")",
          user
        );
      } catch(e) {
        console.log("Konnte Level-Rolle nicht vergeben:", e.message);
      }
    }
  }

  // Logging
  log(client, "SUCCESS", "Level-Up",
    "User: " + user.tag + " (" + user.id + ")\n" +
    "Level: " + oldLevel + " → " + newLevel + "\n" +
    "Coins: " + coins + "\n" +
    "XP bis Next: " + xpNeeded,
    user
  );
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function betlabxp(i) {
  const target = i.options.getUser("user") || i.user;
  const data = await getUserLevel(target.id);
  
  const currentXP = data.xp;
  const level = data.level;
  const xpForNext = getXPForLevel(level + 1);
  const xpNeeded = xpForNext - currentXP;
  const progress = Math.floor((currentXP / xpForNext) * 100);

  // Progressbar
  const barLength = 20;
  const filled = Math.floor((progress / 100) * barLength);
  const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("📊 XP Stats")
        .setDescription(
          "**" + target.username + "**\n\n" +
          "🆙 Level: **" + level + "** / 100\n" +
          "✨ XP: **" + currentXP + "** / " + xpForNext + "\n" +
          "📈 Progress: **" + progress + "%**\n\n" +
          bar + "\n\n" +
          "🎯 Noch **" + xpNeeded + " XP** bis Level " + (level + 1) + "!\n" +
          "💬 Nachrichten: **" + data.total_messages + "**"
        )
        .setThumbnail(target.displayAvatarURL())
        .setImage(IMAGE)
    ],
    flags: 64
  });
}

async function betlabcoins(i) {
  const target = i.options.getUser("user") || i.user;
  const data = await getUserLevel(target.id);

  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("🪙 Coin Stats")
        .setDescription(
          "**" + target.username + "**\n\n" +
          "🪙 Coins: **" + data.coins + "**\n" +
          "🆙 Level: **" + data.level + "** / 100\n" +
          "✨ XP: **" + data.xp + "** / " + getXPForLevel(data.level + 1) + "\n\n" +
          "💡 Du erhältst 1 Coin pro Level-Up!"
        )
        .setThumbnail(target.displayAvatarURL())
        .setImage(IMAGE)
    ],
    flags: 64
  });
}

async function betlableaderboard(i) {
  await i.deferReply();
  
  const top = await getTopUsers(10);
  
  if (top.length === 0) {
    return i.editReply("Noch keine Daten vorhanden!");
  }

  let desc = "";
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  
  for (let idx = 0; idx < top.length; idx++) {
    const u = top[idx];
    let username = "Unbekannt";
    try {
      username = (await i.client.users.fetch(u.user_id)).username;
    } catch(e) {}
    
    desc += medals[idx] + " **" + username + "**\n";
    desc += "   Level: " + u.level + " | XP: " + u.xp + " | Coins: " + u.coins + "\n\n";
  }

  return i.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("🏆 Level Leaderboard - Top 10")
        .setDescription(desc)
        .setImage(IMAGE)
    ]
  });
}

// ─── Coinflip ─────────────────────────────────────────────────────────────────

async function betlabcoinflip(i) {
  const amount = i.options.getInteger("anzahl");
  
  if (amount <= 0) {
    return i.reply({ content: "❌ Die Anzahl muss größer als 0 sein!", flags: 64 });
  }

  const data = await getUserLevel(i.user.id);
  
  if (data.coins < amount) {
    return i.reply({ 
      content: "❌ Du hast nicht genug Coins!\n🪙 Deine Coins: **" + data.coins + "**", 
      flags: 64 
    });
  }

  // Coinflip
  const win = Math.random() < 0.5;
  const newCoins = win ? data.coins + amount : data.coins - amount;
  
  await saveUserLevel(i.user.id, data.xp, data.level, newCoins, data.total_messages);

  const embed = new EmbedBuilder()
    .setColor(win ? 0x57F287 : 0xED4245)
    .setTitle(win ? "🎉 GEWONNEN!" : "💥 VERLOREN!")
    .setDescription(
      "**Coinflip Ergebnis**\n\n" +
      "🎲 Einsatz: **" + amount + " Coins**\n" +
      (win ? "✅ Gewinn: **+" + amount + " Coins**" : "❌ Verlust: **-" + amount + " Coins**") + "\n\n" +
      "🪙 Vorher: **" + data.coins + " Coins**\n" +
      "🪙 Nachher: **" + newCoins + " Coins**"
    )
    .setThumbnail(i.user.displayAvatarURL())
    .setImage(IMAGE);

  log(i.client, "COINS", "Coinflip",
    "User: " + i.user.tag + " (" + i.user.id + ")\n" +
    "Einsatz: " + amount + "\n" +
    "Ergebnis: " + (win ? "GEWONNEN" : "VERLOREN") + "\n" +
    "Coins: " + data.coins + " → " + newCoins,
    i.user
  );

  return i.reply({ embeds: [embed] });
}

// ─── Admin Commands ───────────────────────────────────────────────────────────

async function betlabeditcoins(i) {
  const TEAM_ROLE_ID = "963870711678640188";
  
  if (!i.member || !i.member.roles.cache.has(TEAM_ROLE_ID)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabeditcoins ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  await i.deferReply({ flags: 64 });
  
  const user = i.options.getUser("user");
  const amount = i.options.getInteger("anzahl");
  
  const data = await getUserLevel(user.id);
  await saveUserLevel(user.id, data.xp, data.level, amount, data.total_messages);

  log(i.client, "COINS", "Coins bearbeitet",
    "Target: " + user.tag + " (" + user.id + ")\n" +
    "Vorher: " + data.coins + "\n" +
    "Nachher: " + amount + "\n" +
    "Bearbeitet von: " + i.user.tag,
    i.user
  );

  return i.editReply("✅ Coins von **" + user.username + "** auf **" + amount + "** gesetzt.");
}

async function betlabeditxp(i) {
  const TEAM_ROLE_ID = "963870711678640188";
  
  if (!i.member || !i.member.roles.cache.has(TEAM_ROLE_ID)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabeditxp ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  await i.deferReply({ flags: 64 });
  
  const user = i.options.getUser("user");
  const amount = i.options.getInteger("anzahl");
  
  const data = await getUserLevel(user.id);
  
  // Neues Level berechnen
  let newLevel = 1;
  while (newLevel < 100 && amount >= getXPForLevel(newLevel + 1)) {
    newLevel++;
  }
  
  await saveUserLevel(user.id, amount, newLevel, data.coins, data.total_messages);

  log(i.client, "XP", "XP bearbeitet",
    "Target: " + user.tag + " (" + user.id + ")\n" +
    "Vorher: Level " + data.level + " (" + data.xp + " XP)\n" +
    "Nachher: Level " + newLevel + " (" + amount + " XP)\n" +
    "Bearbeitet von: " + i.user.tag,
    i.user
  );

  return i.editReply("✅ XP von **" + user.username + "** auf **" + amount + " XP** gesetzt (Level: " + newLevel + ").");
}

// ─── Command Router ───────────────────────────────────────────────────────────

async function handleLevelCommands(i) {
  const name = i.commandName;
  if (name === "betlabxp")          { betlabxp(i);          return true; }
  if (name === "betlabcoins")       { betlabcoins(i);       return true; }
  if (name === "betlableaderboard") { betlableaderboard(i); return true; }
  if (name === "betlabcoinflip" || name === "betlabcf") { betlabcoinflip(i); return true; }
  if (name === "betlabeditcoins")   { betlabeditcoins(i);   return true; }
  if (name === "betlabeditxp")      { betlabeditxp(i);      return true; }
  return false;
}

module.exports = { 
  handleXPGain, 
  handleLevelCommands,
  getXPForLevel 
};
