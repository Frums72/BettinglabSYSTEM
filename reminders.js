const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");

const REMINDER_CHANNEL = "1504225477760389251";

async function checkAndSendReminders(client) {
  console.log("🔔 Prüfe Erinnerungen...");
  
  const now = new Date();
  
  // Hole Channel
  const channel = await client.channels.fetch(REMINDER_CHANNEL);
  if (!channel) {
    console.log("❌ Reminder Channel nicht gefunden!");
    return;
  }
  
  // Hole alle User die einen Level-Eintrag haben
  const { data: users } = await supabase.from("levels").select("user_id");
  if (!users) return;
  
  for (const u of users) {
    const uid = u.user_id;
    
    try {
      const user = await client.users.fetch(uid);
      if (!user) continue;
      
      let availableItems = [];
      let cooldownItems = [];
      let investmentReady = false;
      
      // ============ DAILY REWARD CHECK ============
      const { data: dailyData } = await supabase.from("daily_rewards").select("*").eq("user_id", uid).single();
      if (dailyData && dailyData.last_claim) {
        const lastClaim = new Date(dailyData.last_claim);
        const diff = (now - lastClaim) / 1000 / 60 / 60;
        
        if (diff >= 24) {
          // Verfügbar!
          const nextDay = dailyData.streak === 0 ? 1 : (dailyData.streak % 7) + 1;
          availableItems.push(`🎁 **Daily Reward Tag ${nextDay}** - Jetzt abholen!`);
        } else if (diff >= 23) {
          // Bald verfügbar (zwischen 23-24h)
          const hoursLeft = Math.ceil(24 - diff);
          const minsLeft = Math.ceil((24 - diff) * 60) % 60;
          cooldownItems.push(`🎁 **Daily Reward** - Verfügbar in ${hoursLeft}h ${minsLeft}min`);
        }
      } else if (!dailyData || !dailyData.last_claim) {
        // Noch nie abgeholt
        availableItems.push(`🎁 **Daily Reward Tag 1** - Hol dir deine erste Belohnung!`);
      }
      
      // ============ DAILY SPIN CHECK ============
      const { data: spinData } = await supabase.from("daily_spin").select("*").eq("user_id", uid).single();
      if (spinData && spinData.last_spin) {
        const lastSpin = new Date(spinData.last_spin);
        const diff = (now - lastSpin) / 1000 / 60 / 60;
        
        if (diff >= 24) {
          // Verfügbar!
          availableItems.push(`🎰 **Daily Spin** - Nutze \`/betlabspin\`!`);
        } else if (diff >= 23) {
          // Bald verfügbar
          const hoursLeft = Math.ceil(24 - diff);
          const minsLeft = Math.ceil((24 - diff) * 60) % 60;
          cooldownItems.push(`🎰 **Daily Spin** - Verfügbar in ${hoursLeft}h ${minsLeft}min`);
        }
      } else if (!spinData || !spinData.last_spin) {
        // Noch nie gedreht
        availableItems.push(`🎰 **Daily Spin** - Dreh kostenlos mit \`/betlabspin\`!`);
      }
      
      // ============ INVESTMENT CHECK ============
      const { data: activeInvs } = await supabase
        .from("active_investments")
        .select("*")
        .eq("user_id", uid);
      
      // Prüfe ob User in allen 3 Projekten investiert hat
      const projects = ["shop", "fabrik", "casino"];
      const investedProjects = activeInvs ? activeInvs.map(inv => inv.project) : [];
      const availableProjects = projects.filter(p => !investedProjects.includes(p));
      
      if (availableProjects.length > 0) {
        // Mindestens 1 Projekt frei
        investmentReady = true;
      }
      
      // Prüfe ob Investments bald auszahlen
      if (activeInvs && activeInvs.length > 0) {
        for (const inv of activeInvs) {
          const endTime = new Date(inv.end_time);
          const diff = (endTime - now) / 1000 / 60 / 60;
          
          if (diff <= 0) {
            // Investment bereit für Auszahlung (wird automatisch ausgezahlt)
            availableProjects.push(inv.project);
            investmentReady = true;
          } else if (diff <= 1) {
            // Bald bereit
            const minsLeft = Math.ceil(diff * 60);
            const projectName = inv.project === "shop" ? "🏪 SHOP" : inv.project === "fabrik" ? "🏭 FABRIK" : "💎 CASINO";
            cooldownItems.push(`${projectName} Investment - Auszahlung in ${minsLeft}min`);
          }
        }
      }
      
      // ============ NUR SENDEN WENN WAS VERFÜGBAR IST ============
      if (availableItems.length === 0 && !investmentReady) {
        // Nichts verfügbar, skip
        continue;
      }
      
      // Build Message
      let desc = `Hey ${user.username}! 👋\n\n`;
      
      if (availableItems.length > 0) {
        desc += `**🎉 VERFÜGBAR - Jetzt abholen:**\n${availableItems.join("\n")}\n\n`;
      }
      
      if (cooldownItems.length > 0) {
        desc += `**⏰ BALD VERFÜGBAR:**\n${cooldownItems.join("\n")}\n\n`;
      }
      
      if (investmentReady) {
        desc += `**💰 INVESTMENT-TIPP:**\n`;
        if (availableProjects.length === 3) {
          desc += `Du kannst in **alle 3 Projekte** investieren! Nutze \`/betlabinvest\` und vermehre deine Coins!\n`;
        } else if (availableProjects.length > 0) {
          const projectNames = availableProjects.map(p => 
            p === "shop" ? "🏪 SHOP" : p === "fabrik" ? "🏭 FABRIK" : "💎 CASINO"
          ).join(", ");
          desc += `Du kannst noch in **${projectNames}** investieren! Nutze \`/betlabinvest\`!\n`;
        }
        desc += `\n`;
      }
      
      desc += `📋 **Vergiss auch deine täglichen Aufgaben nicht** für noch mehr Belohnungen!\n\n⏰ Hol dir alles ab bevor die Zeit abläuft!`;
      
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🔔 ERINNERUNG - GRATIS BELOHNUNGEN!")
        .setDescription(desc)
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: "BetLab - Dein Gamification Bot" })
        .setTimestamp();
      
      // Sende im Channel (User wird gementioned)
      await channel.send({ content: `${user}`, embeds: [embed] });
      console.log(`✅ Erinnerung an ${user.tag} im Channel gesendet (${availableItems.length} verfügbar)`);
      
    } catch (e) {
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
