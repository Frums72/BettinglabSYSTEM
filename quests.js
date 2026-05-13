const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const DAILY_CHANNEL = "1504227532667355305";
const LEVELUP_CHANNEL = "1504133135468728533";

const QUEST_TYPES = {
  messages: { name: "Nachrichten schreiben", l: 10, m: 30, h: 100, wl: 200, wm: 500, wh: 1000 },
  xp: { name: "XP sammeln", l: 100, m: 300, h: 1000, wl: 2000, wm: 5000, wh: 10000 },
  reactions: { name: "Reactions geben", l: 5, m: 15, h: 50, wl: 100, wm: 250, wh: 500 },
  coinflips: { name: "Coinflips spielen", l: 3, m: 10, h: 25, wl: 50, wm: 150, wh: 300 },
  invites: { name: "Spieler einladen", l: 1, m: 3, h: 10, wl: 5, wm: 15, wh: 30 }
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
    
    // 3 light - keine Duplikate
    for (let i = 0; i < 3; i++) {
      let t;
      do { t = types[Math.floor(Math.random() * types.length)]; } while (used.has(t));
      used.add(t);
      quests.push({ date: today, quest_type: t, difficulty: "light", requirement: QUEST_TYPES[t].l, reward_coins: 5, reward_xp: 25, description: `${QUEST_TYPES[t].name}: ${QUEST_TYPES[t].l}x` });
    }
    
    // 1 medium
    let mt;
    do { mt = types[Math.floor(Math.random() * types.length)]; } while (used.has(mt));
    used.add(mt);
    quests.push({ date: today, quest_type: mt, difficulty: "medium", requirement: QUEST_TYPES[mt].m, reward_coins: 10, reward_xp: 50, description: `${QUEST_TYPES[mt].name}: ${QUEST_TYPES[mt].m}x` });
    
    // 1 hard
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
    
    // 5 light - keine Duplikate
    for (let i = 0; i < 5; i++) {
      let t;
      do { t = types[Math.floor(Math.random() * types.length)]; } while (used.has(`l_${t}`));
      used.add(`l_${t}`);
      quests.push({ week_start: ws, quest_type: t, difficulty: "light", requirement: QUEST_TYPES[t].wl, reward_coins: 10, reward_xp: 50, description: `${QUEST_TYPES[t].name}: ${QUEST_TYPES[t].wl}x` });
    }
    
    // 3 medium
    for (let i = 0; i < 3; i++) {
      let t;
      do { t = types[Math.floor(Math.random() * types.length)]; } while (used.has(`m_${t}`));
      used.add(`m_${t}`);
      quests.push({ week_start: ws, quest_type: t, difficulty: "medium", requirement: QUEST_TYPES[t].wm, reward_coins: 25, reward_xp: 100, description: `${QUEST_TYPES[t].name}: ${QUEST_TYPES[t].wm}x` });
    }
    
    // 2 hard
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
  console.log("📋 Generiere Daily Quests...");
  await generateDailyQuests();
  const today = new Date().toISOString().split("T")[0];
  const { data: quests } = await supabase.from("daily_quests").select("*").eq("date", today);
  console.log(`📋 Daily Quests geladen: ${quests ? quests.length : 0}`);
  if (!quests || quests.length === 0) {
    console.log("❌ Keine Daily Quests gefunden!");
    return;
  }
  
  const ch = client.channels.cache.get(DAILY_CHANNEL) || await client.channels.fetch(DAILY_CHANNEL);
  if (!ch) {
    console.log("❌ Daily Quest Channel nicht gefunden!");
    return;
  }
  console.log("✅ Poste Daily Quests...");
  
  let desc = "**📋 Tägliche Aufgaben**\n\nErledige Aufgaben durch Aktivität auf dem Server!\n*Updates alle 3 Minuten automatisch.*\n\n";
  const rows = [];
  
  for (const q of quests) {
    const emoji = q.difficulty === "light" ? "🟢" : q.difficulty === "medium" ? "🟡" : "🔴";
    desc += `${emoji} **${q.description}**\n`;
    desc += `└ Belohnung: ${q.reward_coins} Coins + ${q.reward_xp} XP\n\n`;
    
    const btn = new ButtonBuilder()
      .setCustomId(`claim_daily_${q.id}`)
      .setLabel(q.description.split(":")[0])
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
    
    if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
    else if (rows[rows.length - 1].components.length < 5) rows[rows.length - 1].addComponents(btn);
    else rows.push(new ActionRowBuilder().addComponents(btn));
  }
  
  const bonusBtn = new ButtonBuilder().setCustomId("claim_daily_bonus").setLabel("🎁 BONUS").setStyle(ButtonStyle.Primary).setDisabled(true);
  rows.push(new ActionRowBuilder().addComponents(bonusBtn));
  
  desc += "**🎁 Bonus:** 15 Coins + 100 XP + 10% Boost (2h)";
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📋 Daily Quests")
    .setDescription(desc)
    .setFooter({ text: "Grüne Buttons = Abholbereit!" });
  
  const msg = await ch.send({ embeds: [embed], components: rows });
  dailyMessageId = msg.id;
  
  // Auto-Update alle 3 Min
  setInterval(() => updateQuestDisplay(client, "daily"), 180000);
}

