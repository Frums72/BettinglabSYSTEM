const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const QUEST_TYPES = {
  messages: { name: "Nachrichten schreiben", light: 10, medium: 30, hard: 100, weekly_l: 200, weekly_m: 500, weekly_h: 1000 },
  xp: { name: "XP sammeln", light: 100, medium: 300, hard: 1000, weekly_l: 2000, weekly_m: 5000, weekly_h: 10000 },
  reactions: { name: "Reactions geben", light: 5, medium: 15, hard: 50, weekly_l: 100, weekly_m: 250, weekly_h: 500 },
  coinflips: { name: "Coinflips spielen", light: 3, medium: 10, hard: 25, weekly_l: 50, weekly_m: 150, weekly_h: 300 },
  levelups: { name: "Level aufsteigen", light: 1, medium: 2, hard: 5, weekly_l: 5, weekly_m: 10, weekly_h: 20 },
  coins_earn: { name: "Coins sammeln", light: 10, medium: 30, hard: 100, weekly_l: 200, weekly_m: 500, weekly_h: 1000 }
};

async function generateDailyQuests() {
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase.from("daily_quests").select("*").eq("date", today).limit(1);
  if (existing && existing.length > 0) return;
  
  const types = Object.keys(QUEST_TYPES);
  const quests = [];
  
  // 3 light
  for (let i = 0; i < 3; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const req = QUEST_TYPES[type].light;
    quests.push({ date: today, quest_type: type, difficulty: "light", requirement: req, reward_coins: 5, reward_xp: 25, description: `${QUEST_TYPES[type].name}: ${req}x` });
  }
  
  // 1 medium
  const medType = types[Math.floor(Math.random() * types.length)];
  quests.push({ date: today, quest_type: medType, difficulty: "medium", requirement: QUEST_TYPES[medType].medium, reward_coins: 10, reward_xp: 50, description: `${QUEST_TYPES[medType].name}: ${QUEST_TYPES[medType].medium}x` });
  
  // 1 hard
  const hardType = types[Math.floor(Math.random() * types.length)];
  quests.push({ date: today, quest_type: hardType, difficulty: "hard", requirement: QUEST_TYPES[hardType].hard, reward_coins: 20, reward_xp: 100, description: `${QUEST_TYPES[hardType].name}: ${QUEST_TYPES[hardType].hard}x` });
  
  await supabase.from("daily_quests").insert(quests);
}

async function generateWeeklyQuests() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const weekStart = monday.toISOString().split("T")[0];
  
  const { data: existing } = await supabase.from("weekly_quests").select("*").eq("week_start", weekStart).limit(1);
  if (existing && existing.length > 0) return;
  
  const types = Object.keys(QUEST_TYPES);
  const quests = [];
  
  // 5 light
  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const req = QUEST_TYPES[type].weekly_l;
    quests.push({ week_start: weekStart, quest_type: type, difficulty: "light", requirement: req, reward_coins: 10, reward_xp: 50, description: `${QUEST_TYPES[type].name}: ${req}x` });
  }
  
  // 3 medium
  for (let i = 0; i < 3; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const req = QUEST_TYPES[type].weekly_m;
    quests.push({ week_start: weekStart, quest_type: type, difficulty: "medium", requirement: req, reward_coins: 25, reward_xp: 100, description: `${QUEST_TYPES[type].name}: ${req}x` });
  }
  
  // 2 hard
  for (let i = 0; i < 2; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const req = QUEST_TYPES[type].weekly_h;
    quests.push({ week_start: weekStart, quest_type: type, difficulty: "hard", requirement: req, reward_coins: 50, reward_xp: 250, description: `${QUEST_TYPES[type].name}: ${req}x` });
  }
  
  await supabase.from("weekly_quests").insert(quests);
}

