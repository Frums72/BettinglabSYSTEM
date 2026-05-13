# 🚀 BETLAB BOT v2.0 - MEGA UPDATE!

## ✨ Neue Features

### 🎮 **Level System (1-100)**
- XP bei jeder Nachricht (15 XP, 60s Cooldown)
- Automatische Level-Up Benachrichtigung mit schönem Embed
- 1 Coin pro Level-Up
- Automatische Rollen-Vergabe bei bestimmten Levels (5, 10, 25, 50, 75, 100)
- Progress Bar und detaillierte Stats

### 🪙 **Coins System**
- `/betlabcoins [user]` - Zeigt Coins, Level, XP, Progress
- `/betlabxp [user]` - Detaillierte XP-Anzeige mit Progress Bar
- `/betlabcoinflip <anzahl>` - Coinflip Glücksspiel (50/50 Chance)
- `/betlabeditcoins <user> <anzahl>` - Coins editieren (Team only)
- `/betlabtop` - Top 10 Level Ranking
- `/betlabcointop` - Top 10 Coins Ranking

### 🛡️ **Moderation Commands (mit LOGGING!)**
- `/betlabban <user> [grund] [tage]` - User bannen
- `/betlabtimeout <user> <minuten> [grund]` - User timeouten
- `/betlabkick <user> [grund]` - User kicken
- `/betlabunban <userid> [grund]` - User entbannen
- **Alle Actions werden geloggt!**
- User bekommen DM-Benachrichtigung

---

## 📦 Installation

### 1. Dateien ersetzen
Ersetze ALLE Dateien mit den neuen aus diesem ZIP.

### 2. Supabase - Neue Tabelle erstellen
Siehe `DB_SCHEMA.md` für das SQL!

```sql
CREATE TABLE levels (
  user_id TEXT PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Level-Rollen konfigurieren
In `levels.js` Zeile 17-24:

```javascript
const LEVEL_ROLES = {
  5:  "DEINE_ROLE_ID_HIER",
  10: "DEINE_ROLE_ID_HIER",
  25: "DEINE_ROLE_ID_HIER",
  50: "DEINE_ROLE_ID_HIER",
  75: "DEINE_ROLE_ID_HIER",
  100: "DEINE_ROLE_ID_HIER"
};
```

**So bekommst du Rollen-IDs:**
1. Discord Developer Mode aktivieren
2. Rechtsklick auf Rolle → ID kopieren
3. Eintragen

### 4. Help Command updaten
Siehe `HELP_UPDATE.txt` für den neuen Help-Text!

### 5. Bot neustarten
```bash
npm start
```

---

## 🎯 Wie funktioniert das Level System?

### XP Gain
- **15 XP pro Nachricht**
- **60 Sekunden Cooldown** (verhindert Spam)
- Bots werden ignoriert

### Level Berechnung
- **Level 1:** 100 XP benötigt
- **Level 2:** 200 XP benötigt
- **Level 3:** 300 XP benötigt
- **Level X:** X * 100 XP benötigt
- **Max Level:** 100

### Rewards
- **1 Coin** pro Level-Up
- **Rollen** bei Level 5, 10, 25, 50, 75, 100
- **DM-Benachrichtigung** bei Rollen-Freischaltung

### Level-Up Nachricht
Erscheint automatisch im Channel wo die Person schreibt:
```
🎉 LEVEL UP!
Username ist aufgestiegen!

📊 Level: 5 → 6
🪙 Coins: +1 (Gesamt: 6)

