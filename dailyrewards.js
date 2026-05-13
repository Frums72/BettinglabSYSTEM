const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const DAILY_REWARDS = [
  { day: 1, coins: 5, xp: 50, boost: 0, boostHours: 0 },
  { day: 2, coins: 8, xp: 75, boost: 0, boostHours: 0 },
  { day: 3, coins: 10, xp: 100, boost: 10, boostHours: 2 },
  { day: 4, coins: 15, xp: 150, boost: 0, boostHours: 0 },
  { day: 5, coins: 20, xp: 200, boost: 15, boostHours: 3 },
  { day: 6, coins: 25, xp: 250, boost: 0, boostHours: 0 },
  { day: 7, coins: 50, xp: 500, boost: 25, boostHours: 6 }
];

async function getDailyStreak(userId) {
  const { data } = await supabase.from("daily_rewards").select("*").eq("user_id", userId).single();
  return data || { user_id: userId, streak: 0, last_claim: null };
}

async function updateStreak(userId, newStreak, now) {
  await supabase.from("daily_rewards").upsert({ user_id: userId, streak: newStreak, last_claim: now });
}

async function showDaily(i) {
  const data = await getDailyStreak(i.user.id);
  const now = new Date();
  const last = data.last_claim ? new Date(data.last_claim) : null;
  
  let currentDay = data.streak;
  if (last) {
    const diff = (now - last) / 1000 / 60 / 60;
    if (diff >= 24 && diff < 48) currentDay = (data.streak % 7) + 1;
    else if (diff >= 48) currentDay = 1;
    else currentDay = data.streak;
  } else {
    currentDay = 1;
  }
  
  let desc = "**Tägliche Belohnungen - 7 Tage Streak!**\n\n";
  const rows = [];
  
  for (let i = 0; i < 7; i++) {
    const r = DAILY_REWARDS[i];
    const isDone = currentDay > r.day;
    const isCurrent = currentDay === r.day;
    const emoji = isDone ? "✅" : isCurrent ? "🎁" : "🔒";
    desc += `${emoji} **Tag ${r.day}:** ${r.coins} Coins + ${r.xp} XP`;
    if (r.boost > 0) desc += ` + ${r.boost}% Boost (${r.boostHours}h)`;
    desc += "\n";
    
    if (i % 7 === 0 || i === 6) {
      const btn = new ButtonBuilder()
        .setCustomId(`daily_${r.day}`)
        .setLabel(`Tag ${r.day}`)
        .setStyle(isCurrent ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!isCurrent);
      if (rows.length === 0) rows.push(new ActionRowBuilder().addComponents(btn));
      else rows[0].addComponents(btn);
    }
  }
  
  desc += `\n**Deine Serie:** ${data.streak > 0 ? data.streak : 0} Tag${data.streak === 1 ? '' : 'e'}`;
  if (last) desc += `\n**Letzter Claim:** <t:${Math.floor(last.getTime()/1000)}:R>`;
  
  const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🎁 Daily Rewards").setDescription(desc);
  return i.reply({ embeds: [embed], components: rows, flags: 64 });
}

async function handleDailyButton(i) {
  const day = parseInt(i.customId.split("_")[1]);
  const userData = await getDailyStreak(i.user.id);
  const now = new Date();
  const last = userData.last_claim ? new Date(userData.last_claim) : null;
  
  let expectedDay = userData.streak + 1;
  if (last) {
    const diff = (now - last) / 1000 / 60 / 60;
    if (diff < 24) return i.reply({ content: "❌ Du hast heute bereits deine Belohnung abgeholt!", flags: 64 });
    if (diff >= 48) expectedDay = 1;
  } else {
    expectedDay = 1;
  }
  
  if (day !== expectedDay) return i.reply({ content: "❌ Das ist nicht dein aktueller Tag!", flags: 64 });
  
  const reward = DAILY_REWARDS[day - 1];
  
  // Update Streak
  const newStreak = day === 7 ? 0 : day;
  await updateStreak(i.user.id, newStreak, now.toISOString());
  
  // Give Rewards
  const { data: levelData } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
  if (levelData) {
    const newCoins = levelData.coins + reward.coins;
    const newTotalXp = levelData.total_xp + reward.xp;
    let xpBoost = levelData.xp_boost || 0;
    let xpBoostUntil = levelData.xp_boost_until;
    
    if (reward.boost > 0) {
      const until = new Date();
      until.setHours(until.getHours() + reward.boostHours);
      xpBoost = reward.boost;
      xpBoostUntil = until.toISOString();
    }
    
    await supabase.from("levels").update({ 
      coins: newCoins, 
      total_xp: newTotalXp,
      xp_boost: xpBoost,
      xp_boost_until: xpBoostUntil
    }).eq("user_id", i.user.id);
  }
  
  let desc = `**Tag ${day} abgeholt!**\n\n🪙 **+${reward.coins} Coins**\n✨ **+${reward.xp} XP**`;
  if (reward.boost > 0) desc += `\n⚡ **+${reward.boost}% XP Boost** (${reward.boostHours}h aktiv!)`;
  if (day === 7) desc += "\n\n🎊 **7-Tage Streak abgeschlossen!** Serie startet neu!";
  
  const embed = new EmbedBuilder().setColor(0x57F287).setTitle("✅ Belohnung erhalten!").setDescription(desc);
  
  log(i.client, "SUCCESS", "Daily Reward", `User: ${i.user.tag}\nTag: ${day}\nCoins: +${reward.coins}\nXP: +${reward.xp}`, i.user);
  return i.reply({ embeds: [embed], flags: 64 });
}

module.exports = { showDaily, handleDailyButton };
