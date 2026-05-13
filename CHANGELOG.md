# 🎮 Bot Update - Version 2.0

## 🆕 MASSIVE NEW FEATURES

### 🆙 **Level System (1-100)**
- ✨ **XP pro Nachricht:** 15-25 XP (zufällig)
- ⏱️ **Cooldown:** 1 Minute zwischen XP-Gains
- 📈 **Exponentielles Wachstum:** Formel: `100 * level^1.5`
- 🎉 **Level-Up Benachrichtigung:** Schöne Embed-Nachricht im Chat
- 👑 **Level-Rollen:** Automatisch bei Level 5, 10, 25, 50, 75, 100

### 🪙 **Coin System**
- 💰 **1 Coin pro Level-Up**
- 🎲 **Coinflip Minigame:** Setze Coins und verdopple sie (50/50 Chance)
- 📊 **Stats Commands:** `/betlabxp` und `/betlabcoins`
- 🏆 **Leaderboard:** Top 10 Ranking nach Level & XP

### 🛡️ **Moderation Commands**
- `/betlabban` - User bannen
- `/betlabunban` - User entbannen
- `/betlabkick` - User kicken  
- `/betlabtimeout` - User timeouten (1-40320 Minuten)
- `/betlabuntimeout` - Timeout aufheben
- `/betlabwarn` - User verwarnen (mit DM)
- **Alle mit vollständigem Logging!**

## 📋 Neue Commands

### Level & Economy
```
/betlabxp [user]              - XP Stats anzeigen
/betlabcoins [user]           - Coin Stats anzeigen
/betlableaderboard            - Top 10 Level Ranking
/betlabcoinflip <anzahl>      - Coinflip Minigame
/betlabcf <anzahl>            - Coinflip (Kurzform)
/betlabeditcoins <user> <anzahl>  - Coins setzen (Team only)
/betlabeditxp <user> <anzahl>     - XP setzen (Team only)
```

### Moderation
```
/betlabban <user> [grund] [delete_days]  - User bannen
/betlabunban <user_id> [grund]            - User entbannen
/betlabkick <user> [grund]                - User kicken
/betlabtimeout <user> <dauer> [grund]     - User timeouten
/betlabuntimeout <user> [grund]           - Timeout aufheben
/betlabwarn <user> <grund>                - User verwarnen
```

## 🔧 Fixes from Version 1.1

### 🔴 Kritische Fixes
1. ✅ **invites.js** - Race Condition Fix
2. ✅ **invites.js** - Command Router Fix
3. ✅ **tickets.js** - Bot-Restart Recovery

### ⚠️ Wichtige Verbesserungen
4. ✅ **logger.js** - Besseres Error Handling
5. ✅ **automod.js** - Optimiertes Cleanup
6. ✅ **embedbuilder.js** - Logging hinzugefügt
7. ✅ **stats.js** - Smartes Logging

## 📊 Neues Logging

### Jetzt geloggt:
- ✅ **Level-Ups** mit XP & Coins
- ✅ **Level-Rollen** Vergabe
- ✅ **Coinflips** (Einsatz & Ergebnis)
- ✅ **Coin/XP Edits** durch Admins
- ✅ **Bans, Kicks, Timeouts, Warns**
- ✅ **Unbans, Untimeouts**
- ✅ **Alle Permission-Fails**

## 🗄️ Datenbank Setup

