const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");

// Tracking: Welcher User hat heute schon eine Reminder bekommen
const remindersSentToday = new Map();

async function checkAndSendReminders(client) {
  console.log("🔔 Prüfe Erinnerungen...");
  
  const now = new Date();
  
  // Deutsche Zeit berechnen (UTC+1 Winter, UTC+2 Sommer)
  const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const germanHour = germanTime.getHours();
  
  // Nur zwischen 20:00 und 20:59 deutsche Zeit senden
  if (germanHour !== 20) {
    console.log(`⏰ Nicht 20 Uhr (aktuell ${germanHour} Uhr deutsche Zeit), skip`);
    return;
  }
  
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Hole alle User die einen Level-Eintrag haben
  const { data: users } = await supabase.from("levels").select("user_id");
  if (!users) return;
  
  for (const u of users) {
    const uid = u.user_id;
    
    // Prüfe ob User heute schon Reminder bekommen hat
    const lastSent = remindersSentToday.get(uid);
    if (lastSent === today) {
      // Heute schon gesendet, skip
      continue;
    }
    
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
        } else if (diff >= 20) {
          // Bald verfügbar (ab 20h anzeigen)
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
        } else if (diff >= 20) {
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
            if (!availableProjects.includes(inv.project)) {
              availableProjects.push(inv.project);
            }
            investmentReady = true;
          } else if (diff <= 4) {
            // Bald bereit (innerhalb 4h)
            const hoursLeft = Math.floor(diff);
            const minsLeft = Math.ceil((diff * 60) % 60);
            const projectName = inv.project === "shop" ? "🏪 SHOP" : inv.project === "fabrik" ? "🏭 FABRIK" : "💎 CASINO";
            cooldownItems.push(`${projectName} Investment - Auszahlung in ${hoursLeft}h ${minsLeft}min`);
          }
        }
      }
      
      // ============ NUR SENDEN WENN WAS VERFÜGBAR IST ============
      if (availableItems.length === 0 && cooldownItems.length === 0 && !investmentReady) {
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
        .setFooter({ text: "BetLab System" })
        .setTimestamp();
      
      // Sende DM
      await user.send({ embeds: [embed] });
      
      // Markiere als heute gesendet
      remindersSentToday.set(uid, today);
      
      console.log(`✅ Erinnerung an ${user.tag} per DM gesendet (${availableItems.length} verfügbar)`);
      
    } catch (e) {
      console.log(`⚠️ Konnte ${uid} nicht erreichen:`, e.message);
    }
    
    // 1 Sekunde warten zwischen Messages
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Jede Stunde prüfen (sendet nur um 20 Uhr deutsche Zeit)
function startReminderSystem(client) {
  console.log("🔔 Erinnerungs-System gestartet (täglich 20:00 Uhr deutsche Zeit)");
  
  // Sofort einmal prüfen beim Start
  checkAndSendReminders(client);
  
  // Dann jede Stunde prüfen
  setInterval(() => {
    checkAndSendReminders(client);
  }, 60 * 60 * 1000); // Jede Stunde
  
  // Täglich um Mitternacht UTC: Map clearen für neuen Tag
  setInterval(() => {
    const now = new Date();
    if (now.getUTCHours() === 0 && now.getUTCMinutes() < 60) {
      remindersSentToday.clear();
      console.log("🗑️ Reminder-Tracking für neuen Tag zurückgesetzt");
    }
  }, 60 * 60 * 1000);
}

module.exports = { startReminderSystem };
