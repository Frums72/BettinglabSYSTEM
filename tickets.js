const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder
} = require("discord.js");

const { log } = require("./logger");

const CATEGORY_ID     = "1496997563637698580";
const SUPPORT_ROLE_ID = "963870711678640188";
const IMAGE = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";
const COLOR = 0xE67E22;

const tickets = new Map();
// userTickets: userId -> channelId (um doppelte Tickets zu verhindern)
const userTickets = new Map();
const PRIORITY_LEVELS = ["keine", "Low", "Medium", "High"];

// FIX: Tickets nach Bot-Restart wiederherstellen
async function restoreTickets(guild, client) {
  try {
    const category = guild.channels.cache.get(CATEGORY_ID);
    if (!category || category.type !== ChannelType.GuildCategory) return;

    let restored = 0;
    category.children.cache.forEach(function(channel) {
      // Nur Text-Channels die mit "ticket-" beginnen
      if (channel.type !== ChannelType.GuildText) return;
      if (!channel.name.startsWith("ticket-")) return;

      // Creator aus Permissions extrahieren
      const permissions = channel.permissionOverwrites.cache;
      let creatorId = null;

      permissions.forEach(function(perm, id) {
        // Nicht die Guild-ID oder Support-Role
        if (id === guild.id || id === SUPPORT_ROLE_ID) return;
        // User mit ViewChannel Permission = Creator
        if (perm.allow.has(PermissionFlagsBits.ViewChannel)) {
          creatorId = id;
        }
      });

      if (!creatorId) return;

      // In Maps eintragen
      userTickets.set(creatorId, channel.id);
      tickets.set(channel.id, {
        category: "Unknown",
        creator: creatorId,
        claimedBy: null,
        priority: "keine",
        messageId: null,
        createdAt: channel.createdTimestamp || Date.now()
      });

      restored++;
    });

    if (restored > 0) {
      log(client, "INFO", "Tickets wiederhergestellt",
        restored + " offene Tickets nach Bot-Restart wiederhergestellt"
      );
    }
  } catch (e) {
    log(client, "ERROR", "Ticket-Restore fehlgeschlagen", e.message);
  }
}

async function sendPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("🎫 Access and Support")
    .setDescription(
      "Bitte wähle die richtige Kategorie für dein Ticket aus.\n\n" +
      "📥 **Allgemeiner Support**\n" +
      "Allgemeine Fragen die nicht öffentlich beantwortet werden können.\n\n" +
      "📢 **Promo**\n" +
      "Du möchtest deine Promo anfordern? (Zugang zum Discord, Promo-Aktion..)\n\n" +
      "📝 **Bewerbung**\n" +
      "Derzeit läuft eine Bewerbungsphase? Hier kannst du dich bewerben!\n\n" +
      "🐞 **Bug Report**\n" +
      "Du hast einen Fehler gefunden oder etwas funktioniert nicht?\nHier kannst du es direkt ans Team melden!\n\n" +
      "⚠️ **Bitte beachte:**\n" +
      "Tickets werden schnellstmöglich bearbeitet, wir bitten um Geduld!"
    )
    .setImage(IMAGE);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("Kategorie auswählen")
    .addOptions([
      { label: "Support",    value: "Support",    emoji: "📥" },
      { label: "Promo",      value: "Promo",      emoji: "📢" },
      { label: "Bewerbung",  value: "Bewerbung",  emoji: "📝" },
      { label: "Bug Report", value: "Bug",        emoji: "🐞" }
    ]);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

function buildTicketEmbed(d) {
  const created = new Date(d.createdAt).toLocaleString("de-DE");
  return new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(
      "<@" + d.creator + ">, Willkommen im Support!\n\n" +
      "👤 Bearbeiter: " + (d.claimedBy ? "<@" + d.claimedBy + ">" : "noch niemand") + "\n" +
      "📁 Kategorie: " + d.category + "\n" +
      "🕞 Zeitpunkt: " + created + "\n\n" +
      "💬 Bitte beschreibe dein Anliegen so genau wie möglich. Jemand aus unserem Support Team wird dir schnellstmöglich weiterhelfen!"
    )
    .setImage(IMAGE);
}

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("priority_ticket").setLabel("Priority").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
  );
}

async function updateTicket(channel, d) {
  if (!d || !d.messageId) return;
  const msg = await channel.messages.fetch(d.messageId).catch(function() { return null; });
  if (!msg) return;
  await msg.edit({ embeds: [buildTicketEmbed(d)], components: [buildButtons()] });
}

