// ================= CONFIG =================
const CATEGORY_ID      = "1496986849372143827";
const MEMBER_CHANNEL   = "1496987357230923796";
const BETLAB_CHANNEL   = "1496989929765339296";

const ROLE_BETLAB      = "963871826637905991";
const ROLE_MEMBER      = "963867044376371320";

async function updateStats(guild) {
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

    if (memberChannel) {
      await memberChannel.setName("MEMBER: " + memberCount).catch(function() {});
    }

    if (betlabChannel) {
      await betlabChannel.setName("[BETLAB]: " + betlabCount).catch(function() {});
    }

  } catch (e) {
    console.error("Stats Fehler:", e && e.message ? e.message : e);
  }
}

module.exports = { updateStats };
