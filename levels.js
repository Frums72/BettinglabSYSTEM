const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const COLOR = 0xE67E22;
const IMAGE = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";

const XP_PER_MESSAGE = 15;
const XP_COOLDOWN_MS = 60000;
const LEVELUP_CHANNEL_ID = "1504133135468728533";

const LEVEL_ROLES = {
  1: "1504125201074487396", 2: "1504131694301544528", 3: "1504131724802527443", 4: "1504132011227349102",
  5: "1504126007559585823", 10: "1504126112136167705", 15: "1504126199092215999", 20: "1504126254822195211",
  25: "1504126314183921896", 30: "1504126377442545704", 35: "1504126440306638930", 40: "1504126510737658069",
  45: "1504126572645322912", 50: "1504126622167601152", 55: "1504126685161722049", 60: "1504126752677560471",
  65: "1504126832210088126", 70: "1504126884827496548", 75: "1504126937969328138", 80: "1504130945731657829",
  85: "1504130989457149979", 90: "1504131013247242424", 95: "1504131034894045305", 100: "1504131068641677494"
};

function getCoinReward(level) {
  if (level === 100) return 10;
  if (level === 75 || level === 50 || level === 25) return 5;
  if (level % 5 === 0) return 2;
  return 1;
}

const xpCooldowns = new Map();

async function getUserLevel(userId) {
  const { data } = await supabase.from("levels").select("*").eq("user_id", userId).single();
  return data || { user_id: userId, xp: 0, level: 0, coins: 0, total_xp: 0 };
}

async function saveUserLevel(userId, xp, level, coins, totalXp) {
  await supabase.from("levels").upsert({ user_id: userId, xp, level, coins, total_xp: totalXp });
}

async function getTopUsers(limit = 10) {
  const { data } = await supabase.from("levels").select("*").order("total_xp", { ascending: false }).limit(limit);
  return data || [];
}

async function getTopCoins(limit = 10) {
  const { data } = await supabase.from("levels").select("*").order("coins", { ascending: false }).limit(limit);
  return data || [];
}

function getXpForLevel(level) {
  if (level <= 10) return 100;
  if (level <= 25) return 150;
  if (level <= 50) return 200;
  if (level <= 75) return 300;
  return 500;
}

function getLevelFromTotalXp(totalXp) {
  let level = 0;
  let xpNeeded = 0;
  while (level < 100 && totalXp >= xpNeeded + getXpForLevel(level + 1)) {
    xpNeeded += getXpForLevel(level + 1);
    level++;
  }
  return { level, currentXp: totalXp - xpNeeded };
}

async function handleMessage(message, client) {
  if (message.author.bot || !message.guild) return;
  const userId = message.author.id;
  const now = Date.now();
  const lastXpTime = xpCooldowns.get(userId);
  if (lastXpTime && now - lastXpTime < XP_COOLDOWN_MS) return;
  xpCooldowns.set(userId, now);
  const data = await getUserLevel(userId);
  const oldLevel = data.level;
  const newTotalXp = data.total_xp + XP_PER_MESSAGE;
  const { level: newLevel, currentXp } = getLevelFromTotalXp(newTotalXp);
  await saveUserLevel(userId, currentXp, newLevel, data.coins, newTotalXp);
  if (newLevel > oldLevel) {
    const coinsEarned = getCoinReward(newLevel);
    await handleLevelUp(message, client, oldLevel, newLevel, data.coins + coinsEarned, coinsEarned);
  }
}

