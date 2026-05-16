const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const PROJECT_CONFIG = {
  shop: {
    name: "🏪 SHOP",
    emoji: "🏪",
    levels: [
      { coins: 0, return: 5, fail: 0 },
      { coins: 10000, return: 6, fail: 0 },
      { coins: 50000, return: 7, fail: 0 },
      { coins: 150000, return: 8.5, fail: 0 },
      { coins: 500000, return: 10, fail: 0 }
    ],
    min: 100,
    max: 3000
  },
  fabrik: {
    name: "🏭 FABRIK",
    emoji: "🏭",
    levels: [
      { coins: 0, return: 12, fail: 10 },
      { coins: 25000, return: 13, fail: 8 },
      { coins: 100000, return: 14, fail: 6 },
      { coins: 300000, return: 15, fail: 4 },
      { coins: 1000000, return: 16, fail: 2 }
    ],
    min: 500,
    max: 5000,
    failLoss: 50
  },
  casino: {
    name: "💎 CASINO",
    emoji: "💎",
    levels: [
      { coins: 0, return: 20, fail: 20 },
      { coins: 50000, return: 22, fail: 17 },
      { coins: 200000, return: 24, fail: 14 },
      { coins: 600000, return: 26, fail: 11 },
      { coins: 2000000, return: 28, fail: 8 }
    ],
    min: 1000,
    max: 10000,
    failLoss: 100
  }
};

const pendingInvestments = new Map();
const activeInvestments = new Map();

async function getProjectData() {
  const { data } = await supabase.from("project_levels").select("*").single();
  if (!data) {
    await supabase.from("project_levels").insert({
      shop_total: 0,
      shop_level: 1,
      fabrik_total: 0,
      fabrik_level: 1,
      casino_total: 0,
      casino_level: 1
    });
    return {
      shop_total: 0,
      shop_level: 1,
      fabrik_total: 0,
      fabrik_level: 1,
      casino_total: 0,
      casino_level: 1
    };
  }
  return data;
}

function getCurrentLevel(project, total) {
  const config = PROJECT_CONFIG[project];
  let level = 1;
  
  for (let i = config.levels.length - 1; i >= 0; i--) {
    if (total >= config.levels[i].coins) {
      level = i + 1;
      break;
    }
  }
  
  return level;
}

function getNextLevelProgress(project, total, currentLevel) {
  const config = PROJECT_CONFIG[project];
  
  if (currentLevel >= config.levels.length) {
    return { current: total, needed: total, percent: 100 };
  }
  
  const currentLevelCoins = config.levels[currentLevel - 1].coins;
  const nextLevelCoins = config.levels[currentLevel].coins;
  
  const progress = total - currentLevelCoins;
  const needed = nextLevelCoins - currentLevelCoins;
  const percent = Math.floor((progress / needed) * 100);
  
  return { current: total, needed: nextLevelCoins, percent: Math.min(percent, 100) };
}