async function handleInteraction(i, client) {

  // CREATE
  if (i.isStringSelectMenu() && i.customId === "ticket_select") {
    await i.deferReply({ flags: 64 });

    // Prüfen ob User bereits ein offenes Ticket hat
    const existingChannelId = userTickets.get(i.user.id);
    if (existingChannelId) {
      const existingChannel = i.guild.channels.cache.get(existingChannelId);
      if (existingChannel) {
        return i.editReply({
          content: "Du hast bereits ein offenes Ticket: " + existingChannel.toString() + "\nBitte schließe es zuerst bevor du ein neues eröffnest."
        });
      } else {
        // Channel existiert nicht mehr, Eintrag entfernen
        userTickets.delete(i.user.id);
      }
    }

    const category = i.values[0];
    const safeName = ("ticket-" + category.toLowerCase() + "-" + i.user.username).slice(0, 100);

    const channel = await i.guild.channels.create({
      name: safeName,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ]
    });

    const d = {
      category: category,
      creator: i.user.id,
      claimedBy: null,
      priority: "keine",
      messageId: null,
      createdAt: Date.now()
    };

    tickets.set(channel.id, d);
    userTickets.set(i.user.id, channel.id);

    await channel.send("<@" + i.user.id + "> <@&" + SUPPORT_ROLE_ID + ">");

    const msg = await channel.send({
      embeds: [buildTicketEmbed(d)],
      components: [buildButtons()]
    });

    d.messageId = msg.id;

    log(client, "TICKET", "Ticket erstellt", "Kategorie: " + category + "\nUser: " + i.user.tag, i.user);

    return i.editReply({ content: "Dein Ticket wurde erstellt: " + channel.toString() });
  }

  if (!i.isButton()) return;

  const d = tickets.get(i.channel && i.channel.id);
  if (!d) return;

  // CLAIM - nur Team
  if (i.customId === "claim_ticket") {
    if (!i.member.roles.cache.has(SUPPORT_ROLE_ID)) {
      log(client, "WARN", "Unberechtigter Zugriff",
        "User: " + i.user.tag + " versuchte Ticket zu claimen ohne Support-Rolle",
        i.user
      );
      return i.reply({ content: "Nur das Support-Team kann Tickets claimen.", flags: 64 });
    }
    d.claimedBy = i.user.id;
    await updateTicket(i.channel, d);
    log(client, "TICKET", "Ticket geclaimed", "Channel: " + i.channel.name, i.user);
    return i.reply({ content: "🙋 Ticket übernommen von <@" + i.user.id + ">" });
  }

  // PRIORITY - nur Team
  if (i.customId === "priority_ticket") {
    if (!i.member.roles.cache.has(SUPPORT_ROLE_ID)) {
      log(client, "WARN", "Unberechtigter Zugriff",
        "User: " + i.user.tag + " versuchte Priority zu ändern ohne Support-Rolle",
        i.user
      );
      return i.reply({ content: "Nur das Support-Team kann die Priority ändern.", flags: 64 });
    }
    const idx = PRIORITY_LEVELS.indexOf(d.priority);
    d.priority = PRIORITY_LEVELS[(idx + 1) % PRIORITY_LEVELS.length];
    await updateTicket(i.channel, d);
    log(client, "TICKET", "Priority geändert", "Priority: " + d.priority, i.user);
    return i.reply({ content: "Priority: " + d.priority, flags: 64 });
  }

  // CLOSE - nur Team
  if (i.customId === "close_ticket") {
    if (!i.member.roles.cache.has(SUPPORT_ROLE_ID)) {
      log(client, "WARN", "Unberechtigter Zugriff",
        "User: " + i.user.tag + " versuchte Ticket zu schließen ohne Support-Rolle",
        i.user
      );
      return i.reply({ content: "Nur das Support-Team kann Tickets schließen.", flags: 64 });
    }

    await i.deferUpdate();

    const closedAt = new Date().toLocaleString("de-DE");
    const closedBy = i.user.username;

    const fetched = await i.channel.messages.fetch({ limit: 100 }).catch(function() { return null; });

    var transcriptText = "Ticket Transcript - " + i.channel.name + "\n";
    transcriptText += "Kategorie: " + d.category + " | Priority: " + d.priority + "\n";
    transcriptText += "Erstellt von: " + d.creator + " | Bearbeitet von: " + (d.claimedBy || "niemand") + "\n";
    transcriptText += "Geschlossen: " + closedAt + " von: " + closedBy + "\n";
    transcriptText += "----------------------------------------\n\n";

    if (fetched) {
      transcriptText += fetched
        .map(function(m) {
          return "[" + new Date(m.createdTimestamp).toLocaleString("de-DE") + "] " + m.author.tag + ": " + m.content;
        })
        .reverse()
        .join("\n");
    }

    const file = new AttachmentBuilder(
      Buffer.from(transcriptText, "utf8"),
      { name: "transcript-" + i.channel.name + ".txt" }
    );

    try {
      const creator = await client.users.fetch(d.creator);
      await creator.send({
        content: "Dein Ticket wurde geschlossen.",
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle("🔒 Ticket geschlossen")
            .setDescription(
              "Dein Ticket wurde erfolgreich geschlossen.\n\n" +
              "👤 Geschlossen von: " + closedBy + "\n" +
              "📁 Kategorie: " + d.category + "\n" +
              "🕞 Zeitpunkt: " + closedAt + "\n\n" +
              "💬 Solltest du weitere Fragen haben, kannst du jederzeit ein neues Ticket erstellen."
            )
            .setImage(IMAGE)
        ],
        files: [file]
      });
    } catch (e) {
      log(client, "WARN", "Ticket-Transcript konnte nicht gesendet werden",
        "User: " + d.creator + " | Error: " + e.message
      );
    }

    log(client, "TICKET", "Ticket geschlossen", "Channel: " + i.channel.name + "\nGeschlossen von: " + closedBy, i.user);

    userTickets.delete(d.creator);
    tickets.delete(i.channel.id);

    await i.channel.send("Ticket wird geschlossen...");
    setTimeout(function() {
      i.channel.delete().catch(function() {});
    }, 3000);
  }
}

module.exports = { sendPanel, handleInteraction, restoreTickets };
