const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const DAILY_CHANNEL = "1504227532667355305";
const LEVELUP_CHANNEL = "1504133135468728533";

const QUEST_TYPES = {
  // Original
  messages: { name: "Nachrichten schreiben", l: 10, m: 30, h: 100, wl: 200, wm: 500, wh: 1000 },
  xp: { name: "XP sammeln", l: 100, m: 300, h: 1000, wl: 2000, wm: 5000, wh: 10000 },
  reactions: { name: "Reactions geben", l: 5, m: 15, h: 50, wl: 100, wm: 250, wh: 500 },
  coinflips: { name: "Coinflips spielen", l: 3, m: 10, h: 25, wl: 50, wm: 150, wh: 300 },
  invites: { name: "Spieler einladen", l: 1, m: 3, h: 10, wl: 5, wm: 15, wh: 30 },
  
  // Gambling Games
  dice_games: { name: "Dice spielen", l: 3, m: 10, h: 20, wl: 30, wm: 80, wh: 150 },
  blackjack_games: { name: "Blackjack spielen", l: 2, m: 8, h: 15, wl: 20, wm: 50, wh: 100 },
  highlow_games: { name: "High/Low spielen", l: 2, m: 8, h: 15, wl: 20, wm: 50, wh: 100 },
  race_games: { name: "Race spielen", l: 2, m: 8, h: 15, wl: 20, wm: 50, wh: 100 },
  
  // Gambling Wins
  coinflip_wins: { name: "Coinflips gewinnen", l: 2, m: 5, h: 15, wl: 20, wm: 50, wh: 120 },
  dice_wins: { name: "Dice gewinnen", l: 1, m: 3, h: 8, wl: 10, wm: 25, wh: 60 },
  blackjack_wins: { name: "Blackjack gewinnen", l: 1, m: 5, h: 10, wl: 15, wm: 35, wh: 70 },
  
  // Gambling Totals
  coins_gambled: { name: "Coins gamblen", l: 100, m: 500, h: 2000, wl: 5000, wm: 15000, wh: 40000 },
  coins_won: { name: "Coins gewinnen", l: 50, m: 250, h: 1000, wl: 2500, wm: 7500, wh: 20000 },
  
  // Investment
  invest_coins: { name: "Coins investieren", l: 100, m: 500, h: 2000, wl: 5000, wm: 15000, wh: 40000 },
  invest_shop: { name: "In Shop investieren", l: 1, m: 3, h: 8, wl: 10, wm: 25, wh: 50 },
  invest_fabrik: { name: "In Fabrik investieren", l: 1, m: 3, h: 8, wl: 10, wm: 25, wh: 50 },
  invest_casino: { name: "In Casino investieren", l: 1, m: 3, h: 8, wl: 10, wm: 25, wh: 50 },
  
  // Daily Systems
  daily_rewards_claimed: { name: "Daily Rewards abholen", l: 1, m: 3, h: 7, wl: 5, wm: 7, wh: 7 },
  daily_spins: { name: "Daily Spins drehen", l: 1, m: 3, h: 7, wl: 5, wm: 7, wh: 7 },
  
  // Taxes & Jackpot
  tax_paid: { name: "Steuer zahlen", l: 5, m: 20, h: 50, wl: 100, wm: 300, wh: 700 },
  
  // Streaks
  coinflip_streak: { name: "Coinflip Streak erreichen", l: 2, m: 3, h: 5, wl: 5, wm: 8, wh: 12 },
  highlow_streak: { name: "High/Low Streak erreichen", l: 3, m: 5, h: 8, wl: 8, wm: 12, wh: 18 },
  daily_streak: { name: "Daily Reward Streak haben", l: 2, m: 3, h: 5, wl: 3, wm: 5, wh: 7 },
  
  // Variety
  different_games: { name: "Verschiedene Games spielen", l: 2, m: 3, h: 5, wl: 3, wm: 4, wh: 5 },
  all_projects: { name: "In alle Projekte investieren", l: 1, m: 1, h: 1, wl: 2, wm: 3, wh: 5 }
};

let dailyMessageId = null;
let weeklyMessageId = null;