async function handleLevelUp(message, client, oldLevel, newLevel, newCoins, coinsEarned) {
  const user = message.author;
  const data = await getUserLevel(user.id);
  await saveUserLevel(user.id, data.xp, newLevel, newCoins, data.total_xp);
  let bonusText = "";
  if (newLevel === 100) bonusText = "\n🎊 **MAXIMALES LEVEL! +10 BONUS!** 🎊";
  else if (newLevel === 75 || newLevel === 50 || newLevel === 25) bonusText = "\n🎁 **MILESTONE: +5 COINS!**";
  else if (newLevel % 5 === 0) bonusText = "\n⭐ **5er Milestone: +2 Coins!**";
  const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🎉 LEVEL UP!")
    .setDescription("<@" + user.id + "> ist aufgestiegen!\n\n📊 **Level:** " + oldLevel + " → **" + newLevel + "**\n🪙 **Coins:** +" + coinsEarned + " (Gesamt: **" + newCoins + "**)" + bonusText + "\n\nWeiter so! 💪")
    .setThumbnail(user.displayAvatarURL()).setImage(IMAGE).setTimestamp();
  try {
    const levelUpChannel = client.channels.cache.get(LEVELUP_CHANNEL_ID) || await client.channels.fetch(LEVELUP_CHANNEL_ID);
    if (levelUpChannel) await levelUpChannel.send({ embeds: [embed] });
  } catch (e) { await message.channel.send({ embeds: [embed] }); }
  await checkLevelRoles(message.member, newLevel, client);
  log(client, "SUCCESS", "Level Up!", "User: " + user.tag + "\nLevel: " + oldLevel + " → " + newLevel + "\nCoins: +" + coinsEarned, user);
}

async function checkLevelRoles(member, level, client) {
  if (!LEVEL_ROLES[level]) return;
  const roleId = LEVEL_ROLES[level];
  try {
    const role = member.guild.roles.cache.get(roleId);
    if (!role || member.roles.cache.has(roleId)) return;
    await member.roles.add(roleId);
    await member.send({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle("🎁 Neue Rolle!").setDescription("**Level " + level + "**\n\n**Rolle:** " + role.name).setImage(IMAGE)] }).catch(() => {});
    log(client, "SUCCESS", "Level-Rolle vergeben", "User: " + member.user.tag + "\nLevel: " + level + "\nRolle: " + role.name, member.user);
  } catch (e) { console.error("Rolle Fehler:", e); }
}

async function betlabcoins(i) {
  const target = i.options.getUser("user") || i.user;
  const data = await getUserLevel(target.id);
  const xpForNextLevel = getXpForLevel(data.level + 1);
  const xpNeeded = xpForNextLevel - data.xp;
  const progress = Math.floor((data.xp / xpForNextLevel) * 100);
  return i.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle("🪙 Coins & Level").setDescription("User: **" + target.username + "**\n\n💰 **Coins:** " + data.coins + "\n📊 **Level:** " + data.level + " / 100\n✨ **XP:** " + data.xp + " / " + xpForNextLevel + "\n🎯 **Benötigt:** " + xpNeeded + " XP\n📈 **Progress:** " + progress + "%\n\n🏆 **Total XP:** " + data.total_xp).setThumbnail(target.displayAvatarURL()).setImage(IMAGE)], flags: 64 });
}

async function betlabxp(i) {
  const target = i.options.getUser("user") || i.user;
  const data = await getUserLevel(target.id);
  const xpForNextLevel = getXpForLevel(data.level + 1);
  const xpNeeded = xpForNextLevel - data.xp;
  const progress = Math.floor((data.xp / xpForNextLevel) * 100);
  const barLength = 20;
  const filled = Math.floor((progress / 100) * barLength);
  const progressBar = "█".repeat(filled) + "░".repeat(barLength - filled);
  return i.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle("📊 XP Stats").setDescription("User: **" + target.username + "**\n\n**Level:** " + data.level + " / 100\n\n**XP:** " + data.xp + " / " + xpForNextLevel + "\n**Benötigt:** " + xpNeeded + " XP\n\n**Progress:**\n" + progressBar + " **" + progress + "%**\n\n🏆 **Total:** " + data.total_xp + "\n🪙 **Coins:** " + data.coins).setThumbnail(target.displayAvatarURL()).setImage(IMAGE)], flags: 64 });
}

