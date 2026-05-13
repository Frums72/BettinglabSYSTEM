# 🎮 Bettinglabbot v2.0

Ein vollständiger Discord Bot mit Level-System, Economy, Invites, Tickets, Moderation und Automod.

## ✨ Features

### 🆙 Level System
- XP sammeln durch Nachrichten schreiben
- 100 Level mit exponentieller XP-Kurve  
- Automatische Level-Rollen
- Schöne Level-Up Benachrichtigungen
- Leaderboard System

### 🪙 Economy System
- Coins verdienen durch Level-Ups
- Coinflip Minigame
- Stats Commands

### 👥 Invite Tracking
- Normal & Betlab Invites
- Automatisches Tracking
- Leaderboard
- Join/Leave Logging

### 🎫 Ticket System
- Multi-Kategorie Support
- Claim & Priority System
- Auto-Transcripts
- Bot-Restart sicher

### 🛡️ Moderation
- Ban, Unban, Kick
- Timeout System
- Warn System mit DM
- Vollständiges Logging

### 🤖 Automod
- Spam-Erkennung
- Link-Filter
- Discord Invite-Blocker
- Automatische Timeouts

### 📊 Stats & Logging
- Member & Betlab Counter
- Alle Moderations-Aktionen
- Level-Ups & Coins
- Permission-Fails

## 🚀 Installation

### 1. Dependencies
```bash
npm install
```

### 2. Umgebungsvariablen (.env)
```env
TOKEN=dein_bot_token
CLIENT_ID=deine_client_id
SUPABASE_URL=deine_supabase_url
SUPABASE_KEY=dein_supabase_key
```

### 3. Datenbank Setup
- Öffne Supabase SQL Editor
- Führe `SETUP_DATABASE.sql` aus

### 4. Config anpassen

#### Level-Rollen (levels.js)
```javascript
const LEVEL_ROLES = {
  5:  "ROLE_ID",
  10: "ROLE_ID",
  25: "ROLE_ID",
  50: "ROLE_ID",
  75: "ROLE_ID",
  100: "ROLE_ID"
};
```

#### Channel & Rollen IDs
- `stats.js` - Stats Channel IDs & Rollen
- `tickets.js` - Ticket Category & Support Role
- `logger.js` - Log Channel ID
- Alle Module - `TEAM_ROLE_ID`

### 5. Bot starten
```bash
npm start
```

## 📋 Commands

### Level & Economy
```
/betlabxp [user]           - XP Stats
/betlabcoins [user]        - Coin Stats
/betlableaderboard         - Top 10 Ranking
/betlabcoinflip <anzahl>   - Coinflip
/betlabcf <anzahl>         - Coinflip (Kurzform)
```

### Invites
```
/betlabinvites [user]      - Invite Stats
/betlabranking             - Top 5 Invites
/betlabsendbetlab          - Betlab Invites vergeben
```

### Moderation
```
/betlabban <user>          - User bannen
/betlabkick <user>         - User kicken
/betlabtimeout <user>      - User timeouten
/betlabwarn <user>         - User verwarnen
/betlabclearchat <anzahl>  - Nachrichten löschen
```

### System
```
/betlabhelp                - Alle Commands
/betlabsend                - Embed Builder
/betlabsendticketpanel     - Ticket Panel
```

### Admin
```
/betlabeditcoins           - Coins setzen
/betlabeditxp              - XP setzen
/betlabinvitesedit         - Invites setzen
```

## 🗂️ Dateistruktur

```
├── index.js           # Hauptdatei
├── invites.js         # Invite System
├── levels.js          # Level & Economy
├── moderation.js      # Moderation Commands
├── tickets.js         # Ticket System
├── automod.js         # Automod
├── embedbuilder.js    # Embed Builder
├── stats.js           # Stats Channels
├── logger.js          # Logging System
├── db.js              # Supabase Client
├── package.json       # Dependencies
└── SETUP_DATABASE.sql # DB Schema
```

## ⚙️ Konfiguration

### XP System (levels.js)
```javascript
const XP_PER_MESSAGE = { min: 15, max: 25 };
const XP_COOLDOWN_MS = 60000;  // 1 Minute
const COINS_PER_LEVELUP = 1;
```

### Automod (automod.js)
```javascript
const SPAM_THRESHOLD = 5;       // Nachrichten
const SPAM_WINDOW_MS = 5000;    // 5 Sekunden
const TIMEOUT_SPAM_MS = 5 * 60 * 1000;   // 5 Min
const TIMEOUT_LINKS_MS = 10 * 60 * 1000; // 10 Min
```

### Permissions (alle Dateien)
```javascript
const TEAM_ROLE_ID = "963870711678640188";
```

## 📊 Datenbank Schema

### levels
```sql
user_id         TEXT PRIMARY KEY
xp              INTEGER
level           INTEGER (1-100)
coins           INTEGER
total_messages  INTEGER
```

### invites
```sql
user_id  TEXT PRIMARY KEY
normal   INTEGER
betlab   INTEGER
```

### join_tracker
```sql
member_id   TEXT PRIMARY KEY
inviter_id  TEXT
code        TEXT
joined_at   TIMESTAMP
```

## 🔐 Benötigte Permissions

### Bot Permissions
- Manage Roles
- Manage Channels
- Kick Members
- Ban Members
- Timeout Members
- Manage Messages
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- View Channel

### Intents
- Guilds
- GuildMembers
- GuildInvites
- GuildMessages
- MessageContent

## 🆘 Troubleshooting

### Commands werden nicht angezeigt
- Bot neustarten
- 5 Minuten warten
- CLIENT_ID prüfen

### Level-Rollen funktionieren nicht
- Rollen-IDs in levels.js prüfen
- Bot höher als Ziel-Rollen
- "Manage Roles" Permission

### XP wird nicht vergeben
- MessageContent Intent aktiviert?
- 1 Minute Cooldown beachten
- Bots bekommen kein XP

### Logging funktioniert nicht
- LOG_CHANNEL_ID in logger.js prüfen
- Bot hat Send Messages in Log-Channel?

## 📈 Performance

- XP Cooldown verhindert Spam
- Cleanup alle 15s (Automod) / 5 Min (XP)
- DB Indexes für schnelle Queries
- Race Conditions behoben

## 🔄 Updates

Von Version 1.1 → 2.0:
1. Alte Dateien ersetzen
2. `SETUP_DATABASE.sql` ausführen
3. Level-Rollen IDs eintragen
4. Bot neustarten

Keine Daten gehen verloren! ✅

## 📝 Changelog

Siehe `CHANGELOG.md` für alle Änderungen.

## 🎯 Roadmap

- [ ] Warn System mit DB Tracking
- [ ] Custom XP Multiplier Events
- [ ] Shop System
- [ ] Daily Rewards
- [ ] Reaction Roles

## 👥 Support

Bei Fragen oder Problemen:
1. Logs prüfen (`/betlabhelp`)
2. Supabase Logs prüfen
3. Console Output prüfen

## 📄 License

MIT License - Frei verwendbar

---

**Version 2.0** • Made with ❤️ for Bettinglab
