const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");

async function betlabstats(i) {
  await i.deferReply({ flags: 64 });
  
  const uid = i.user.id;
  
  // Level Daten
  const { data: lvl } = await supabase.from("levels").select("*").eq("user_id", uid).single();
  
  if (!lvl) {
    return i.editReply({ content: "❌ Du hast noch keine Daten!", flags: 64 });
  }
  
  // XP für nächstes Level
  const xpNeeded = 100 + (lvl.level * 50);
  
  let desc = `## 💰 COINS & XP\n`;
  desc += `• **Coins:** ${lvl.coins.toLocaleString()}\n`;
  desc += `• **Level:** ${lvl.level} (XP: ${lvl.xp}/${xpNeeded})\n`;
  desc += `• **Total XP:** ${lvl.total_xp.toLocaleString()}\n\n`;
  
  // Aktive Investments
  const { data: investments } = await supabase
    .from("active_investments")
    .select("*")
    .eq("user_id", uid);
  
  if (investments && investments.length > 0) {
    desc += `## 📈 AKTIVE INVESTMENTS\n`;
    
    for (const inv of investments) {
      const config = {
        shop: { name: "🏪 SHOP", emoji: "🏪" },
        fabrik: { name: "🏭 FABRIK", emoji: "🏭" },
        casino: { name: "💎 CASINO", emoji: "💎" }
      }[inv.project];
      
      const endTime = new Date(inv.end_time);
      const now = new Date();
      const diff = endTime - now;
      const hours = Math.floor(diff / 1000 / 60 / 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      
      const expectedReturn = Math.floor(inv.amount * (inv.return_percent / 100));
      
      desc += `${config.name}: **${inv.amount.toLocaleString()} Coins**\n`;
      desc += `   → Auszahlung in **${hours}h ${minutes}min**\n`;
      desc += `   → Erwartung: **+${expectedReturn.toLocaleString()} Coins** (${inv.return_percent}%)\n`;
      if (inv.fail_chance > 0) {
        desc += `   → Risiko: ${inv.fail_chance}% Fail (-${inv.fail_loss}%)\n`;
      }
      desc += `\n`;
    }
  } else {
    desc += `## 📈 AKTIVE INVESTMENTS\n`;
    desc += `*Keine aktiven Investments*\n\n`;
  }
  
  // Daily Rewards
  const { data: daily } = await supabase.from("daily_rewards").select("*").eq("user_id", uid).single();
  
  if (daily) {
    desc += `## 🎁 DAILY REWARDS\n`;
    desc += `• **Streak:** ${daily.streak} Tage\n`;
    
    const lastClaim = daily.last_claim ? new Date(daily.last_claim) : null;
    if (lastClaim) {
      const nextClaim = new Date(lastClaim);
      nextClaim.setHours(nextClaim.getHours() + 24);
      const now = new Date();
      const diff = nextClaim - now;
      
      if (diff > 0) {
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        desc += `• **Nächster Claim:** in ${hours}h ${minutes}min\n`;
      } else {
        desc += `• **Nächster Claim:** ✅ Verfügbar!\n`;
      }
    }
    desc += `\n`;
  }
  
  // Daily Spin
  const { data: spin } = await supabase.from("daily_spin").select("*").eq("user_id", uid).single();
  
  desc += `## 🎰 DAILY SPIN\n`;
  
  if (spin && spin.last_spin) {
    const lastSpin = new Date(spin.last_spin);
    const nextSpin = new Date(lastSpin);
    nextSpin.setHours(nextSpin.getHours() + 24);
    const now = new Date();
    const diff = nextSpin - now;
    
    if (diff > 0) {
      const hours = Math.floor(diff / 1000 / 60 / 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      desc += `• **Nächster Spin:** in ${hours}h ${minutes}min\n`;
    } else {
      desc += `• **Nächster Spin:** ✅ Verfügbar!\n`;
    }
  } else {
    desc += `• **Nächster Spin:** ✅ Verfügbar!\n`;
  }
  desc += `\n`;
  
  // Quests
  const { data: quests } = await supabase.from("quest_progress").select("*").eq("user_id", uid);
  
  if (quests && quests.length > 0) {
    const completedDaily = quests.filter(q => q.type.startsWith("daily_") && q.completed).length;
    const totalDaily = quests.filter(q => q.type.startsWith("daily_")).length;
    
    desc += `## 📋 DAILY QUESTS (${completedDaily}/${totalDaily})\n`;
    
    for (const q of quests.filter(q => q.type.startsWith("daily_")).slice(0, 5)) {
      const emoji = q.completed ? "✅" : "⏳";
      const questNames = {
        daily_messages: "Schreibe Nachrichten",
        daily_xp: "Sammle XP",
        daily_reactions: "Reagiere auf Nachrichten",
        daily_coinflip: "Gewinne Coinflips",
        daily_gambling: "Spiele Gambling Games"
      };
      
      const name = questNames[q.type] || q.type;
      desc += `${emoji} ${name} (${q.progress}/${q.target})\n`;
    }
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📊 DEINE KOMPLETTE STATISTIK")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({ text: "BetLab Stats" })
    .setTimestamp();
  
  return i.editReply({ embeds: [embed] });
}

module.exports = { betlabstats };