async function betlabcoinflip(i) {
  const amount = i.options.getInteger("anzahl");
  const data = await getUserLevel(i.user.id);
  if (amount < 1) return i.reply({ content: "❌ Mindestens 1 Coin!", flags: 64 });
  if (amount > data.coins) return i.reply({ content: "❌ Du hast nur **" + data.coins + " Coins**!", flags: 64 });
  const won = Math.random() < 0.5;
  const newCoins = won ? data.coins + amount : data.coins - amount;
  let bonusXP = 0;
  if (won) {
    bonusXP = amount * 5;
    const newTotalXp = data.total_xp + bonusXP;
    const { level: newLevel, currentXp } = getLevelFromTotalXp(newTotalXp);
    await saveUserLevel(i.user.id, currentXp, newLevel, newCoins, newTotalXp);
  } else {
    await saveUserLevel(i.user.id, data.xp, data.level, newCoins, data.total_xp);
  }
  const embed = new EmbedBuilder().setColor(won ? 0x57F287 : 0xED4245).setTitle(won ? "🎉 GEWONNEN!" : "💔 VERLOREN!").setDescription("**Einsatz:** " + amount + " Coins\n\n" + (won ? "✅ +" + amount + " Coins!\n🎁 **Bonus:** +" + bonusXP + " XP!" : "❌ -" + amount + " Coins!") + "\n\n**Balance:** " + newCoins + " Coins").setThumbnail(i.user.displayAvatarURL()).setImage(IMAGE);
  log(i.client, "INFO", "Coinflip", "User: " + i.user.tag + "\nEinsatz: " + amount + "\nErgebnis: " + (won ? "GEWONNEN" : "VERLOREN") + (won ? "\nBonus XP: " + bonusXP : "") + "\nBalance: " + newCoins, i.user);
  return i.reply({ embeds: [embed] });
}

async function betlabeditcoins(i) {
  const TEAM_ROLE_ID = "963870711678640188";
  if (!i.member.roles.cache.has(TEAM_ROLE_ID)) {
    log(i.client, "WARN", "Unberechtigter Zugriff", "User: " + i.user.tag + " versuchte /betlabeditcoins", i.user);
    return i.reply({ content: "❌ Keine Berechtigung.", flags: 64 });
  }
  await i.deferReply({ flags: 64 });
  const target = i.options.getUser("user");
  const amount = i.options.getInteger("anzahl");
  const data = await getUserLevel(target.id);
  await saveUserLevel(target.id, data.xp, data.level, amount, data.total_xp);
  log(i.client, "COINS", "Coins editiert", "Ziel: " + target.tag + "\nVorher: " + data.coins + " → Nachher: " + amount, i.user);
  return i.editReply("✅ Coins von **" + target.username + "** auf **" + amount + "** gesetzt.");
}

async function betlabtop(i) {
  await i.deferReply();
  const top = await getTopUsers(10);
  let desc = "";
  const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];
  for (let idx = 0; idx < top.length; idx++) {
    const u = top[idx];
    let username = "Unbekannt";
    try { username = (await i.client.users.fetch(u.user_id)).username; } catch(e) {}
    desc += medals[idx] + " **" + username + "**\nLevel: " + u.level + " | XP: " + u.total_xp + "\n\n";
  }
  return i.editReply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle("🏆 TOP 10 LEVEL").setDescription(desc || "Noch keine Daten.").setImage(IMAGE)] });
}

async function betlabcointop(i) {
  await i.deferReply();
  const top = await getTopCoins(10);
  let desc = "";
  const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];
  for (let idx = 0; idx < top.length; idx++) {
    const u = top[idx];
    let username = "Unbekannt";
    try { username = (await i.client.users.fetch(u.user_id)).username; } catch(e) {}
    desc += medals[idx] + " **" + username + "**\nCoins: " + u.coins + "\n\n";
  }
  return i.editReply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle("🪙 TOP 10 COINS").setDescription(desc || "Noch keine Daten.").setImage(IMAGE)] });
}

async function handleCommand(i) {
  const name = i.commandName;
  if (name === "betlabcoins") { betlabcoins(i); return true; }
  if (name === "betlabxp") { betlabxp(i); return true; }
  if (name === "betlabcoinflip") { betlabcoinflip(i); return true; }
  if (name === "betlabeditcoins") { betlabeditcoins(i); return true; }
  if (name === "betlabtop") { betlabtop(i); return true; }
  if (name === "betlabcointop") { betlabcointop(i); return true; }
  return false;
}

module.exports = { handleMessage, handleCommand };
