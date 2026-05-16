const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const SPIN_REWARDS = [
  { coins: 5, chance: 30, emoji: "🟢" },
  { coins: 10, chance: 25, emoji: "🔵" },
  { coins: 15, chance: 20, emoji: "🟡" },
  { coins: 25, chance: 15, emoji: "🟠" },
  { coins: 35, chance: 7, emoji: "🟣" },
  { coins: 50, chance: 3, emoji: "🔴" }
];

async function getLastSpin(uid) {
  const { data } = await supabase.from("daily_spin").select("*").eq("user_id", uid).single();
  return data || { user_id: uid, last_spin: null };
}

async function betlabspin(i) {
  const data = await getLastSpin(i.user.id);
  const now = new Date();
  const last = data.last_spin ? new Date(data.last_spin) : null;
  
  if (last) {
    const diff = (now - last) / 1000 / 60 / 60;
    if (diff < 24) {
      const hoursLeft = 24 - diff;
      const hours = Math.floor(hoursLeft);
      const minutes = Math.floor((hoursLeft - hours) * 60);
      return i.reply({ content: `❌ Du hast heute bereits gedreht!\n⏰ **Nächster Spin in:** ${hours}h ${minutes}min`, flags: 64 });
    }
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle("🎰 DAILY SPIN")
    .setDescription("**Drehe das Glücksrad!**\n\nKostenlos 1x pro Tag!\n\n🎁 **Belohnungen:**\n🟢 5 Coins (30%)\n🔵 10 Coins (25%)\n🟡 15 Coins (20%)\n🟠 25 Coins (15%)\n🟣 35 Coins (7%)\n🔴 50 Coins (3%)")
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({ text: "Viel Glück!" });
  
  const btn = new ButtonBuilder()
    .setCustomId("daily_spin")
    .setLabel("🎰 DREHEN!")
    .setStyle(ButtonStyle.Success);
  
  const row = new ActionRowBuilder().addComponents(btn);
  
  return i.reply({ embeds: [embed], components: [row] });
}

async function handleDailySpinButton(i) {
  const data = await getLastSpin(i.user.id);
  const now = new Date();
  const last = data.last_spin ? new Date(data.last_spin) : null;
  
  if (last) {
    const diff = (now - last) / 1000 / 60 / 60;
    if (diff < 24) {
      const hoursLeft = 24 - diff;
      const hours = Math.floor(hoursLeft);
      const minutes = Math.floor((hoursLeft - hours) * 60);
      return i.reply({ content: `❌ Du hast heute bereits gedreht!\n⏰ **Nächster Spin in:** ${hours}h ${minutes}min`, flags: 64 });
    }
  }
  
  await i.deferUpdate();
  
  // Animation
  const anim1 = new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle("🎰 DAILY SPIN")
    .setDescription("# 🌀 DAS RAD DREHT SICH...\n\n⏳ Gleich weißt du es!")
    .setThumbnail(i.user.displayAvatarURL());
  
  await i.editReply({ embeds: [anim1], components: [] });
  await new Promise(r => setTimeout(r, 2000));
  
  // Belohnung ziehen
  const rand = Math.random() * 100;
  let cumulative = 0;
  let reward = SPIN_REWARDS[0];
  
  for (const r of SPIN_REWARDS) {
    cumulative += r.chance;
    if (rand <= cumulative) {
      reward = r;
      break;
    }
  }
  
  // In DB speichern
  await supabase.from("daily_spin").upsert({ user_id: i.user.id, last_spin: now.toISOString() });
  
  // Coins hinzufügen
  const { data: lvl } = await supabase.from("levels").select("*").eq("user_id", i.user.id).single();
  if (lvl) {
    await supabase.from("levels").update({ coins: lvl.coins + reward.coins }).eq("user_id", i.user.id);
  }
  
  const resultEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("🎊 GEWONNEN!")
    .setDescription(`# ${reward.emoji} +${reward.coins} COINS!\n\n✅ **Du hast ${reward.coins} Coins gewonnen!**\n\n💰 **Neue Balance:** ${lvl.coins + reward.coins} Coins\n\n⏰ **Nächster Spin:** In 24 Stunden!`)
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({ text: "Komm morgen wieder! 🍀" });
  
  log(i.client, "SUCCESS", "Daily Spin", `User: ${i.user.tag}\nGewinn: ${reward.coins} Coins`, i.user);
  return i.editReply({ embeds: [resultEmbed], components: [] });
}

module.exports = { betlabspin, handleDailySpinButton };
