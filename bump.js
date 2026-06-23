const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { log } = require("./logger");

const TEAM_CHAT_CHANNEL = "963870162149310504";
const TEAM_ROLE_ID = "963870711678640188";

let lastBumpTime = null;

async function startBumpReminder(client) {
  console.log("🔔 Auto-Bump System gestartet (alle 120 Minuten)");
  
  // Sofort einmal beim Start prüfen
  checkAndPostBump(client);
  
  // Dann alle 120 Minuten
  setInterval(() => {
    checkAndPostBump(client);
  }, 120 * 60 * 1000);
}

async function checkAndPostBump(client) {
  try {
    const ch = client.channels.cache.get(TEAM_CHAT_CHANNEL) || 
               await client.channels.fetch(TEAM_CHAT_CHANNEL).catch(() => null);
    
    if (!ch) {
      console.error("❌ Team Chat Channel nicht gefunden");
      return;
    }
    
    // Prüfe ob letzte Bump-Nachricht älter als 115 Min ist (Sicherheitspuffer)
    const now = Date.now();
    if (lastBumpTime && (now - lastBumpTime) < (115 * 60 * 1000)) {
      console.log("⏭️ Zu früh für nächsten Bump (< 115 Min)");
      return;
    }
    
    // Sende Erinnerung
    const embed = new EmbedBuilder()
      .setColor(0xFFB700)
      .setTitle("🎺 DISBOARD BUMP VERFÜGBAR!")
      .setDescription(`<@&${TEAM_ROLE_ID}>\n\nDer Server kann jetzt wieder gebumpt werden! Klick auf den Button oder verwende \`/bump\` bei Disboard.\n\n📊 **Bump hilft unserem Server sichtbar zu bleiben!**`)
      .setFooter({ text: "Nächster Bump in 120 Minuten" })
      .setTimestamp();
    
    const btn = new ButtonBuilder()
      .setCustomId("bump_done")
      .setLabel("✅ Bump Erledigt")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🎺");
    
    const row = new ActionRowBuilder().addComponents(btn);
    
    const msg = await ch.send({
      content: `<@&${TEAM_ROLE_ID}>`,
      embeds: [embed],
      components: [row]
    });
    
    lastBumpTime = now;
    
    log(client, "INFO", "Disboard Bump Reminder", `Erinnerung gesendet im Team Chat\nNächster Bump in 120 Min`);
    console.log("✅ Bump Erinnerung gesendet");
    
  } catch (e) {
    console.error("❌ Bump Reminder Fehler:", e.message);
  }
}

async function handleBumpButton(i) {
  await i.deferUpdate().catch(() => {});
  
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("✅ Bump bestätigt!")
    .setDescription(`${i.user} hat den Server erfolgreich gebumpt! 🎺\n\nDanke für die Unterstützung!`)
    .setTimestamp();
  
  await i.editReply({
    content: null,
    embeds: [embed],
    components: []
  });
  
  const { log } = require("./logger");
  log(i.client, "SUCCESS", "Disboard Bump", `User: ${i.user.tag}\nBump erfolgreich!`, i.user);
}

module.exports = { startBumpReminder, handleBumpButton };
