const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const TEAM_ROLE = "963870711678640188";
const activeGiveaways = new Map();

function formatDuration(minutes) {
  const days = Math.floor(minutes / 60 / 24);
  const hours = Math.floor((minutes / 60) % 24);
  const mins = minutes % 60;
  
  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}min`);
  
  return parts.join(" ") || "0min";
}

async function startGiveaway(i) {
  // Team Check
  if (!i.member.roles.cache.has(TEAM_ROLE)) {
    return i.reply({ content: "❌ Nur Team-Mitglieder können Giveaways starten!", flags: 64 });
  }
  
  const channel = i.options.getChannel("channel");
  const prize = i.options.getString("gewinn");
  const durationMinutes = i.options.getInteger("dauer") ?? 60; // Standard: 60 Minuten
  
  // Prüfe Channel
  if (!channel.isTextBased()) {
    return i.reply({ content: "❌ Der Channel muss ein Text-Channel sein!", flags: 64 });
  }
  
  if (durationMinutes <= 0) {
    return i.reply({ content: "❌ Die Dauer muss mindestens 1 Minute betragen!", flags: 64 });
  }
  
  // Prüfe ob Gewinn Coins ist
  const coinsMatch = prize.match(/^(\d+)$/);
  const isCoins = coinsMatch !== null;
  const coinAmount = isCoins ? parseInt(coinsMatch[1]) : 0;
  
  const prizeText = isCoins ? `**${coinAmount} Coins** 🪙` : `**${prize}**`;
  const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);
  
  let desc = `# 🎉 GIVEAWAY!\n\n`;
  desc += `**Gewinn:** ${prizeText}\n\n`;
  desc += `**Wie teilnehmen?**\nReagiere mit ✅ auf diese Nachricht!\n\n`;
  desc += `⏰ **Endet:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n`;
  desc += `📅 **Endet am:** <t:${Math.floor(endTime.getTime() / 1000)}:F>`;
  
  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle("🎁 GIVEAWAY")
    .setDescription(desc)
    .setFooter({ text: `Gestartet von ${i.user.username}` })
    .setTimestamp();
  
  const btn = new ButtonBuilder()
    .setCustomId("giveaway_draw")
    .setLabel("🎊 JETZT ZIEHEN (Team)")
    .setStyle(ButtonStyle.Success);
  
  const row = new ActionRowBuilder().addComponents(btn);
  
  const msg = await channel.send({ embeds: [embed], components: [row] });
  
  // ✅ Reaktion
  await msg.react("✅");
  
  // Giveaway speichern
  const giveawayData = {
    channelId: channel.id,
    prize: prize,
    isCoins: isCoins,
    coinAmount: coinAmount,
    creatorId: i.user.id,
    messageId: msg.id,
    endTime: endTime
  };
  
  activeGiveaways.set(msg.id, giveawayData);
  
  // Auto-Ziehung Timer
  setTimeout(async () => {
    if (activeGiveaways.has(msg.id)) {
      await autoDrawWinner(i.client, msg, giveawayData);
    }
  }, durationMinutes * 60 * 1000);
  
  log(i.client, "SUCCESS", "Giveaway", `Channel: ${channel.name}\nGewinn: ${prize}\nDauer: ${formatDuration(durationMinutes)}\nVon: ${i.user.tag}`, i.user);
  return i.reply({ content: `✅ Giveaway in ${channel} gestartet! Endet in ${formatDuration(durationMinutes)}`, flags: 64 });
}

async function autoDrawWinner(client, msg, giveawayData) {
  console.log("🎊 Auto-Ziehung läuft...");
  
  try {
    const channel = await client.channels.fetch(giveawayData.channelId);
    const message = await channel.messages.fetch(giveawayData.messageId);
    
    await drawWinner(message, giveawayData, null, true);
  } catch (e) {
    console.error("❌ Auto-Ziehung Fehler:", e);
  }
}

async function drawWinner(msg, giveawayData, interactionUser = null, isAuto = false) {
  const reaction = msg.reactions.cache.get("✅");
  
  if (!reaction) {
    const nooneEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🎁 GIVEAWAY BEENDET")
      .setDescription("❌ Niemand hat teilgenommen!")
      .setTimestamp();
    
    await msg.edit({ embeds: [nooneEmbed], components: [] });
    activeGiveaways.delete(msg.id);
    return;
  }
  
  const users = await reaction.users.fetch();
  const participants = users.filter(u => !u.bot);
  
  if (participants.size === 0) {
    const nooneEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🎁 GIVEAWAY BEENDET")
      .setDescription("❌ Keine gültigen Teilnehmer!")
      .setTimestamp();
    
    await msg.edit({ embeds: [nooneEmbed], components: [] });
    activeGiveaways.delete(msg.id);
    return;
  }
  
  const winner = participants.random();
  
  // Coins auszahlen
  if (giveawayData.isCoins) {
    const { data: lvl } = await supabase.from("levels").select("*").eq("user_id", winner.id).single();
    if (lvl) {
      await supabase.from("levels").update({ 
        coins: lvl.coins + giveawayData.coinAmount 
      }).eq("user_id", winner.id);
    }
  }
  
  const prizeText = giveawayData.isCoins ? `**${giveawayData.coinAmount} Coins** 🪙` : `**${giveawayData.prize}**`;
  
  let winDesc = `# 🎊 GEWINNER!\n\n`;
  winDesc += `**Gewinner:** ${winner}\n`;
  winDesc += `**Gewinn:** ${prizeText}\n\n`;
  winDesc += `**Teilnehmer:** ${participants.size}\n\n`;
  winDesc += `Herzlichen Glückwunsch! 🎉`;
  
  const winEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("🎁 GIVEAWAY BEENDET")
    .setDescription(winDesc)
    .setThumbnail(winner.displayAvatarURL())
    .setFooter({ text: isAuto ? "Automatisch gezogen" : `Gezogen von ${interactionUser.username}` })
    .setTimestamp();
  
  await msg.edit({ embeds: [winEmbed], components: [] });
  activeGiveaways.delete(msg.id);
  
  // DM an Gewinner
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🎊 DU HAST GEWONNEN!")
      .setDescription(`**Glückwunsch!**\n\nDu hast das Giveaway gewonnen!\n\n**Gewinn:** ${prizeText}${giveawayData.isCoins ? '\n\nDie Coins wurden deinem Account gutgeschrieben!' : '\n\nMelde dich beim Team um deinen Gewinn abzuholen!'}`)
      .setTimestamp();
    
    await winner.send({ embeds: [dmEmbed] });
  } catch (e) {
    console.log(`⚠️ Konnte ${winner.tag} nicht per DM erreichen`);
  }
  
  console.log(`✅ Gewinner: ${winner.tag}`);
}

async function handleGiveawayDraw(i) {
  // Team Check
  if (!i.member.roles.cache.has(TEAM_ROLE)) {
    return i.reply({ content: "❌ Nur Team-Mitglieder können Gewinner ziehen!", flags: 64 });
  }
  
  const giveaway = activeGiveaways.get(i.message.id);
  if (!giveaway) {
    return i.reply({ content: "❌ Dieses Giveaway wurde bereits beendet!", flags: 64 });
  }
  
  await i.deferUpdate();
  await drawWinner(i.message, giveaway, i.user, false);
}

module.exports = { startGiveaway, handleGiveawayDraw };