async function betlabinvest(i) {
  const project = i.options.getString("projekt");
  const amount = i.options.getInteger("anzahl");
  
  if (!PROJECT_CONFIG[project]) {
    return i.reply({ content: "❌ Ungültiges Projekt!", flags: 64 });
  }
  
  const config = PROJECT_CONFIG[project];
  const { data: userData } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
  
  if (!userData || userData.coins < amount) {
    return i.reply({ content: `❌ Du hast nur **${userData?.coins || 0} Coins**!`, flags: 64 });
  }
  
  if (amount < config.min) {
    return i.reply({ content: `❌ Mindestens **${config.min} Coins** für ${config.name}!`, flags: 64 });
  }
  
  if (amount > config.max) {
    return i.reply({ content: `❌ Maximal **${config.max} Coins** für ${config.name}!`, flags: 64 });
  }
  
  // Projekt-Daten holen
  const projectData = await getProjectData();
  const totalKey = `${project}_total`;
  const levelKey = `${project}_level`;
  
  const currentTotal = projectData[totalKey];
  const currentLevel = getCurrentLevel(project, currentTotal);
  const levelStats = config.levels[currentLevel - 1];
  
  // Nach Investment
  const newTotal = currentTotal + amount;
  const newLevel = getCurrentLevel(project, newTotal);
  const progress = getNextLevelProgress(project, currentTotal, currentLevel);
  const newProgress = getNextLevelProgress(project, newTotal, newLevel);
  
  // Return berechnen
  const returnAmount = Math.floor(amount * (levelStats.return / 100));
  const totalReturn = amount + returnAmount;
  
  // Progress Bar
  const barLength = 10;
  const filled = Math.floor((progress.percent / 100) * barLength);
  const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
  
  const newFilled = Math.floor((newProgress.percent / 100) * barLength);
  const newBar = "█".repeat(newFilled) + "░".repeat(barLength - newFilled);
  
  let desc = `${config.name} **(Level ${currentLevel})**\n${bar} ${progress.percent}%\n${currentTotal.toLocaleString()} / ${progress.needed.toLocaleString()} Coins\n\n`;
  
  desc += `📊 **DEIN INVESTMENT:**\n`;
  desc += `• Einsatz: **${amount.toLocaleString()} Coins**\n`;
  desc += `• Return: **${levelStats.return}%** (+${returnAmount.toLocaleString()} Coins)\n`;
  desc += `• Fail Chance: **${levelStats.fail}%**${config.failLoss ? ` (-${config.failLoss}%)` : ""}\n`;
  desc += `• Auszahlung: **in 24 Stunden**\n\n`;
  
  desc += `💼 **NACH INVESTMENT:**\n`;
  desc += `• Neue Balance: **${(userData.coins - amount).toLocaleString()} Coins**\n`;
  desc += `• ${config.name} Progress: **${newProgress.percent}%** (${newTotal.toLocaleString()}/${newProgress.needed.toLocaleString()})\n`;
  
  if (newLevel > currentLevel) {
    desc += `\n🎊 **LEVEL-UP zu Level ${newLevel}!**\n`;
    desc += `Alle Investoren werden benachrichtigt!`;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("💰 INVESTMENT BESTÄTIGUNG")
    .setDescription(desc)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({ text: "Klicke ✅ um zu bestätigen" });
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("invest_confirm").setLabel("✅ BESTÄTIGEN").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("invest_cancel").setLabel("❌ ABBRECHEN").setStyle(ButtonStyle.Danger)
  );
  
  pendingInvestments.set(i.user.id, {
    project,
    amount,
    currentLevel,
    newLevel,
    returnAmount,
    totalReturn,
    levelStats
  });
  
  return i.reply({ embeds: [embed], components: [row] });
}