async function generateDailyQuests() {
  try {
    const today = new Date().toISOString().split("T")[0];
    console.log(`📋 Checke Daily Quests für ${today}...`);
    const { data: ex, error: checkError } = await supabase.from("daily_quests").select("*").eq("date", today).limit(1);
    if (checkError) {
      console.error("❌ Fehler beim Checken:", checkError);
      return;
    }
    if (ex && ex.length > 0) {
      console.log(`✅ Daily Quests existieren bereits (${ex.length})`);
      return;
    }
    
    console.log("🔨 Generiere neue Daily Quests...");
    const types = Object.keys(QUEST_TYPES);
    const used = new Set();
    const quests = [];
    
    for (let i = 0; i < 3; i++) {
      let t;
      do { t = types[Math.floor(Math.random() * types.length)]; } while (used.has(t));
      used.add(t);
      quests.push({ date: today, quest_type: t, difficulty: "light", requirement: QUEST_TYPES[t].l, reward_coins: 5, reward_xp: 25, description: `${QUEST_TYPES[t].name}: ${QUEST_TYPES[t].l}x` });
    }
    
    let mt;
    do { mt = types[Math.floor(Math.random() * types.length)]; } while (used.has(mt));
    used.add(mt);
    quests.push({ date: today, quest_type: mt, difficulty: "medium", requirement: QUEST_TYPES[mt].m, reward_coins: 10, reward_xp: 50, description: `${QUEST_TYPES[mt].name}: ${QUEST_TYPES[mt].m}x` });
    
    let ht;
    do { ht = types[Math.floor(Math.random() * types.length)]; } while (used.has(ht));
    quests.push({ date: today, quest_type: ht, difficulty: "hard", requirement: QUEST_TYPES[ht].h, reward_coins: 20, reward_xp: 100, description: `${QUEST_TYPES[ht].name}: ${QUEST_TYPES[ht].h}x` });
    
    const { error: insertError } = await supabase.from("daily_quests").insert(quests);
    if (insertError) {
      console.error("❌ Fehler beim Einfügen:", insertError);
      return;
    }
    console.log(`✅ ${quests.length} Daily Quests generiert!`);
  } catch(e) {
    console.error("❌ Generate Daily Quests Error:", e);
  }
}

async function generateWeeklyQuests() {
  try {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - now.getDay() + 1);
    const ws = mon.toISOString().split("T")[0];
    
    console.log(`📅 Checke Weekly Quests für Woche ${ws}...`);
    const { data: ex, error: checkError } = await supabase.from("weekly_quests").select("*").eq("week_start", ws).limit(1);
    if (checkError) {
      console.error("❌ Fehler beim Checken:", checkError);
      return;
    }
    if (ex && ex.length > 0) {
      console.log(`✅ Weekly Quests existieren bereits (${ex.length})`);
      return;
    }
    
    console.log("🔨 Generiere neue Weekly Quests...");
    const types = Object.keys(QUEST_TYPES);
    const used = new Set();
    const quests = [];
    
    for (let i = 0; i < 5; i++) {
      let t;
      do { t = types[Math.floor(Math.random() * types.length)]; } while (used.has(`l_${t}`));
      used.add(`l_${t}`);
      quests.push({ week_start: ws, quest_type: t, difficulty: "light", requirement: QUEST_TYPES[t].wl, reward_coins: 10, reward_xp: 50, description: `${QUEST_TYPES[t].name}: ${QUEST_TYPES[t].wl}x` });
    }
    
    for (let i = 0; i < 3; i++) {
      let t;
      do { t = types[Math.floor(Math.random() * types.length)]; } while (used.has(`m_${t}`));
      used.add(`m_${t}`);
      quests.push({ week_start: ws, quest_type: t, difficulty: "medium", requirement: QUEST_TYPES[t].wm, reward_coins: 25, reward_xp: 100, description: `${QUEST_TYPES[t].name}: ${QUEST_TYPES[t].wm}x` });
    }
    
    for (let i = 0; i < 2; i++) {
      let t;
      do { t = types[Math.floor(Math.random() * types.length)]; } while (used.has(`h_${t}`));
      used.add(`h_${t}`);
      quests.push({ week_start: ws, quest_type: t, difficulty: "hard", requirement: QUEST_TYPES[t].wh, reward_coins: 50, reward_xp: 250, description: `${QUEST_TYPES[t].name}: ${QUEST_TYPES[t].wh}x` });
    }
    
    const { error: insertError } = await supabase.from("weekly_quests").insert(quests);
    if (insertError) {
      console.error("❌ Fehler beim Einfügen:", insertError);
      return;
    }
    console.log(`✅ ${quests.length} Weekly Quests generiert!`);
  } catch(e) {
    console.error("❌ Generate Weekly Quests Error:", e);
  }
}

