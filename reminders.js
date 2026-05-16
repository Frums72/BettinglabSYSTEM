const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");

async function checkAndSendReminders(client) {
  console.log("🔔 Prüfe Erinnerungen...");
  
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  
  // Hole alle User die einen Level-Eintrag haben
  const { data: users } = await supabase.from("levels").select("user_id");
  if (!users) return;
  
  for (const u of users) {
    const uid = u.user_id;
    
    try {
      const user = await client.users.fetch(uid);
      if (!user) continue;
      
      let reminders = [];
      
      // Daily Reward Check
      const { data: dailyData } = await supabase.from("daily_rewards").select("*").eq("user_id", uid).single();
      if (dailyData) {
        const lastClaim = dailyData.last_claim ? new Date(dailyData.last_claim) : null;
        if (lastClaim) {
          const diff = (now - lastClaim) / 1000 / 60 / 60;
          // Zwischen 23-24h = Erinnerung
          if (diff >= 23 && diff < 24) {
            const nextDay = dailyData.streak === 0 ? 1 : (dailyData.streak % 7) + 1;
            reminders.push(`🎁 **Daily Reward Tag ${nextDay}** wartet auf dich!`);
          }
        }
      } else {
        // Noch nie abgeholt = Erinnerung
        reminders.push(`🎁 **Daily Rewards** warten auf dich! Hol dir deine erste Belohnung!`);
      }
      
      // Daily Spin Check
      const { data: spinData } = await supabase.from("daily_spin").select("*").eq("user_id", uid).single();
      if (spinData) {
        const lastSpin = spinData.last_spin ? new Date(spinData.last_spin) : null;
        if (lastSpin) {
          const diff = (now - lastSpin) / 1000 / 60 / 60;
          if (diff >= 23 && diff < 24) {
            reminders.push(`🎰 **Daily Spin** ist wieder verfügbar!`);
          }
        }
      } else {
        // Noch nie gedreht
        reminders.push(`🎰 **Daily Spin** - Dreh kostenlos und gewinne Coins!`);
      }
      
      // Keine Erinnerungen = skip
      if (reminders.length === 0) continue;
      
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🔔 ERINNERUNG - GRATIS BELOHNUNGEN!")
        .setDescription(`Hey ${user.username}! 👋\n\n**Vergiss nicht deine GRATIS Belohnungen abzuholen!**\n\n${reminders.join("\n")}\n\n📋 **Vergiss auch deine täglichen Aufgaben nicht** für noch weitere krasse Belohnungen!\n\n💰 Hol dir alles ab bevor die Zeit abläuft!`)
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: "BetLab - Dein Gamification Bot" })
        .setTimestamp();
      
      await user.send({ embeds: [embed] });
      console.log(`✅ Erinnerung an ${user.tag} gesendet`);
      
    } catch (e) {
      // User hat DMs geschlossen oder Bot geblockt
      console.log(`⚠️ Konnte ${uid} nicht erreichen:`, e.message);
    }
    
    // 1 Sekunde warten zwischen Messages
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Alle 30 Minuten prüfen
function startReminderSystem(client) {
  console.log("🔔 Erinnerungs-System gestartet");
  
  // Sofort einmal prüfen
  checkAndSendReminders(client);
  
  // Dann alle 30 Minuten
  setInterval(() => {
    checkAndSendReminders(client);
  }, 30 * 60 * 1000);
}

module.exports = { startReminderSystem };
