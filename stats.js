// ================= CONFIG =================
const CATEGORY_ID      = "1496986849372143827";
const MEMBER_CHANNEL   = "1496987357230923796";
const BETLAB_CHANNEL   = "1496989929765339296";

const ROLE_BETLAB      = "963871826637905991";
const ROLE_MEMBER      = "963867044376371320";

const { log } = require("./logger");

async function updateStats(guild, client) {
  try {
    await guild.members.fetch();

    const members = guild.members.cache.filter(function(m) {
      return !m.user.bot && m.roles.cache.has(ROLE_MEMBER);
    });

    const betlab = guild.members.cache.filter(function(m) {
      return !m.user.bot && m.roles.cache.has(ROLE_BETLAB);
    });

    const memberCount = members.size;
    const betlabCount = betlab.size;

    const memberChannel = guild.channels.cache.get(MEMBER_CHANNEL);
    const betlabChannel = guild.channels.cache.get(BETLAB_CHANNEL);

    let updated = false;

    if (memberChannel) {
      const newName = "MEMBER: " + memberCount;
      if (memberChannel.name !== newName) {
        await memberChannel.setName(newName).catch(function() {});
        updated = true;
      }
    }

    if (betlabChannel) {
      const newName = "[BETLAB]: " + betlabCount;
      if (betlabChannel.name !== newName) {
        await betlabChannel.setName(newName).catch(function() {});
        updated = true;
      }
    }

    // NEU: Nur loggen wenn tatsächlich was geändert wurde
    if (updated && client) {
      log(client, "STATS", "Stats aktualisiert",
        "Member: " + memberCount + "\nBETLAB: " + betlabCount
      );
    }

  } catch (e) {
    console.error("Stats Fehler:", e && e.message ? e.message : e);
    if (client) {
      log(client, "ERROR", "Stats Update fehlgeschlagen", e && e.message ? e.message : String(e));
    }
  }
}

module.exports = { updateStats };