async function handleInvestmentButton(i, client) {
  const pending = pendingInvestments.get(i.user.id);
  
  if (!pending) {
    return i.reply({ content: "❌ Kein aktives Investment!", flags: 64 });
  }
  
  if (i.customId === "invest_cancel") {
    pendingInvestments.delete(i.user.id);
    return i.update({ content: "❌ Investment abgebrochen.", embeds: [], components: [] });
  }
  
  if (i.customId === "invest_confirm") {
    await i.deferUpdate();
    
    const { project, amount, currentLevel, newLevel, returnAmount, totalReturn, levelStats } = pending;
    const config = PROJECT_CONFIG[project];
    
    // Coins abziehen
    const { data: userData } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
    
    if (!userData || userData.coins < amount) {
      pendingInvestments.delete(i.user.id);
      return i.editReply({ content: "❌ Nicht genug Coins!", embeds: [], components: [] });
    }
    
    // XP Bonus (5 XP pro 100 Coins, max 25, 60s Cooldown)
    let bonusXP = 0;
    const now = Date.now();
    const cfXpCd = new Map();
    const COINFLIP_XP_CD = 60000;
    const MAX_CF_XP = 25;
    
    const lastXp = cfXpCd.get(i.user.id);
    if (!lastXp || now - lastXp >= COINFLIP_XP_CD) {
      bonusXP = Math.min(Math.floor(amount / 100) * 5, MAX_CF_XP);
      cfXpCd.set(i.user.id, now);
      
      // XP mit Boost berechnen
      const xpBoost = userData.xp_boost || 0;
      const xpBoostUntil = userData.xp_boost_until;
      let boostActive = false;
      if (xpBoost > 0 && xpBoostUntil) {
        const boostEnd = new Date(xpBoostUntil);
        if (now < boostEnd.getTime()) {
          boostActive = true;
        }
      }
      
      const actualXP = boostActive ? Math.floor(bonusXP * (1 + xpBoost / 100)) : bonusXP;
      const newTotalXp = userData.total_xp + actualXP;
      
      // Level berechnen
      const getLevelFromTotalXp = (totalXp) => {
        let level = 0;
        let xpNeeded = 0;
        let currentXp = totalXp;
        
        for (let i = 0; i < 100; i++) {
          xpNeeded = 100 + (i * 50);
          if (currentXp >= xpNeeded) {
            currentXp -= xpNeeded;
            level++;
          } else {
            break;
          }
        }
        
        return { level, currentXp };
      };
      
      const { level: newLevel, currentXp } = getLevelFromTotalXp(newTotalXp);
      
      await supabase.from("levels").update({
        coins: userData.coins - amount,
        xp: currentXp,
        level: newLevel,
        total_xp: newTotalXp
      }).eq("user_id", i.user.id);
      
      // Quest Tracking
      try {
        const { trackProgress } = require("./quests");
        await trackProgress(i.user.id, "xp", actualXP);
      } catch (e) {}
      
    } else {
      await supabase.from("levels").update({
        coins: userData.coins - amount
      }).eq("user_id", i.user.id);
    }
    
    // Projekt-Total updaten
    const projectData = await getProjectData();
    const totalKey = `${project}_total`;
    const levelKey = `${project}_level`;
    
    const newTotal = projectData[totalKey] + amount;
    const updateData = {};
    updateData[totalKey] = newTotal;
    updateData[levelKey] = newLevel;
    
    await supabase.from("project_levels").update(updateData).eq("id", projectData.id);
    
    // Investor speichern
    await supabase.from("project_investors").upsert({
      user_id: i.user.id,
      [`${project}_invested`]: true
    });
    
    // Investment speichern
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await supabase.from("active_investments").insert({
      user_id: i.user.id,
      project,
      amount,
      return_percent: levelStats.return,
      fail_chance: levelStats.fail,
      fail_loss: config.failLoss || 0,
      end_time: endTime.toISOString()
    });
    
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("✅ INVESTMENT ERFOLGREICH!")
      .setDescription(`${config.name}\n\n💰 **${amount.toLocaleString()} Coins** investiert!${bonusXP > 0 ? `\n🎁 **Bonus:** +${bonusXP} XP` : ''}\n\n⏰ Auszahlung: <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\n📊 **Erwarteter Return:**\n${levelStats.return}% = **+${returnAmount.toLocaleString()} Coins**`)
      .setThumbnail(i.user.displayAvatarURL());
    
    await i.editReply({ embeds: [embed], components: [] });
    
    // Level-Up Check
    if (newLevel > currentLevel) {
      await handleProjectLevelUp(client, project, currentLevel, newLevel);
    }
    
    pendingInvestments.delete(i.user.id);
    log(client, "SUCCESS", "Investment", `User: ${i.user.tag}\nProjekt: ${project}\nAmount: ${amount}`, i.user);
  }
}