### Neue Tabelle: `levels`
```sql
user_id         TEXT PRIMARY KEY
xp              INTEGER (XP Punkte)
level           INTEGER (1-100)
coins           INTEGER (Coins)
total_messages  INTEGER (Nachrichtenzähler)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Installation:
1. Öffne Supabase SQL Editor
2. Führe `SETUP_DATABASE.sql` aus
3. Fertig! ✅

## ⚙️ Konfiguration

### Level-Rollen (levels.js)
Ersetze in `levels.js` Zeile 13-20:
```javascript
const LEVEL_ROLES = {
  5:  "DEINE_ROLE_ID",    // Level 5 Rolle
  10: "DEINE_ROLE_ID",    // Level 10 Rolle
  25: "DEINE_ROLE_ID",    // etc...
  50: "DEINE_ROLE_ID",
  75: "DEINE_ROLE_ID",
  100: "DEINE_ROLE_ID"
};
```

### XP Config anpassen (levels.js)
```javascript
const XP_PER_MESSAGE = { min: 15, max: 25 };  // XP pro Nachricht
const XP_COOLDOWN_MS = 60000;                 // Cooldown (1 Min)
const COINS_PER_LEVELUP = 1;                  // Coins pro Level-Up
```

## 🚀 Installation

### 1. Dateien ersetzen
Alle `.js` Dateien in deinem Bot-Ordner ersetzen

### 2. Datenbank Setup
SQL Script in Supabase ausführen (`SETUP_DATABASE.sql`)

### 3. Level-Rollen IDs eintragen
In `levels.js` die Rollen-IDs für Level 5, 10, 25, 50, 75, 100 eintragen

### 4. Bot neustarten
```bash
npm start
```

### 5. Commands testen
```
/betlabhelp    - Alle Commands anzeigen
/betlabxp      - Deine XP Stats
/betlableaderboard  - Leaderboard ansehen
```

## 📝 Was funktioniert jetzt:

### ✅ Core Features
- Invites (mit Race Condition Fix)
- Tickets (Bot-Restart sicher)
- Automod (Spam & Links)
- Embed Builder
- Stats Channels

### ✅ NEW: Level System
- XP pro Nachricht (15-25 mit Cooldown)
- Level 1-100 mit exponentieller XP-Kurve
- Automatische Level-Rollen
- Schöne Level-Up Benachrichtigungen

### ✅ NEW: Economy
- Coins (1 pro Level-Up)
- Coinflip Minigame
- Admin Commands zum Setzen

### ✅ NEW: Moderation
- Ban, Unban, Kick
- Timeout, Untimeout  
- Warn (mit DM)
- Alles mit Logging

### ✅ Logging
- Alle Commands
- Alle Moderations-Aktionen
- Level-Ups & Coins
- Permission Fails

## 🎯 Performance

- **XP Cooldown:** Verhindert Spam
- **Cleanup:** Alle 5 Minuten (Automod & XP)
- **DB Optimiert:** Indexes für Leaderboard
- **Race Conditions:** Behoben

## 🔐 Permissions

Alle Admin-Commands benötigen die Team-Rolle:
```javascript
TEAM_ROLE_ID = "963870711678640188"
```

## 📈 Statistiken

- **Commands:** 27 Commands (vorher: 9)
- **Dateien:** 12 Dateien (vorher: 10)
- **Features:** 4 große neue Systeme
- **Log-Typen:** 12 verschiedene (vorher: 8)

## 🆘 Troubleshooting

### Level-Rollen funktionieren nicht?
→ Prüfe die Rollen-IDs in `levels.js`  
→ Bot muss höher als die Rollen sein  
→ Bot braucht "Manage Roles" Permission

### XP wird nicht vergeben?
→ Prüfe ob `MessageContent` Intent aktiviert ist  
→ Prüfe Cooldown (1 Minute zwischen XP)  
→ Bots bekommen kein XP

### Coinflip funktioniert nicht?
→ User muss Coins haben  
→ Einsatz muss > 0 sein

### Commands nicht sichtbar?
→ Bot neustarten  
→ Warte 5 Minuten  
→ Prüfe CLIENT_ID in `.env`

## 🔄 Migration von v1.1

1. ✅ Alte Dateien: Werden überschrieben
2. ✅ DB Struktur: Alte Tabellen bleiben
3. ✅ Neue Tabelle: `levels` wird erstellt
4. ✅ Configs: TEAM_ROLE_ID bleibt gleich

**WICHTIG:** Trage die Level-Rollen-IDs ein!

---

## 🎉 Das war's!

**Version 2.0** ist ready!  
**27 Commands** insgesamt  
**4 neue Systeme** (Level, Coins, Moderation, Logging++)  
**100% funktionstüchtig** ✨

Bei Fragen oder Problemen: Logs checken! 📊

---

**Next Steps:** Jetzt kannst du weitere Features hinzufügen! 🚀