async function trackQuestProgress(userId, questType, amount = 1) {
  // Daily
  const today = new Date().toISOString().split("T")[0];
  const { data: dailyQuests } = await supabase.from("daily_quests").select("*").eq("date", today).eq("quest_type", questType);
  
  if (dailyQuests) {
    for (const quest of dailyQuests) {
      const { data: progress } = await supabase.from("daily_quest_progress").select("*").eq("user_id", userId).eq("quest_id", quest.id).single();
      
      if (!progress) {
        await supabase.from("daily_quest_progress").insert({ user_id: userId, quest_id: quest.id, progress: amount, completed: amount >= quest.requirement });
      } else if (!progress.completed) {
        const newProgress = progress.progress + amount;
        await supabase.from("daily_quest_progress").update({ progress: newProgress, completed: newProgress >= quest.requirement }).eq("user_id", userId).eq("quest_id", quest.id);
      }
    }
  }
  
  // Weekly
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const weekStart = monday.toISOString().split("T")[0];
  
  const { data: weeklyQuests } = await supabase.from("weekly_quests").select("*").eq("week_start", weekStart).eq("quest_type", questType);
  
  if (weeklyQuests) {
    for (const quest of weeklyQuests) {
      const { data: progress } = await supabase.from("weekly_quest_progress").select("*").eq("user_id", userId).eq("quest_id", quest.id).single();
      
      if (!progress) {
        await supabase.from("weekly_quest_progress").insert({ user_id: userId, quest_id: quest.id, progress: amount, completed: amount >= quest.requirement });
      } else if (!progress.completed) {
        const newProgress = progress.progress + amount;
        await supabase.from("weekly_quest_progress").update({ progress: newProgress, completed: newProgress >= quest.requirement }).eq("user_id", userId).eq("quest_id", quest.id);
      }
    }
  }
}

async function showDailyQuests(i) {
  await generateDailyQuests();
  const today = new Date().toISOString().split("T")[0];
  const { data: quests } = await supabase.from("daily_quests").select("*").eq("date", today);
  if (!quests || quests.length === 0) return i.reply({ content: "Keine Daily Quests verfügbar.", flags: 64 });
  
  let desc = "**Tägliche Aufgaben**\n\n";
  const rows = [];
  let allDone = true;
  
  for (const q of quests) {
    const { data: prog } = await supabase.from("daily_quest_progress").select("*").eq("user_id", i.user.id).eq("quest_id", q.id).single();
    const progress = prog ? prog.progress : 0;
    const completed = prog ? prog.completed : false;
    const claimed = prog ? prog.claimed : false;
    
    const emoji = claimed ? "✅" : completed ? "🎁" : "📋";
    const diff = q.difficulty === "light" ? "Leicht" : q.difficulty === "medium" ? "Mittel" : "Schwer";
    desc += `${emoji} **${diff}:** ${q.description}\n`;
    desc += `Progress: ${progress}/${q.requirement} | Belohnung: ${q.reward_coins} Coins + ${q.reward_xp} XP\n\n`;
    
    if (completed && !claimed) {
      const btn = new ButtonBuilder().setCustomId(`claim_daily_${q.id}`).setLabel("Abholen").setStyle(ButtonStyle.Success);
      if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
      else if (rows[rows.length - 1].components.length < 5) rows[rows.length - 1].addComponents(btn);
      else rows.push(new ActionRowBuilder().addComponents(btn));
    }
    
    if (!claimed) allDone = false;
  }
  
  if (allDone && quests.length === 5) {
    const { data: bonusClaimed } = await supabase.from("daily_quest_progress").select("*").eq("user_id", i.user.id).eq("claimed", true);
    if (bonusClaimed && bonusClaimed.length === 5) {
      desc += "\n🎊 **ALLE QUESTS ABGESCHLOSSEN!** Bonus verfügbar!";
      const btn = new ButtonBuilder().setCustomId("claim_daily_bonus").setLabel("🎁 BONUS ABHOLEN").setStyle(ButtonStyle.Primary);
      rows.push(new ActionRowBuilder().addComponents(btn));
    }
  }
  
  const embed = new EmbedBuilder().setColor(0x5865F2).setTitle("📋 Daily Quests").setDescription(desc);
  return i.reply({ embeds: [embed], components: rows, flags: 64 });
}

