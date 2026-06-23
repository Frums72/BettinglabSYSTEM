const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const supabase = require("./db");
const { log } = require("./logger");

const PROOF_CHANNEL_ID = "1518910743087546478";
const BETLAB_ROLE_ID = "963871826637905991";
const COLOR = 0xE67E22;
const IMAGE = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";

async function sendProofInfoMessage(client) {
  try {
    const ch = client.channels.cache.get(PROOF_CHANNEL_ID) || 
               await client.channels.fetch(PROOF_CHANNEL_ID).catch(() => null);
    
    if (!ch) {
      console.error("❌ Proof Channel nicht gefunden");
      return;
    }

    // Lösche alte Infos (limit 5)
    try {
      const msgs = await ch.messages.fetch({ limit: 10 });
      const oldInfos = msgs.filter(m => m.author.bot && m.pinned);
      for (const msg of oldInfos.values()) {
        await msg.unpin().catch(() => {});
        await msg.delete().catch(() => {});
      }
    } catch(e) {}

    const infoEmbed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("📸 BETLAB PROOF SYSTEM")
      .setDescription(
        "**Willkommen im Proof Channel!**\n\n" +
        "Hier kannst du deine BetLab Gewinne und Erfolge posten.\n\n" +
        "**Wie es funktioniert:**\n" +
        "1️⃣ Verwende `/betlabproof <dein text>`\n" +
        "2️⃣ Beschreibe deinen Gewinn oder deine Aktion\n" +
        "3️⃣ Optional: Hänge einen Screenshot an\n" +
        "4️⃣ Dein Proof wird als schöne Embed-Nachricht gepostet\n\n" +
        "**Beispiel:** `/betlabproof Gewonnen beim Blackjack: 500 Coins!`\n\n" +
        "💡 Nur User mit der **BetLab Rolle** können Proofs posten!\n" +
        "✨ Alle Proofs werden automatisch mit Datum & Uhrzeit gestempelt"
      )
      .setThumbnail(IMAGE)
      .setFooter({ text: "BetLab Proof System" })
      .setTimestamp();

    const msg = await ch.send({ embeds: [infoEmbed] });
    await msg.pin().catch(() => {});
    
    console.log("✅ Proof Info-Nachricht gesendet & gepinnt");
  } catch(e) {
    console.error("❌ Proof Info Fehler:", e.message);
  }
}

async function handleProofCommand(i) {
  console.log("🔍 Proof Command ausgelöst von:", i.user.tag, "in Channel:", i.channelId);
  
  // Channel prüfen
  if (i.channelId !== PROOF_CHANNEL_ID) {
    console.log("❌ Falscher Channel. Erwartet:", PROOF_CHANNEL_ID, "Bekommen:", i.channelId);
    return i.reply({
      content: `❌ Dieser Command funktioniert nur im <#${PROOF_CHANNEL_ID}> Channel!`,
      flags: 64
    });
  }

  // Rolle prüfen
  if (!i.member.roles.cache.has(BETLAB_ROLE_ID)) {
    console.log("❌ User hat BetLab Rolle nicht. Rolle ID:", BETLAB_ROLE_ID);
    return i.reply({
      content: "❌ Du brauchst die **BetLab Rolle** um Proofs zu posten!",
      flags: 64
    });
  }

  console.log("✅ Alle Checks bestanden, poste Proof...");

  const proofText = i.options.getString("text");
  
  // Datum & Uhrzeit (Deutsche Zeit)
  const now = new Date();
  const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const date = germanTime.toLocaleDateString("de-DE");
  const time = germanTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  // Proof Embed
  const proofEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("✅ NEUER PROOF!")
    .setDescription(proofText)
    .setAuthor({
      name: i.user.username,
      iconURL: i.user.displayAvatarURL()
    })
    .addFields(
      { name: "📅 Datum", value: date, inline: true },
      { name: "🕐 Uhrzeit", value: time, inline: true },
      { name: "👤 User", value: `<@${i.user.id}>`, inline: true }
    )
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({ text: "BetLab Proof System" })
    .setTimestamp();

  // Attachments prüfen (Slice-Objekte von Discord können nicht direkt verwendet werden)
  const files = [];
  if (i.options._unparsed && i.options._unparsed.length > 0) {
    // Attachments sind part der Nachricht, nicht des Commands
    // Bei Slash Commands müssen Files über andere Wege hinzugefügt werden
    // Momentan: nur Text
  }

  // In Proof Channel posten
  const ch = i.guild.channels.cache.get(PROOF_CHANNEL_ID);
  if (!ch) {
    return i.reply({
      content: "❌ Proof Channel nicht gefunden!",
      flags: 64
    });
  }

  try {
    const proofMsg = await ch.send({
      embeds: [proofEmbed]
    });

    // React für Engagement
    await proofMsg.react("✅").catch(() => {});
    await proofMsg.react("🔥").catch(() => {});

    log(i.client, "SUCCESS", "Proof gepostet",
      `User: ${i.user.tag}\nText: ${proofText.substring(0, 100)}...`,
      i.user
    );

    return i.reply({
      content: "✅ Dein Proof wurde gepostet! 🎉",
      flags: 64
    });
  } catch(e) {
    console.error("❌ Proof Post Fehler:", e.message);
    return i.reply({
      content: "❌ Fehler beim Posten des Proofs!",
      flags: 64
    });
  }
}

module.exports = { handleProofCommand, sendProofInfoMessage };
