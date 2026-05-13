const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { log } = require("./logger");

const TEAM_ROLE_ID = "963870711678640188";
const COLOR = 0xE67E22;

function isTeam(i) {
  return i.member && i.member.roles && i.member.roles.cache.has(TEAM_ROLE_ID);
}

// ─── BAN ──────────────────────────────────────────────────────────────────────

async function betlabban(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabban ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  const target = i.options.getUser("user");
  const reason = i.options.getString("grund") || "Kein Grund angegeben";
  const deleteMessages = i.options.getInteger("delete_messages") || 0;

  await i.deferReply({ flags: 64 });

  try {
    await i.guild.members.ban(target.id, {
      reason: reason,
      deleteMessageSeconds: deleteMessages * 86400 // Tage in Sekunden
    });

    log(i.client, "MOD", "User gebannt",
      "Target: " + target.tag + " (" + target.id + ")\n" +
      "Grund: " + reason + "\n" +
      "Nachrichten gelöscht: " + deleteMessages + " Tage\n" +
      "Moderator: " + i.user.tag,
      i.user
    );

    return i.editReply("✅ **" + target.tag + "** wurde gebannt.\nGrund: " + reason);
  } catch(e) {
    log(i.client, "ERROR", "Ban fehlgeschlagen",
      "Target: " + target.tag + "\n" +
      "Fehler: " + e.message,
      i.user
    );
    return i.editReply("❌ Fehler beim Bannen: " + e.message);
  }
}

// ─── UNBAN ────────────────────────────────────────────────────────────────────

async function betlabunban(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabunban ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  const userId = i.options.getString("user_id");
  const reason = i.options.getString("grund") || "Kein Grund angegeben";

  await i.deferReply({ flags: 64 });

  try {
    await i.guild.members.unban(userId, reason);

    log(i.client, "MOD", "User entbannt",
      "User ID: " + userId + "\n" +
      "Grund: " + reason + "\n" +
      "Moderator: " + i.user.tag,
      i.user
    );

    return i.editReply("✅ User **" + userId + "** wurde entbannt.\nGrund: " + reason);
  } catch(e) {
    log(i.client, "ERROR", "Unban fehlgeschlagen",
      "User ID: " + userId + "\n" +
      "Fehler: " + e.message,
      i.user
    );
    return i.editReply("❌ Fehler beim Entbannen: " + e.message);
  }
}

// ─── KICK ─────────────────────────────────────────────────────────────────────

async function betlabkick(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabkick ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  const target = i.options.getUser("user");
  const reason = i.options.getString("grund") || "Kein Grund angegeben";

  await i.deferReply({ flags: 64 });

  try {
    const member = await i.guild.members.fetch(target.id);
    await member.kick(reason);

    log(i.client, "MOD", "User gekickt",
      "Target: " + target.tag + " (" + target.id + ")\n" +
      "Grund: " + reason + "\n" +
      "Moderator: " + i.user.tag,
      i.user
    );

    return i.editReply("✅ **" + target.tag + "** wurde gekickt.\nGrund: " + reason);
  } catch(e) {
    log(i.client, "ERROR", "Kick fehlgeschlagen",
      "Target: " + target.tag + "\n" +
      "Fehler: " + e.message,
      i.user
    );
    return i.editReply("❌ Fehler beim Kicken: " + e.message);
  }
}

// ─── TIMEOUT ──────────────────────────────────────────────────────────────────

async function betlabtimeout(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabtimeout ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  const target = i.options.getUser("user");
  const duration = i.options.getInteger("dauer"); // in Minuten
  const reason = i.options.getString("grund") || "Kein Grund angegeben";

  await i.deferReply({ flags: 64 });

  try {
    const member = await i.guild.members.fetch(target.id);
    await member.timeout(duration * 60 * 1000, reason);

    log(i.client, "MOD", "User getimeouted",
      "Target: " + target.tag + " (" + target.id + ")\n" +
      "Dauer: " + duration + " Minuten\n" +
      "Grund: " + reason + "\n" +
      "Moderator: " + i.user.tag,
      i.user
    );

    return i.editReply("✅ **" + target.tag + "** wurde für **" + duration + " Minuten** getimeouted.\nGrund: " + reason);
  } catch(e) {
    log(i.client, "ERROR", "Timeout fehlgeschlagen",
      "Target: " + target.tag + "\n" +
      "Fehler: " + e.message,
      i.user
    );
    return i.editReply("❌ Fehler beim Timeout: " + e.message);
  }
}

// ─── UNTIMEOUT ────────────────────────────────────────────────────────────────

async function betlabuntimeout(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabuntimeout ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  const target = i.options.getUser("user");
  const reason = i.options.getString("grund") || "Kein Grund angegeben";

  await i.deferReply({ flags: 64 });

  try {
    const member = await i.guild.members.fetch(target.id);
    await member.timeout(null, reason);

    log(i.client, "MOD", "Timeout aufgehoben",
      "Target: " + target.tag + " (" + target.id + ")\n" +
      "Grund: " + reason + "\n" +
      "Moderator: " + i.user.tag,
      i.user
    );

    return i.editReply("✅ Timeout von **" + target.tag + "** wurde aufgehoben.\nGrund: " + reason);
  } catch(e) {
    log(i.client, "ERROR", "Untimeout fehlgeschlagen",
      "Target: " + target.tag + "\n" +
      "Fehler: " + e.message,
      i.user
    );
    return i.editReply("❌ Fehler beim Untimeout: " + e.message);
  }
}

// ─── WARN ─────────────────────────────────────────────────────────────────────

async function betlabwarn(i) {
  if (!isTeam(i)) {
    log(i.client, "WARN", "Unberechtigter Zugriff",
      "User: " + i.user.tag + " versuchte /betlabwarn ohne Team-Rolle",
      i.user
    );
    return i.reply({ content: "Keine Berechtigung.", flags: 64 });
  }

  const target = i.options.getUser("user");
  const reason = i.options.getString("grund") || "Kein Grund angegeben";

  await i.deferReply({ flags: 64 });

  // DM an User senden
  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle("⚠️ Verwarnung")
          .setDescription(
            "Du wurdest auf **" + i.guild.name + "** verwarnt.\n\n" +
            "**Grund:**\n" + reason + "\n\n" +
            "Bitte halte dich an die Server-Regeln!"
          )
      ]
    });
  } catch(e) {
    console.log("Konnte Warnung nicht per DM senden:", e.message);
  }

  log(i.client, "MOD", "User verwarnt",
    "Target: " + target.tag + " (" + target.id + ")\n" +
    "Grund: " + reason + "\n" +
    "Moderator: " + i.user.tag,
    i.user
  );

  return i.editReply("✅ **" + target.tag + "** wurde verwarnt.\nGrund: " + reason);
}

// ─── Command Router ───────────────────────────────────────────────────────────

async function handleModerationCommands(i) {
  const name = i.commandName;
  if (name === "betlabban")       { betlabban(i);       return true; }
  if (name === "betlabunban")     { betlabunban(i);     return true; }
  if (name === "betlabkick")      { betlabkick(i);      return true; }
  if (name === "betlabtimeout")   { betlabtimeout(i);   return true; }
  if (name === "betlabuntimeout") { betlabuntimeout(i); return true; }
  if (name === "betlabwarn")      { betlabwarn(i);      return true; }
  return false;
}

module.exports = { handleModerationCommands };