async function postDailyQuests(client) {
  console.log("📋 Poste Daily Quests...");
  await generateDailyQuests();
  
  const ch = client.channels.cache.get(DAILY_CHANNEL) || await client.channels.fetch(DAILY_CHANNEL);
  if (!ch) return;
  
  // Channel leeren vor neuem Post
  try {
    const msgs = await ch.messages.fetch({ limit: 100 });
    await ch.bulkDelete(msgs, true);
  } catch(e) { console.log("⚠️ Konnte Channel nicht leeren:", e.message); }
  
  // Countdown bis Mitternacht (UTC)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  const diff = tomorrow - now;
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📋 Daily Quests")
    .setDescription(`**Klicke auf den Button um deine Quests zu sehen!**\n\nJeder sieht nur seine eigenen Aufgaben.\nUpdates automatisch alle 3 Minuten.\n\n⏰ **Neue Quests in:** ${hours}h ${minutes}min`)
    .setFooter({ text: "Nur du siehst deinen Fortschritt!" });
  
  const btn = new ButtonBuilder()
    .setCustomId("show_daily_quests")
    .setLabel("📋 Meine Daily Quests")
    .setStyle(ButtonStyle.Primary);
  
  const row = new ActionRowBuilder().addComponents(btn);
  
  const msg = await ch.send({ embeds: [embed], components: [row] });
  dailyMessageId = msg.id;
}

async function postWeeklyQuests(client) {
  console.log("📅 Poste Weekly Quests...");
  await generateWeeklyQuests();
  
  const ch = client.channels.cache.get(DAILY_CHANNEL) || await client.channels.fetch(DAILY_CHANNEL);
  if (!ch) return;
  
  // Prüfen ob diese Woche schon eine Weekly Quest gepostet wurde
  try {
    const msgs = await ch.messages.fetch({ limit: 20 });
    const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
    const weeklyExists = msgs.some(m => 
      m.author.bot && m.embeds.length > 0 && 
      m.embeds[0].title && m.embeds[0].title.includes("WEEKLY") &&
      m.createdTimestamp > sixDaysAgo
    );
    if (weeklyExists) {
      console.log("⏭️ Weekly Quest bereits diese Woche gepostet, überspringe");
      return;
    }
  } catch(e) { console.log("⚠️ Weekly-Check Fehler:", e.message); }
  
  // Channel leeren vor neuem Post
  try {
    const msgs = await ch.messages.fetch({ limit: 100 });
    await ch.bulkDelete(msgs, true);
  } catch(e) { console.log("⚠️ Konnte Channel nicht leeren:", e.message); }
  
  // Countdown bis nächsten Montag 00:00 UTC
  const now = new Date();
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  const diff = nextMonday - now;
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);
  const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
  
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle("📅 Weekly Quests")
    .setDescription(`**Klicke auf den Button um deine Quests zu sehen!**\n\nJeder sieht nur seine eigenen Aufgaben.\nUpdates automatisch alle 3 Minuten.\n\n⏰ **Neue Woche in:** ${days}d ${hours}h`)
    .setFooter({ text: "Nur du siehst deinen Fortschritt!" });
  
  const btn = new ButtonBuilder()
    .setCustomId("show_weekly_quests")
    .setLabel("📅 Meine Weekly Quests")
    .setStyle(ButtonStyle.Primary);
  
  const row = new ActionRowBuilder().addComponents(btn);
  
  const msg = await ch.send({ embeds: [embed], components: [row] });
  weeklyMessageId = msg.id;
}