async function showWeeklyQuests(i) {
  await generateWeeklyQuests();
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const weekStart = monday.toISOString().split("T")[0];
  
  const { data: quests } = await supabase.from("weekly_quests").select("*").eq("week_start", weekStart);
  if (!quests || quests.length === 0) return i.reply({ content: "Keine Weekly Quests verfügbar.", flags: 64 });
  
  let desc = "**Wöchentliche Aufgaben (Montag-Montag)**\n\n";
  const rows = [];
  let allDone = true;
  
  for (const q of quests) {
    const { data: prog } = await supabase.from("weekly_quest_progress").select("*").eq("user_id", i.user.id).eq("quest_id", q.id).single();
    const progress = prog ? prog.progress : 0;
    const completed = prog ? prog.completed : false;
    const claimed = prog ? prog.claimed : false;
    
    const emoji = claimed ? "✅" : completed ? "🎁" : "📋";
    const diff = q.difficulty === "light" ? "Leicht" : q.difficulty === "medium" ? "Mittel" : "Schwer";
    desc += `${emoji} **${diff}:** ${q.description}\n`;
    desc += `Progress: ${progress}/${q.requirement} | Belohnung: ${q.reward_coins} Coins + ${q.reward_xp} XP\n\n`;
    
    if (completed && !claimed) {
      const btn = new ButtonBuilder().setCustomId(`claim_weekly_${q.id}`).setLabel("Abholen").setStyle(ButtonStyle.Success);
      if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
      else if (rows[rows.length - 1].components.length < 5) rows[rows.length - 1].addComponents(btn));
      else rows.push(new ActionRowBuilder().addComponents(btn));
    }
    
    if (!claimed) allDone = false;
  }
  
  if (allDone && quests.length === 10) {
    const { data: bonusClaimed } = await supabase.from("weekly_quest_progress").select("*").eq("user_id", i.user.id).eq("claimed", true);
    if (bonusClaimed && bonusClaimed.length === 10) {
      desc += "\n🎊 **ALLE WEEKLY QUESTS ABGESCHLOSSEN!** Bonus verfügbar!";
      const btn = new ButtonBuilder().setCustomId("claim_weekly_bonus").setLabel("🎁 BONUS ABHOLEN").setStyle(ButtonStyle.Primary);
      rows.push(new ActionRowBuilder().addComponents(btn));
    }
  }
  
  const embed = new EmbedBuilder().setColor(0x5865F2).setTitle("📅 Weekly Quests").setDescription(desc);
  return i.reply({ embeds: [embed], components: rows, flags: 64 });
}

async function handleQuestClaim(i) {
  const parts = i.customId.split("_");
  const type = parts[1]; // daily or weekly
  const questId = parts[2] === "bonus" ? null : parseInt(parts[2]);
  
  if (questId) {
    const table = type === "daily" ? "daily_quests" : "weekly_quests";
    const progTable = type === "daily" ? "daily_quest_progress" : "weekly_quest_progress";
    
    const { data: quest } = await supabase.from(table).select("*").eq("id", questId).single();
    const { data: prog } = await supabase.from(progTable).select("*").eq("user_id", i.user.id).eq("quest_id", questId).single();
    
    if (!prog || !prog.completed || prog.claimed) return i.reply({ content: "❌ Quest nicht verfügbar!", flags: 64 });
    
    await supabase.from(progTable).update({ claimed: true }).eq("user_id", i.user.id).eq("quest_id", questId);
    
    const { data: levelData } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
    if (levelData) {
      await supabase.from("levels").update({ 
        coins: levelData.coins + quest.reward_coins,
        total_xp: levelData.total_xp + quest.reward_xp
      }).eq("user_id", i.user.id);
    }
    
    const embed = new EmbedBuilder().setColor(0x57F287).setTitle("✅ Quest abgeschlossen!")
      .setDescription(`🪙 **+${quest.reward_coins} Coins**\n✨ **+${quest.reward_xp} XP**`);
    
    return i.reply({ embeds: [embed], flags: 64 });
  } else {
    // Bonus
    const bonus = type === "daily" ? { coins: 15, xp: 100, boost: 10, hours: 2 } : { coins: 50, xp: 500, boost: 25, hours: 12 };
    
    const { data: levelData } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
    if (levelData) {
      const until = new Date();
      until.setHours(until.getHours() + bonus.hours);
      
      await supabase.from("levels").update({ 
        coins: levelData.coins + bonus.coins,
        total_xp: levelData.total_xp + bonus.xp,
        xp_boost: bonus.boost,
        xp_boost_until: until.toISOString()
      }).eq("user_id", i.user.id);
    }
    
    const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🎊 BONUS ABGEHOLT!")
      .setDescription(`🪙 **+${bonus.coins} Coins**\n✨ **+${bonus.xp} XP**\n⚡ **+${bonus.boost}% XP Boost** (${bonus.hours}h aktiv!)`);
    
    try {
      const ch = i.client.channels.cache.get("1504133135468728533") || await i.client.channels.fetch("1504133135468728533");
      if (ch) await ch.send({ content: `🎊 <@${i.user.id}> hat alle ${type === "daily" ? "Daily" : "Weekly"} Quests abgeschlossen!`, embeds: [embed] });
    } catch(e) {}
    
    return i.reply({ embeds: [embed], flags: 64 });
  }
}

module.exports = { generateDailyQuests, generateWeeklyQuests, trackQuestProgress, showDailyQuests, showWeeklyQuests, handleQuestClaim };