Weiter so! 💪
```

---

## 🪙 Coinflip System

```
/betlabcoinflip 50
```

- 50/50 Chance zu gewinnen
- Bei Gewinn: +50 Coins
- Bei Verlust: -50 Coins
- Wird geloggt!

---

## 📊 Was wird ALLES geloggt?

### Alte Logs (bereits vorhanden)
✅ Bot Start/Stop
✅ Join/Leave mit Invite-Info
✅ Ticket Create/Claim/Priority/Close
✅ Invites Edit/Reset/Betlab-Vergabe
✅ Chat Clear

### Neue Logs (v2.0)
✅ **Level-Ups** (User, Level, Coins)
✅ **Level-Rollen vergeben** (User, Level, Rolle)
✅ **Coinflips** (User, Einsatz, Ergebnis, Balance)
✅ **Coins editiert** (Ziel, Vorher/Nachher)
✅ **Ban** (Ziel, Grund, Nachrichten-Löschung)
✅ **Timeout** (Ziel, Dauer, Grund)
✅ **Kick** (Ziel, Grund)
✅ **Unban** (User ID, Grund)
✅ **Embed gesendet** (Titel, Channel)
✅ **Unberechtigte Zugriffe** (User, Command)

---

## 🎮 Alle Commands

### 📝 GENERAL
- `/betlabhelp` - Commands anzeigen
- `/betlabsend` - Embed Builder
- `/betlabsendticketpanel` - Ticket Panel

### 🎟️ INVITES
- `/betlabinvites [user]` - Invite Stats
- `/betlabranking` - Top 5 Invites
- `/betlabsendbetlab <user> <anzahl>` - Betlab Invites vergeben
- `/betlabinvitesedit <user> <typ> <anzahl>` - Invites setzen
- `/betlabinviteclear <user>` - Invites reset

### 🎮 LEVEL & COINS
- `/betlabcoins [user]` - Coins & Level anzeigen
- `/betlabxp [user]` - XP Stats anzeigen
- `/betlabcoinflip <anzahl>` - Coinflip Glücksspiel
- `/betlabeditcoins <user> <anzahl>` - Coins setzen (Team)
- `/betlabtop` - Top 10 Level Ranking
- `/betlabcointop` - Top 10 Coins Ranking

### 🛡️ MODERATION (Team)
- `/betlabban <user> [grund] [tage]` - User bannen
- `/betlabtimeout <user> <minuten> [grund]` - User timeouten
- `/betlabkick <user> [grund]` - User kicken
- `/betlabunban <userid> [grund]` - User entbannen
- `/betlabclearchat <anzahl>` - Nachrichten löschen

---

## 🔧 Config Checklist

### Alle IDs prüfen:
- [ ] `levels.js` → LEVEL_ROLES (Zeile 17-24)
- [ ] `stats.js` → CATEGORY_ID, MEMBER_CHANNEL, BETLAB_CHANNEL, ROLE_BETLAB, ROLE_MEMBER
- [ ] `tickets.js` → CATEGORY_ID, SUPPORT_ROLE_ID
- [ ] `logger.js` → LOG_CHANNEL_ID
- [ ] `invites.js`, `embedbuilder.js`, `automod.js`, `moderation.js` → TEAM_ROLE_ID

### DB Schema:
- [ ] Neue `levels` Tabelle erstellt (siehe DB_SCHEMA.md)
- [ ] Indexes erstellt

### Bot Permissions:
- [ ] Ban Members
- [ ] Kick Members
- [ ] Moderate Members (Timeout)
- [ ] Manage Messages
- [ ] Read Message History
- [ ] Send Messages

---

## 🎉 Features von v1.0 (bereits enthalten)

✅ Invite Tracking mit DB-Persistenz
✅ Ticket System mit Restart-Recovery
✅ Embed Builder
✅ Automod (Spam, Links, Discord Invites)
✅ Stats Channels
✅ Vollständiges Logging
✅ Permission Checks überall

---

## 📈 Performance

- **Level System:** 60s Cooldown verhindert DB-Spam
- **Automod:** 15s Cleanup-Intervall
- **Caching:** Invite Cache, XP Cooldowns in-memory
- **DB:** Supabase mit Indexes für schnelle Queries

---

## 🆘 Support & Bugs

Bei Problemen:
1. Console-Output checken
2. Log-Channel checken
3. DB-Connection prüfen
4. IDs in Config prüfen

---

**Version:** 2.0
**Datum:** 2026
**Status:** ✅ Production Ready

**Viel Spaß mit dem Level System! 🎮🚀**