async function showQuests(i, type) {
  const isDaily = type === "daily";
  const today = isDaily ? new Date().toISOString().split("T")[0] : null;
  const ws = !isDaily ? (() => { const n = new Date(); const m = new Date(n); m.setDate(n.getDate() - n.getDay() + 1); return m.toISOString().split("T")[0]; })() : null;
  
  const qTable = isDaily ? "daily_quests" : "weekly_quests";
  const pTable = isDaily ? "daily_quest_progress" : "weekly_quest_progress";
  const filter = isDaily ? { date: today } : { week_start: ws };
  
  const { data: quests } = await supabase.from(qTable).select("*").match(filter);
  if (!quests || quests.length === 0) {
    return i.reply({ content: "❌ Keine Quests gefunden!", flags: 64 });
  }
  
  let desc = isDaily 
    ? "**📋 Deine Daily Quests**\n\n"
    : "**📅 Deine Weekly Quests**\n\n";
  
  const rows = [];
  let allCompleted = true;
  
  for (const q of quests) {
    const { data: p } = await supabase.from(pTable).select("*").eq("user_id", i.user.id).eq("quest_id", q.id).single();
    const progress = p ? p.progress : 0;
    const completed = p ? p.completed : false;
    const claimed = p ? p.claimed : false;
    
    if (!claimed) allCompleted = false;
    
    const emoji = q.difficulty === "light" ? "🟢" : q.difficulty === "medium" ? "🟡" : "🔴";
    const status = claimed ? "✅" : completed ? "🎁" : "📝";
    
    desc += `${status} ${emoji} **${q.description}**\n`;
    desc += `└ **${progress}/${q.requirement}** | ${q.reward_coins} Coins + ${q.reward_xp} XP\n\n`;
    
    const btn = new ButtonBuilder()
      .setCustomId(`claim_${type}_${q.id}`)
      .setLabel(q.description.split(":")[0].substring(0, 20))
      .setStyle(completed && !claimed ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!completed || claimed);
    
    if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
    else if (rows[rows.length - 1].components.length < 5) rows[rows.length - 1].addComponents(btn);
    else rows.push(new ActionRowBuilder().addComponents(btn));
  }
  
  const bonusReady = allCompleted && quests.length === (isDaily ? 5 : 10);
  const bonusBtn = new ButtonBuilder()
    .setCustomId(`claim_${type}_bonus`)
    .setLabel("🎁 BONUS")
    .setStyle(bonusReady ? ButtonStyle.Primary : ButtonStyle.Secondary)
    .setDisabled(!bonusReady);
  rows.push(new ActionRowBuilder().addComponents(bonusBtn));
  
  desc += isDaily 
    ? "**🎁 Alle:** 15 Coins + 100 XP + 10% Boost (2h)"
    : "**🎁 Alle:** 50 Coins + 500 XP + 25% Boost (12h)";
  
  const embed = new EmbedBuilder()
    .setColor(isDaily ? 0x5865F2 : 0x9B59B6)
    .setTitle(isDaily ? "📋 Daily Quests" : "📅 Weekly Quests")
    .setDescription(desc)
    .setFooter({ text: "Grün = Abholbereit! | 📝 = In Progress | ✅ = Erledigt" });
  
  return i.reply({ embeds: [embed], components: rows, flags: 64 });
}

async function trackProgress(userId, type, amount = 1) {
  const today = new Date().toISOString().split("T")[0];
  const { data: dq } = await supabase.from("daily_quests").select("*").eq("date", today).eq("quest_type", type);
  
  if (dq) {
    for (const q of dq) {
      const { data: p } = await supabase.from("daily_quest_progress").select("*").eq("user_id", userId).eq("quest_id", q.id).single();
      if (!p) {
        await supabase.from("daily_quest_progress").insert({ user_id: userId, quest_id: q.id, progress: amount, completed: amount >= q.requirement });
      } else if (!p.completed) {
        const np = p.progress + amount;
        await supabase.from("daily_quest_progress").update({ progress: np, completed: np >= q.requirement }).eq("user_id", userId).eq("quest_id", q.id);
      }
    }
  }
  
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - now.getDay() + 1);
  const ws = mon.toISOString().split("T")[0];
  
  const { data: wq } = await supabase.from("weekly_quests").select("*").eq("week_start", ws).eq("quest_type", type);
  
  if (wq) {
    for (const q of wq) {
      const { data: p } = await supabase.from("weekly_quest_progress").select("*").eq("user_id", userId).eq("quest_id", q.id).single();
      if (!p) {
        await supabase.from("weekly_quest_progress").insert({ user_id: userId, quest_id: q.id, progress: amount, completed: amount >= q.requirement });
      } else if (!p.completed) {
        const np = p.progress + amount;
        await supabase.from("weekly_quest_progress").update({ progress: np, completed: np >= q.requirement }).eq("user_id", userId).eq("quest_id", q.id);
      }
    }
  }
}

