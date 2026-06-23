const { EmbedBuilder } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const JACKPOT_CHANNEL = "1505213996276645980";

// Berechne Steuer (1% aufgerundet)
function calculateTax(amount) {
  const tax = Math.ceil(amount * 0.01);
  return Math.max(1, tax);
}

// Füge Steuer zum Jackpot hinzu
async function addTaxToJackpot(userId, amount, source, client) {
  const tax = calculateTax(amount);
  
  // Jackpot erhöhen
  const { data: jackpotData } = await supabase.from("weekly_jackpot").select("*").single();
  
  if (!jackpotData) {
    await supabase.from("weekly_jackpot").insert({
      total: tax,
      week_start: new Date().toISOString()
    });
  } else {
    await supabase.from("weekly_jackpot").update({
      total: jackpotData.total + tax
    }).eq("id", jackpotData.id);
  }
  
  // User als Teilnehmer markieren
  await supabase.from("jackpot_participants").upsert({
    user_id: userId,
    total_tax_paid: (await getTaxPaid(userId)) + tax
  });
  
  // Channel Update
  try {
    const ch = await client.channels.fetch(JACKPOT_CHANNEL);
    if (ch) {
      const user = await client.users.fetch(userId);
      const newTotal = (jackpotData?.total || 0) + tax;
      const participantCount = await getParticipantCount();
      
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("💰 JACKPOT ERHÖHT!")
        .setDescription(`**${user.username}** hat **${tax} Coins** Steuer gezahlt!\n\n🎰 **AKTUELLER JACKPOT**\n**${newTotal.toLocaleString()} Coins**\n\n🎟️ **Teilnehmer:** ${participantCount}\n📅 **Auslosung:** Montag 08:00 Uhr`)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      
      await ch.send({ embeds: [embed] });
    }
  } catch (e) {
    console.error("Jackpot announcement error:", e);
  }
  
  return tax;
}

async function getTaxPaid(userId) {
  const { data } = await supabase.from("jackpot_participants").select("*").eq("user_id", userId).single();
  return data?.total_tax_paid || 0;
}

async function getParticipantCount() {
  const { data } = await supabase.from("jackpot_participants").select("user_id");
  return data?.length || 0;
}

async function drawWeeklyJackpot(client) {
  console.log("🎰 Ziehe Weekly Jackpot...");
  
  const { data: jackpotData } = await supabase.from("weekly_jackpot").select("*").single();
  
  if (!jackpotData || jackpotData.total === 0) {
    console.log("❌ Kein Jackpot vorhanden");
    return;
  }
  
  // Alle Teilnehmer
  const { data: participants } = await supabase.from("jackpot_participants").select("*");
  
  if (!participants || participants.length === 0) {
    console.log("❌ Keine Teilnehmer");
    return;
  }
  
  // Gewinner ziehen
  const winner = participants[Math.floor(Math.random() * participants.length)];
  const winnerUser = await client.users.fetch(winner.user_id);
  
  // Coins gutschreiben
  const { data: userData } = await supabase.from("levels").select("*").eq("user_id", winner.user_id).single();
  if (userData) {
    await supabase.from("levels").update({
      coins: userData.coins + jackpotData.total
    }).eq("user_id", winner.user_id);
  }
  
  // DM an Gewinner
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🎊 JACKPOT GEWONNEN!")
      .setDescription(`**Du hast den Weekly Jackpot gewonnen!**\n\n💰 **GEWINN:**\n**${jackpotData.total.toLocaleString()} Coins**\n\n🎟️ **Teilnehmer:** ${participants.length}\n\n🎉 Herzlichen Glückwunsch!`)
      .setThumbnail(winnerUser.displayAvatarURL())
      .setTimestamp();
    
    await winnerUser.send({ embeds: [dmEmbed] });
  } catch (e) {
    console.log("Konnte DM nicht senden:", e.message);
  }
  
  // Channel Announcement
  const ch = await client.channels.fetch(JACKPOT_CHANNEL);
  if (ch) {
    const announceEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🎊 JACKPOT GEWINNER!")
      .setDescription(`**${winnerUser.username}** hat den Weekly Jackpot gewonnen!\n\n💰 **GEWINN:**\n**${jackpotData.total.toLocaleString()} Coins**\n\n🎟️ **Teilnehmer:** ${participants.length}\n\n🎉 Herzlichen Glückwunsch!`)
      .setThumbnail(winnerUser.displayAvatarURL())
      .setTimestamp();
    
    await ch.send({ content: `🎊 ${winnerUser}`, embeds: [announceEmbed] });
  }
  
  // Reset für nächste Woche
  await supabase.from("weekly_jackpot").update({
    total: 0,
    week_start: new Date().toISOString()
  }).eq("id", jackpotData.id);
  
  await supabase.from("jackpot_participants").delete().neq("user_id", "");
  
  log(client, "SUCCESS", "Weekly Jackpot", `Gewinner: ${winnerUser.tag}\nGewinn: ${jackpotData.total} Coins\nTeilnehmer: ${participants.length}`, winnerUser);
}

module.exports = { calculateTax, addTaxToJackpot, drawWeeklyJackpot };