async function postWeeklyQuests(client) {
  console.log("📅 Generiere Weekly Quests...");
  await generateWeeklyQuests();
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - now.getDay() + 1);
  const ws = mon.toISOString().split("T")[0];
  
  const { data: quests } = await supabase.from("weekly_quests").select("*").eq("week_start", ws);
  console.log(`📅 Weekly Quests geladen: ${quests ? quests.length : 0}`);
  if (!quests || quests.length === 0) {
    console.log("❌ Keine Weekly Quests gefunden!");
    return;
  }
  
  const ch = client.channels.cache.get(DAILY_CHANNEL) || await client.channels.fetch(DAILY_CHANNEL);
  if (!ch) {
    console.log("❌ Weekly Quest Channel nicht gefunden!");
    return;
  }
  console.log("✅ Poste Weekly Quests...");
  
  let desc = "**📅 Wöchentliche Aufgaben (Montag-Montag)**\n\nErledige Aufgaben durch Aktivität!\n*Updates alle 3 Minuten automatisch.*\n\n";
  const rows = [];
  
  for (const q of quests) {
    const emoji = q.difficulty === "light" ? "🟢" : q.difficulty === "medium" ? "🟡" : "🔴";
    desc += `${emoji} **${q.description}**\n`;
    desc += `└ Belohnung: ${q.reward_coins} Coins + ${q.reward_xp} XP\n\n`;
    
    const btn = new ButtonBuilder()
      .setCustomId(`claim_weekly_${q.id}`)
      .setLabel(q.description.split(":")[0])
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
    
    if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
    else if (rows[rows.length - 1].components.length < 5) rows[rows.length - 1].addComponents(btn);
    else rows.push(new ActionRowBuilder().addComponents(btn));
  }
  
  const bonusBtn = new ButtonBuilder().setCustomId("claim_weekly_bonus").setLabel("🎁 BONUS").setStyle(ButtonStyle.Primary).setDisabled(true);
  rows.push(new ActionRowBuilder().addComponents(bonusBtn));
  
  desc += "**🎁 Bonus:** 50 Coins + 500 XP + 25% Boost (12h)";
  
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle("📅 Weekly Quests")
    .setDescription(desc)
    .setFooter({ text: "Grüne Buttons = Abholbereit!" });
  
  const msg = await ch.send({ embeds: [embed], components: rows });
  weeklyMessageId = msg.id;
  
  // Auto-Update alle 3 Min
  setInterval(() => updateQuestDisplay(client, "weekly"), 180000);
}

