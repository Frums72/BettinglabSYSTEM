const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const TEAM_ROLE_ID = "963870711678640188";
const DEFAULT_IMAGE = "https://s1.directupload.eu/images/260424/twd9ydz3.jpg";
const DEFAULT_COLOR = 0xE67E22;

const sessions = new Map();

function isTeam(i) {
  return i.member && i.member.roles && i.member.roles.cache.has(TEAM_ROLE_ID);
}

function hexToInt(hex) {
  if (!hex) return DEFAULT_COLOR;
  const clean = hex.replace("#", "");
  const parsed = parseInt(clean, 16);
  return isNaN(parsed) ? DEFAULT_COLOR : parsed;
}

function buildPreviewEmbed(session) {
  return new EmbedBuilder()
    .setColor(session.color || DEFAULT_COLOR)
    .setTitle(session.title || "(Kein Titel)")
    .setDescription(session.description || "(Kein Text)")
    .setImage(session.image || DEFAULT_IMAGE);
}

function buildPreviewButtons(sessionId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("eb_edit_" + sessionId)
      .setLabel("\u270F\uFE0F Bearbeiten")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("eb_send_" + sessionId)
      .setLabel("\u2705 Senden")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("eb_cancel_" + sessionId)
      .setLabel("\u274C Abbrechen")
      .setStyle(ButtonStyle.Danger)
  );
}