async function handleProjectLevelUp(client, project, oldLevel, newLevel) {
  console.log(`🎊 ${project.toUpperCase()} Level-Up: ${oldLevel} → ${newLevel}`);
  
  const config = PROJECT_CONFIG[project];
  const newStats = config.levels[newLevel - 1];
  const nextLevelCoins = newLevel < config.levels.length ? config.levels[newLevel].coins : null;
  
  // Alle Investoren holen
  const { data: investors } = await supabase
    .from("project_investors")
    .select("user_id")
    .eq(`${project}_invested`, true);
  
  if (!investors) return;
  
  let desc = `Das ${config.name} Projekt ist jetzt **Level ${newLevel}**!\n\n`;
  desc += `📈 **NEUE STATS:**\n`;
  desc += `• Return: **${newStats.return}%** (vorher ${config.levels[oldLevel - 1].return}%)\n`;
  desc += `• Fail Chance: **${newStats.fail}%**${config.failLoss ? ` (-${config.failLoss}%)` : ""}\n\n`;
  
  desc += `💰 **DEINE VORTEILE:**\nDu erhältst ab jetzt **${newStats.return}%** Return auf alle neuen ${config.name}-Investments!\n\n`;
  
  if (nextLevelCoins) {
    const projectData = await getProjectData();
    const currentTotal = projectData[`${project}_total`];
    const needed = nextLevelCoins - currentTotal;
    desc += `🎯 **Nächstes Level (${newLevel + 1}):**\nNoch **${needed.toLocaleString()} Coins** Investment nötig\n\n`;
  } else {
    desc += `🏆 **MAX LEVEL ERREICHT!**\n\n`;
  }
  
  desc += `💡 Investiere jetzt und profitiere!`;
  
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("🎊 PROJEKT LEVEL-UP!")
    .setDescription(desc)
    .setThumbnail("https://s1.directupload.eu/images/260424/twd9ydz3.jpg")
    .setTimestamp();
  
  // DM an alle Investoren
  for (const inv of investors) {
    try {
      const user = await client.users.fetch(inv.user_id);
      await user.send({ embeds: [embed] });
    } catch (e) {
      console.log(`⚠️ Konnte ${inv.user_id} nicht benachrichtigen`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

module.exports = { betlabinvest, handleInvestmentButton };

// Auszahlungs-System (alle 10 Minuten prüfen)
async function processInvestments(client) {
  console.log("💰 Prüfe Investments...");
  
  const now = new Date();
  const { data: investments } = await supabase
    .from("active_investments")
    .select("*")
    .lte("end_time", now.toISOString());
  
  if (!investments || investments.length === 0) return;
  
  for (const inv of investments) {
    try {
      const config = PROJECT_CONFIG[inv.project];
      const user = await client.users.fetch(inv.user_id);
      
      // Fail-Check
      const failed = Math.random() * 100 < inv.fail_chance;
      
      let result, finalAmount;
      
      if (failed) {
        // GESCHEITERT
        const lossPercent = inv.fail_loss;
        const lossAmount = Math.floor(inv.amount * (lossPercent / 100));
        finalAmount = inv.amount - lossAmount;
        result = "FAIL";
        
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("💔 INVESTMENT GESCHEITERT!")
          .setDescription(`${config.name}\n\n❌ **Das Projekt ist fehlgeschlagen!**\n\n💰 **DEIN INVESTMENT:**\n• Investiert: ${inv.amount.toLocaleString()} Coins\n• Verlust: -${lossAmount.toLocaleString()} Coins (-${lossPercent}%)\n• Zurück: ${finalAmount.toLocaleString()} Coins\n\n💸 **Verlust:** ${lossAmount.toLocaleString()} Coins`)
          .setThumbnail(user.displayAvatarURL())
          .setFooter({ text: "Versuch es nochmal!" })
          .setTimestamp();
        
        await user.send({ embeds: [embed] });
        
      } else {
        // ERFOLG
        const returnAmount = Math.floor(inv.amount * (inv.return_percent / 100));
        finalAmount = inv.amount + returnAmount;
        result = "SUCCESS";
        
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("✅ INVESTMENT ERFOLGREICH!")
          .setDescription(`${config.name}\n\n🎊 **Das Projekt war erfolgreich!**\n\n💰 **DEIN RETURN:**\n• Investiert: ${inv.amount.toLocaleString()} Coins\n• Return: +${returnAmount.toLocaleString()} Coins (+${inv.return_percent}%)\n• Gesamt: ${finalAmount.toLocaleString()} Coins\n\n🎁 **Gewinn:** ${returnAmount.toLocaleString()} Coins`)
          .setThumbnail(user.displayAvatarURL())
          .setFooter({ text: "Glückwunsch!" })
          .setTimestamp();
        
        await user.send({ embeds: [embed] });
      }
      
      // Coins gutschreiben
      const { data: userData } = await supabase.from("levels").select("*").eq("user_id", inv.user_id).single();
      if (userData) {
        await supabase.from("levels").update({
          coins: userData.coins + finalAmount
        }).eq("user_id", inv.user_id);
      }
      
      // Investment löschen
      await supabase.from("active_investments").delete().eq("id", inv.id);
      
      console.log(`✅ Investment ausgezahlt: ${user.tag} - ${result} - ${finalAmount} Coins`);
      
    } catch (e) {
      console.error(`❌ Investment Fehler (ID ${inv.id}):`, e);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

function startInvestmentSystem(client) {
  console.log("💰 Investment System gestartet");
  
  // Sofort einmal prüfen
  processInvestments(client);
  
  // Dann alle 10 Minuten
  setInterval(() => {
    processInvestments(client);
  }, 10 * 60 * 1000);
}

module.exports = { betlabinvest, handleInvestmentButton, startInvestmentSystem };
