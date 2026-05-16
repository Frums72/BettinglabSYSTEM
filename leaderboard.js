const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const LEADERBOARD_CHANNEL = "1496998695038619708";
const REWARDS = {
  1: 500,
  2: 300,
  3: 200
};

let lastRewardDate = null;

async function getTopPlayers(type = "coins", limit = 5) {
  const column = type === "coins" ? "coins" : type === "xp" ? "total_xp" : "level";
  const { data } = await supabase
    .from("levels")
    .select("user_id, coins, total_xp, level")
    .order(column, { ascending: false })
    .limit(limit);
  return data || [];
}

async function postDailyLeaderboard(client) {
  console.log("🏆 Poste Daily Leaderboard (08:00 Uhr)...");
  
  const ch = client.channels.cache.get(LEADERBOARD_CHANNEL) || await client.channels.fetch(LEADERBOARD_CHANNEL);
  if (!ch) {
    console.log("❌ Leaderboard Channel nicht gefunden!");
    return;
  }
  
  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const justAfterMidnight = now.getUTCHours() === 8;
  
  // Top 5 holen (Coins-basiert)
  const topPlayers = await getTopPlayers("coins", 5);
  
  // NUR AM MONTAG 08:00 UTC belohnen
  let rewarded = false;
  if (isMonday && justAfterMidnight) {
    const today = now.toISOString().split('T')[0];
    
    // Prüfe ob heute schon belohnt
    if (lastRewardDate !== today) {
      for (let i = 0; i < Math.min(3, topPlayers.length); i++) {
        const player = topPlayers[i];
        const reward = REWARDS[i + 1];
        
        // Coins hinzufügen
        await supabase
          .from("levels")
          .update({ coins: player.coins + reward })
          .eq("user_id", player.user_id);
        
        console.log(`💰 Platz ${i + 1}: ${player.user_id} erhält ${reward} Coins`);
      }
      lastRewardDate = today;
      rewarded = true;
    }
  }
  
  // Countdown bis nächsten Montag 00:00 UTC
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  const diff = nextMonday - now;
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);
  const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
  
  // Embed erstellen
  let desc = `**Die besten Coin-Sammler der Woche!**\n\n`;
  
  if (rewarded) {
    desc += `✅ **BELOHNUNGEN WURDEN GERADE AUSGEZAHLT!**\n\n`;
  }
  
  desc += `🏆 **WÖCHENTLICHE BELOHNUNGEN:**\n`;
  desc += `🥇 Platz 1: **${REWARDS[1]} Coins**\n`;
  desc += `🥈 Platz 2: **${REWARDS[2]} Coins**\n`;
  desc += `🥉 Platz 3: **${REWARDS[3]} Coins**\n\n`;
  desc += `📊 **AKTUELLES TOP 5:**\n\n`;
  
  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
    
    try {
      const user = await client.users.fetch(player.user_id);
      desc += `${medal} **${user.username}** - ${player.coins.toLocaleString()} Coins\n`;
    } catch (e) {
      desc += `${medal} User #${player.user_id} - ${player.coins.toLocaleString()} Coins\n`;
    }
  }
  
  desc += `\n⏰ **Belohnungen in:** ${days}d ${hours}h (jeden Montag 08:00 Uhr)`;
  desc += `\n\n💡 **Tipp:** Sammle Coins durch Gambling, Quests & Daily Rewards!`;
  
  const embed = new EmbedBuilder()
    .setColor(rewarded ? 0x57F287 : 0xF1C40F)
    .setTitle(rewarded ? "🎊 WEEKLY REWARDS AUSGEZAHLT!" : "🏆 WEEKLY LEADERBOARD")
    .setDescription(desc)
    .setThumbnail("https://s1.directupload.eu/images/260424/twd9ydz3.jpg")
    .setFooter({ text: "Belohnungen jeden Montag 08:00 Uhr!" })
    .setTimestamp();
  
  await ch.send({ embeds: [embed] });
  log(client, "SUCCESS", "Daily Leaderboard Post", `Gepostet um 08:00 Uhr${rewarded ? " - BELOHNT!" : ""}`);
}

// Timer für täglich 08:00 Uhr UTC
function startLeaderboardSystem(client) {
  console.log("🏆 Leaderboard System gestartet");
  
  function scheduleNext() {
    const now = new Date();
    const next = new Date(now);
    
    // Nächster 08:00 Uhr Zeitpunkt
    next.setUTCHours(8, 0, 0, 0);
    
    // Wenn 08:00 schon vorbei ist, nimm morgen
    if (now.getUTCHours() >= 8) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    
    const delay = next - now;
    console.log(`⏰ Nächster Leaderboard Post in ${Math.floor(delay / 1000 / 60 / 60)}h ${Math.floor((delay / 1000 / 60) % 60)}min`);
    
    setTimeout(() => {
      postDailyLeaderboard(client);
      scheduleNext(); // Nächsten Tag planen
    }, delay);
  }
  
  scheduleNext();
}

module.exports = { startLeaderboardSystem };