async function updateQuestDisplay(client, type) {
  const ch = client.channels.cache.get(DAILY_CHANNEL);
  if (!ch) return;
  
  const msgId = type === "daily" ? dailyMessageId : weeklyMessageId;
  if (!msgId) return;
  
  try {
    const msg = await ch.messages.fetch(msgId);
    
    if (type === "daily") {
      const today = new Date().toISOString().split("T")[0];
      const { data: quests } = await supabase.from("daily_quests").select("*").eq("date", today);
      if (!quests) return;
      
      let desc = "**📋 Tägliche Aufgaben**\n\nErledige Aufgaben durch Aktivität auf dem Server!\n*Updates alle 3 Minuten automatisch.*\n\n";
      const rows = [];
      
      for (const q of quests) {
        const { data: progs } = await supabase.from("daily_quest_progress").select("*").eq("quest_id", q.id);
        const completedUsers = progs ? progs.filter(p => p.completed && !p.claimed).length : 0;
        
        const emoji = q.difficulty === "light" ? "🟢" : q.difficulty === "medium" ? "🟡" : "🔴";
        desc += `${emoji} **${q.description}**`;
        if (completedUsers > 0) desc += ` *(${completedUsers} bereit)*`;
        desc += `\n└ Belohnung: ${q.reward_coins} Coins + ${q.reward_xp} XP\n\n`;
        
        const hasCompleted = completedUsers > 0;
        const btn = new ButtonBuilder()
          .setCustomId(`claim_daily_${q.id}`)
          .setLabel(q.description.split(":")[0])
          .setStyle(hasCompleted ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(!hasCompleted);
        
        if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
        else if (rows[rows.length - 1].components.length < 5) rows[rows.length - 1].addComponents(btn);
        else rows.push(new ActionRowBuilder().addComponents(btn));
      }
      
      const bonusBtn = new ButtonBuilder().setCustomId("claim_daily_bonus").setLabel("🎁 BONUS").setStyle(ButtonStyle.Primary).setDisabled(true);
      rows.push(new ActionRowBuilder().addComponents(bonusBtn));
      
      desc += "**🎁 Bonus:** 15 Coins + 100 XP + 10% Boost (2h)";
      
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle("📋 Daily Quests").setDescription(desc).setFooter({ text: "Grüne Buttons = Abholbereit!" });
      await msg.edit({ embeds: [embed], components: rows });
    } else {
      const now = new Date();
      const mon = new Date(now);
      mon.setDate(now.getDate() - now.getDay() + 1);
      const ws = mon.toISOString().split("T")[0];
      
      const { data: quests } = await supabase.from("weekly_quests").select("*").eq("week_start", ws);
      if (!quests) return;
      
      let desc = "**📅 Wöchentliche Aufgaben (Montag-Montag)**\n\nErledige Aufgaben durch Aktivität!\n*Updates alle 3 Minuten automatisch.*\n\n";
      const rows = [];
      
      for (const q of quests) {
        const { data: progs } = await supabase.from("weekly_quest_progress").select("*").eq("quest_id", q.id);
        const completedUsers = progs ? progs.filter(p => p.completed && !p.claimed).length : 0;
        
        const emoji = q.difficulty === "light" ? "🟢" : q.difficulty === "medium" ? "🟡" : "🔴";
        desc += `${emoji} **${q.description}**`;
        if (completedUsers > 0) desc += ` *(${completedUsers} bereit)*`;
        desc += `\n└ Belohnung: ${q.reward_coins} Coins + ${q.reward_xp} XP\n\n`;
        
        const hasCompleted = completedUsers > 0;
        const btn = new ButtonBuilder()
          .setCustomId(`claim_weekly_${q.id}`)
          .setLabel(q.description.split(":")[0])
          .setStyle(hasCompleted ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(!hasCompleted);
        
        if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
        else if (rows[rows.length - 1].components.length < 5) rows[rows.length - 1].addComponents(btn);
        else rows.push(new ActionRowBuilder().addComponents(btn));
      }
      
      const bonusBtn = new ButtonBuilder().setCustomId("claim_weekly_bonus").setLabel("🎁 BONUS").setStyle(ButtonStyle.Primary).setDisabled(true);
      rows.push(new ActionRowBuilder().addComponents(bonusBtn));
      
      desc += "**🎁 Bonus:** 50 Coins + 500 XP + 25% Boost (12h)";
      
      const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle("📅 Weekly Quests").setDescription(desc).setFooter({ text: "Grüne Buttons = Abholbereit!" });
      await msg.edit({ embeds: [embed], components: rows });
    }
  } catch(e) {
    console.error("Update Error:", e);
  }
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

async function handleQuestClaim(i, client) {
  const parts = i.customId.split("_");
  const type = parts[1];
  const questId = parts[2] === "bonus" ? null : parseInt(parts[2]);
  
  if (questId) {
    const table = type === "daily" ? "daily_quests" : "weekly_quests";
    const pTable = type === "daily" ? "daily_quest_progress" : "weekly_quest_progress";
    
    const { data: q } = await supabase.from(table).select("*").eq("id", questId).single();
    const { data: p } = await supabase.from(pTable).select("*").eq("user_id", i.user.id).eq("quest_id", questId).single();
    
    if (!p || !p.completed || p.claimed) return i.reply({ content: "❌ Quest nicht verfügbar oder bereits abgeholt!", flags: 64 });
    
    await supabase.from(pTable).update({ claimed: true }).eq("user_id", i.user.id).eq("quest_id", questId);
    
    const { data: lvl } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
    if (lvl) {
      await supabase.from("levels").update({ coins: lvl.coins + q.reward_coins, total_xp: lvl.total_xp + q.reward_xp }).eq("user_id", i.user.id);
    }
    
    const embed = new EmbedBuilder().setColor(0x57F287).setTitle("✅ Quest abgeschlossen!").setDescription(`🪙 **+${q.reward_coins} Coins**\n✨ **+${q.reward_xp} XP**`);
    await updateQuestDisplay(client, type);
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
      return i.reply({ content: "❌ Du musst erst alle Quests abholen!", flags: 64 });
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
    
    const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🎊 BONUS ABGEHOLT!").setDescription(`🪙 **+${bonus.coins} Coins**\n✨ **+${bonus.xp} XP**\n⚡ **+${bonus.boost}% XP Boost** (${bonus.h}h aktiv!)`);
    
    try {
      const ch = client.channels.cache.get(LEVELUP_CHANNEL) || await client.channels.fetch(LEVELUP_CHANNEL);
      if (ch) await ch.send({ content: `🎊 <@${i.user.id}> hat alle ${type === "daily" ? "Daily" : "Weekly"} Quests abgeschlossen!`, embeds: [embed] });
    } catch(e) {}
    
    return i.reply({ embeds: [embed], flags: 64 });
  }
}

module.exports = { postDailyQuests, postWeeklyQuests, updateQuestDisplay, trackProgress, handleQuestClaim };
