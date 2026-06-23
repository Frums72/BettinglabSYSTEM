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
      .setTitle("✅ BETLAB PROOF SYSTEM")
      .setDescription(
        "Willkommen im Proof Channel!\n\n" +
        "Hier können Mitglieder ihre Einzahlungen/Auszahlungen teilen, um für Transparenz zu sorgen und zu zeigen, dass wir legitim sind.\n\n" +
        "📌 **So funktioniert's:**\n" +
        "Verwende den Befehl:\n" +
        "`/betlabproof <dein Text>`\n\n" +
        "**Beschreibe:**\n" +
        "• Deinen Gewinn\n" +
        "• Deine Auszahlung\n" +
        "• Deine Erfahrung mit BetLab\n\n" +
        "**Optional:**\n" +
        "📸 Füge einen Screenshot als Nachweis hinzu.\n" +
        "Dein Proof wird automatisch als übersichtliche Embed-Nachricht veröffentlicht.\n\n" +
        "💬 **Beispiel:**\n" +
        "`/betlabproof 50€ Promo erhalten.`\n\n" +
        "⚠️ **Wichtig:**\n" +
        "• Nur Mitglieder mit der BetLab-Rolle können Proofs posten.\n" +
        "• Alle Proofs werden automatisch mit Datum & Uhrzeit versehen.\n" +
        "• Fake-Proofs oder Missbrauch werden entfernt.\n\n" +
        "Vielen Dank für eure Unterstützung und viel Erfolg bei BetLab! 🍀"
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
    .setTitle("⭐️⭐️⭐️⭐️⭐️")
    .setDescription(
      `${proofText}\n\n` +
      `📅 Datum\n${date}\n\n` +
      `🕞 Uhrzeit\n${time}\n\n` +
      `👤 User\n<@${i.user.id}>`
    )
    .setAuthor({
      name: i.user.username,
      iconURL: i.user.displayAvatarURL()
    })
    .setThumbnail(i.user.displayAvatarURL())
    .setFooter({ text: `BetLab Proof System | heute um ${time} Uhr` });

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