// Step 1: /betlabsend -> direkt Modal mit Channel-ID + Embed-Felder
async function startEmbedBuilder(i) {
  if (!isTeam(i)) return i.reply({ content: "Keine Berechtigung.", flags: 64 });

  const sessionId = i.user.id + "_" + Date.now();

  sessions.set(sessionId, {
    channelId: null,
    title: "",
    description: "",
    image: DEFAULT_IMAGE,
    color: DEFAULT_COLOR
  });

  const modal = new ModalBuilder()
    .setCustomId("eb_modal_" + sessionId)
    .setTitle("Embed Builder");

  const channelInput = new TextInputBuilder()
    .setCustomId("eb_channel")
    .setLabel("Channel-ID")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("z.B. 1234567890123456789")
    .setRequired(true)
    .setMaxLength(25);

  const titleInput = new TextInputBuilder()
    .setCustomId("eb_title")
    .setLabel("Titel")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Titel des Embeds")
    .setRequired(true)
    .setMaxLength(256);

  const descInput = new TextInputBuilder()
    .setCustomId("eb_desc")
    .setLabel("Text / Beschreibung")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Dein Text hier...")
    .setRequired(true)
    .setMaxLength(4000);

  const imageInput = new TextInputBuilder()
    .setCustomId("eb_image")
    .setLabel("Bild URL (leer = Standard)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("https://...")
    .setRequired(false)
    .setMaxLength(500);

  const colorInput = new TextInputBuilder()
    .setCustomId("eb_color")
    .setLabel("Farbe Hex (leer = #E67E22)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("#E67E22")
    .setRequired(false)
    .setMaxLength(7);

  modal.addComponents(
    new ActionRowBuilder().addComponents(channelInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(imageInput),
    new ActionRowBuilder().addComponents(colorInput)
  );

  await i.showModal(modal);
}

// Step 2: Modal submitted -> Vorschau
async function handleModal(i, sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return i.reply({ content: "Session abgelaufen. Bitte /betlabsend nochmal verwenden.", flags: 64 });

  const channelId = i.fields.getTextInputValue("eb_channel").trim();
  const title     = i.fields.getTextInputValue("eb_title");
  const desc      = i.fields.getTextInputValue("eb_desc");
  const image     = i.fields.getTextInputValue("eb_image");
  const color     = i.fields.getTextInputValue("eb_color");

  // Channel ID validieren
  const channel = i.guild.channels.cache.get(channelId) ||
    await i.guild.channels.fetch(channelId).catch(function() { return null; });

  if (!channel) {
    return i.reply({
      content: "\u274C Channel-ID nicht gefunden: `" + channelId + "`\nBitte pr\u00FCfe die ID und versuche es erneut mit /betlabsend.",
      flags: 64
    });
  }

  session.channelId   = channelId;
  session.title       = title;
  session.description = desc;
  session.image       = image && image.startsWith("http") ? image : DEFAULT_IMAGE;
  session.color       = color ? hexToInt(color) : DEFAULT_COLOR;

  await i.reply({
    content: "**Vorschau** \u2192 Ziel: <#" + channelId + ">",
    embeds: [buildPreviewEmbed(session)],
    components: [buildPreviewButtons(sessionId)],
    flags: 64
  });
}

// Step 3: Bearbeiten -> Modal nochmal mit bestehenden Werten
async function openEditModal(i, sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return i.reply({ content: "Session abgelaufen.", flags: 64 });

  const modal = new ModalBuilder()
    .setCustomId("eb_modal_" + sessionId)
    .setTitle("Embed bearbeiten");

  const channelInput = new TextInputBuilder()
    .setCustomId("eb_channel")
    .setLabel("Channel-ID")
    .setStyle(TextInputStyle.Short)
    .setValue(session.channelId || "")
    .setRequired(true)
    .setMaxLength(25);

  const titleInput = new TextInputBuilder()
    .setCustomId("eb_title")
    .setLabel("Titel")
    .setStyle(TextInputStyle.Short)
    .setValue(session.title || "")
    .setRequired(true)
    .setMaxLength(256);

  const descInput = new TextInputBuilder()
    .setCustomId("eb_desc")
    .setLabel("Text / Beschreibung")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(session.description || "")
    .setRequired(true)
    .setMaxLength(4000);

  const imageInput = new TextInputBuilder()
    .setCustomId("eb_image")
    .setLabel("Bild URL (leer = Standard)")
    .setStyle(TextInputStyle.Short)
    .setValue(session.image === DEFAULT_IMAGE ? "" : (session.image || ""))
    .setRequired(false)
    .setMaxLength(500);

  const colorInput = new TextInputBuilder()
    .setCustomId("eb_color")
    .setLabel("Farbe Hex (leer = #E67E22)")
    .setStyle(TextInputStyle.Short)
    .setValue("")
    .setRequired(false)
    .setMaxLength(7);

  modal.addComponents(
    new ActionRowBuilder().addComponents(channelInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(imageInput),
    new ActionRowBuilder().addComponents(colorInput)
  );

  await i.showModal(modal);
}

// Step 4: Senden
async function handleSend(i, sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return i.reply({ content: "Session abgelaufen.", flags: 64 });

  const channel = i.guild.channels.cache.get(session.channelId) ||
    await i.guild.channels.fetch(session.channelId).catch(function() { return null; });

  if (!channel) return i.reply({ content: "Channel nicht gefunden.", flags: 64 });

  await channel.send({ embeds: [buildPreviewEmbed(session)] });

  sessions.delete(sessionId);

  await i.update({
    content: "",
    embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("\u2705 Gesendet!")
        .setDescription("Der Embed wurde in <#" + channel.id + "> gesendet.")
    ],
    components: []
  });
}

// Step 5: Abbrechen
async function handleCancel(i, sessionId) {
  sessions.delete(sessionId);
  await i.update({
    content: "",
    embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("\u274C Abgebrochen")
        .setDescription("Der Embed Builder wurde abgebrochen.")
    ],
    components: []
  });
}

// ================= MAIN HANDLER =================
async function handleEmbedBuilder(i) {
  if (i.isButton()) {
    if (i.customId.startsWith("eb_edit_")) {
      const sessionId = i.customId.replace("eb_edit_", "");
      return openEditModal(i, sessionId);
    }
    if (i.customId.startsWith("eb_send_")) {
      const sessionId = i.customId.replace("eb_send_", "");
      return handleSend(i, sessionId);
    }
    if (i.customId.startsWith("eb_cancel_")) {
      const sessionId = i.customId.replace("eb_cancel_", "");
      return handleCancel(i, sessionId);
    }
  }

  if (i.isModalSubmit() && i.customId.startsWith("eb_modal_")) {
    const sessionId = i.customId.replace("eb_modal_", "");
    return handleModal(i, sessionId);
  }

  return false;
}

module.exports = { startEmbedBuilder, handleEmbedBuilder };
