# Bettinglabbot

## 🔧 CHANGELOG - Fixed Version

### ✅ Behobene Fehler

1. **invites.js - Race Condition Fix**
   - Invite-Cache wird nun NACH dem Vergleich aktualisiert
   - Verhindert Datenverlust bei langsamen API-Calls

2. **invites.js - Command-Router Fix**
   - `/betlabsend` ruft nicht mehr fälschlicherweise Ticket-Panel auf
   - Jeder Command wird korrekt geroutet

3. **tickets.js - Restart-Sicherheit**
   - Tickets werden nach Bot-Restart automatisch wiederhergestellt
   - `userTickets` Map wird beim Start neu befüllt

4. **logger.js - Besseres Error Handling**
   - Fehlgeschlagene Logs werden in Console ausgegeben
   - Keine stillen Fehler mehr

5. **automod.js - RAM-Optimierung**
   - Cleanup-Intervall von 60s auf 15s reduziert
   - Max 1000 User im Spam-Tracker (älteste werden gelöscht)

### 🆕 Neue Features

1. **Vollständiges Logging**
   - ✅ Embed-Sends werden geloggt
   - ✅ Stats-Updates werden geloggt (nur bei Änderung)
   - ✅ Unberechtigte Zugriffsversuche werden geloggt
   - ✅ Automod-Actions mit Nachrichteninhalt

2. **Log-Typen**
   - EMBED (Rosa) - Embed-Builder
   - STATS (Cyan) - Stats-Updates

### ⚙️ Installation

```bash
npm install
```

### 🔑 Umgebungsvariablen

```env
TOKEN=dein_discord_token
CLIENT_ID=deine_client_id
SUPABASE_URL=deine_supabase_url
SUPABASE_KEY=dein_supabase_key
```

### 🚀 Start

```bash
npm start
```

### 📊 Supabase Tabellen

**invites:**
```sql
CREATE TABLE invites (
  user_id TEXT PRIMARY KEY,
  normal INTEGER DEFAULT 0,
  betlab INTEGER DEFAULT 0
);
```

**join_tracker:**
```sql
CREATE TABLE join_tracker (
  member_id TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL,
  code TEXT NOT NULL,
  joined_at TIMESTAMP NOT NULL
);
```

### 🎯 Features

- ✅ Invite-Tracking (Normal & Betlab)
- ✅ Ticket-System mit Transcript
- ✅ Embed-Builder
- ✅ Automod (Spam, Links, Discord-Invites)
- ✅ Stats-Channels (Member/Betlab Count)
- ✅ Vollständiges Log-System
- ✅ Restart-sicher

### 📝 Commands

- `/betlabhelp` - Alle Commands
- `/betlabsend` - Embed Builder
- `/betlabsendticketpanel` - Ticket Panel
- `/betlabinvites [user]` - Invite Stats
- `/betlabranking` - Top 5 Ranking
- `/betlabsendbetlab` - Betlab Invites vergeben
- `/betlabinvitesedit` - Invites setzen
- `/betlabinviteclear` - Invites reset
- `/betlabclearchat` - Chat leeren

---

## 🐛 Bekannte Einschränkungen

- **stats.js** funktioniert nur für EINEN Server (hardcoded IDs)
- Wenn mehrere Server: Config in DB oder Umgebungsvariablen auslagern