async function handleQuestButton(i, client) {
  if (i.customId === "show_daily_quests") {
    return showQuests(i, "daily");
  } else if (i.customId === "show_weekly_quests") {
    return showQuests(i, "weekly");
  }
}

async function handleQuestClaim(i, client) {
  const parts = i.customId.split("_");
  const type = parts[1];
  const questId = parts[2] === "bonus" ? null : parseInt(parts[2]);
  
  if (questId) {
    const table = type === "daily" ? "daily_quests" : "weekly_quests";
    const pTable = type === "daily" ? "daily_quest_progress" : "weekly_quest_progress";
    
    const { data: q } = await supabase.from(table).select("*").eq("id", questId).single();
    const { data: p } = await supabase.from(pTable).select("*").eq("user_id", i.user.id).eq("quest_id", questId).single();
    
    if (!p || !p.completed || p.claimed) return i.reply({ content: "❌ Quest nicht verfügbar!", flags: 64 });
    
    await supabase.from(pTable).update({ claimed: true }).eq("user_id", i.user.id).eq("quest_id", questId);
    
    const { data: lvl } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
    if (lvl) {
      await supabase.from("levels").update({ coins: lvl.coins + q.reward_coins, total_xp: lvl.total_xp + q.reward_xp }).eq("user_id", i.user.id);
    }
    
    await trackProgress(i.user.id, "coins_earn", q.reward_coins);
    
    const embed = new EmbedBuilder().setColor(0x57F287).setTitle("✅ Quest abgeschlossen!").setDescription(`🪙 **+${q.reward_coins} Coins**\n✨ **+${q.reward_xp} XP**`);
    return i.reply({ embeds: [embed], flags: 64 });
  } else {
    const bonus = type === "daily" ? { coins: 15, xp: 100, boost: 10, h: 2 } : { coins: 50, xp: 500, boost: 25, h: 12 };
    
    const today = type === "daily" ? new Date().toISOString().split("T")[0] : null;
    const ws = type === "weekly" ? (() => { const n = new Date(); const m = new Date(n); m.setDate(n.getDate() - n.getDay() + 1); return m.toISOString().split("T")[0]; })() : null;
    
    const qTable = type === "daily" ? "daily_quests" : "weekly_quests";
    const pTable = type === "daily" ? "daily_quest_progress" : "weekly_quest_progress";
    const filter = type === "daily" ? { date: today } : { week_start: ws };
    
    const { data: allQ } = await supabase.from(qTable).select("*").match(filter);
    const { data: userP } = await supabase.from(pTable).select("*").eq("user_id", i.user.id).in("quest_id", allQ.map(q => q.id));
    
    if (!userP || userP.length !== allQ.length || !userP.every(p => p.completed && p.claimed)) {
      return i.reply({ content: "❌ Erst alle Quests abholen!", flags: 64 });
    }
    
    const { data: lvl } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
    if (lvl) {
      const until = new Date();
      until.setHours(until.getHours() + bonus.h);
      await supabase.from("levels").update({ 
        coins: lvl.coins + bonus.coins, 
        total_xp: lvl.total_xp + bonus.xp,
        xp_boost: bonus.boost,
        xp_boost_until: until.toISOString()
      }).eq("user_id", i.user.id);
    }
    
    await trackProgress(i.user.id, "coins_earn", bonus.coins);
    
    const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🎊 BONUS!").setDescription(`🪙 **+${bonus.coins} Coins**\n✨ **+${bonus.xp} XP**\n⚡ **+${bonus.boost}% Boost** (${bonus.h}h!)`);
    
    try {
      const ch = client.channels.cache.get(LEVELUP_CHANNEL) || await client.channels.fetch(LEVELUP_CHANNEL);
      if (ch) await ch.send({ content: `🎊 <@${i.user.id}> hat alle ${type === "daily" ? "Daily" : "Weekly"} Quests abgeschlossen!`, embeds: [embed] });
    } catch(e) {}
    
    return i.reply({ embeds: [embed], flags: 64 });
  }
}

module.exports = { postDailyQuests, postWeeklyQuests, handleQuestButton, trackProgress, handleQuestClaim };
