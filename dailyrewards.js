const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const CHANNEL_ID = "1504225477760389251";

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

async function postDailyRewards(client) {
  const ch = client.channels.cache.get(CHANNEL_ID) || await client.channels.fetch(CHANNEL_ID);
  if (!ch) return;
  
  let desc = "**🎁 Tägliche Belohnungen - 7 Tage Serie!**\n\n";
  for (const r of DAILY_REWARDS) {
    desc += `**Tag ${r.day}:** ${r.coins} Coins + ${r.xp} XP`;
    if (r.boost > 0) desc += ` + ${r.boost}% Boost (${r.boostHours}h)`;
    desc += "\n";
  }
  desc += "\n⚠️ **Verpasse keinen Tag! Nach 24h ohne Claim startet die Serie neu!**";
  
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const btn = new ButtonBuilder()
      .setCustomId(`daily_claim_${i + 1}`)
      .setLabel(`Tag ${i + 1}`)
      .setStyle(ButtonStyle.Primary);
    if (i % 5 === 0) rows.push(new ActionRowBuilder().addComponents(btn));
    else rows[rows.length - 1].addComponents(btn);
  }
  
  const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🎁 Daily Rewards").setDescription(desc);
  await ch.send({ content: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", embeds: [embed], components: rows });
}

async function handleDailyButton(i) {
  const day = parseInt(i.customId.split("_")[2]);
  const data = await getDailyStreak(i.user.id);
  const now = new Date();
  const last = data.last_claim ? new Date(data.last_claim) : null;
  
  let expectedDay = 1;
  if (last) {
    const diff = (now - last) / 1000 / 60 / 60;
    if (diff < 24) return i.reply({ content: "❌ Du hast heute bereits deine Belohnung abgeholt!", ephemeral: true });
    if (diff >= 48) expectedDay = 1;
    else expectedDay = (data.streak % 7) + 1;
  }
  
  if (day !== expectedDay) return i.reply({ content: `❌ Das ist nicht dein Tag! Du bist bei **Tag ${expectedDay}**!`, ephemeral: true });
  
  const reward = DAILY_REWARDS[day - 1];
  const newStreak = day === 7 ? 0 : day;
  await supabase.from("daily_rewards").upsert({ user_id: i.user.id, streak: newStreak, last_claim: now.toISOString() });
  
  const { data: lvl } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
  if (lvl) {
    let xpBoost = lvl.xp_boost || 0;
    let xpBoostUntil = lvl.xp_boost_until;
    if (reward.boost > 0) {
      const until = new Date();
      until.setHours(until.getHours() + reward.boostHours);
      xpBoost = reward.boost;
      xpBoostUntil = until.toISOString();
    }
    await supabase.from("levels").update({ 
      coins: lvl.coins + reward.coins, 
      total_xp: lvl.total_xp + reward.xp,
      xp_boost: xpBoost,
      xp_boost_until: xpBoostUntil
    }).eq("user_id", i.user.id);
  }
  
  let desc = `**Tag ${day} abgeholt!**\n\n🪙 **+${reward.coins} Coins**\n✨ **+${reward.xp} XP**`;
  if (reward.boost > 0) desc += `\n⚡ **+${reward.boost}% XP Boost** (${reward.boostHours}h aktiv!)`;
  if (day === 7) desc += "\n\n🎊 **7-Tage Serie abgeschlossen!**";
  else desc += `\n\n**Nächster Tag:** Tag ${day + 1} (innerhalb 24h!)`;
  
  const embed = new EmbedBuilder().setColor(0x57F287).setTitle("✅ Belohnung erhalten!").setDescription(desc);
  log(i.client, "SUCCESS", "Daily Reward", `User: ${i.user.tag}\nTag: ${day}`, i.user);
  return i.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { postDailyRewards, handleDailyButton };
