const { EmbedBuilder } = require("discord.js");

const LOG_CHANNEL_ID = "963870194172829696";
const IMAGE = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";

const COLORS = {
  INFO:    "#3498db",
  SUCCESS: "#57F287",
  WARN:    "#FEE75C",
  ERROR:   "#ED4245",
  MOD:     "#E67E22",
  TICKET:  "#9B59B6",
  INVITE:  "#5865F2",
  JOIN:    "#2ECC71",
  LEAVE:   "#95A5A6",
  MESSAGE: "#1ABC9C",
  EMBED:   "#E91E63",
  STATS:   "#00BCD4"
};

async function log(client, type, action, details, user) {
  if (details === undefined) details = "-";
  if (user === undefined) user = null;

  try {
    const ch =
      client.channels.cache.get(LOG_CHANNEL_ID) ||
      await client.channels.fetch(LOG_CHANNEL_ID).catch(function() { return null; });

    if (!ch) {
      console.error("LOG ERROR: Log-Channel nicht gefunden (" + LOG_CHANNEL_ID + ")");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS[type] || COLORS.INFO)
      .setTitle("BETLAB LOG - " + type)
      .setDescription("**" + action + "**\n\n" + details)
      .setImage(IMAGE)
      .setTimestamp();

    if (user) {
      embed.addFields({ name: "User", value: user.tag + " (" + user.id + ")" });
    }

    await ch.send({ embeds: [embed] }).catch(function(err) {
      console.error("LOG SEND FAILED:", err.message);
      console.error("Versuchte zu loggen:", type, action, details);
    });
  } catch (e) {
    console.error("LOG ERROR:", e && e.message ? e.message : e);
    console.error("Versuchte zu loggen:", type, action, details);
  }
}

module.exports = { log };
