# 🚨 INSTALLATION - SCHRITT FÜR SCHRITT

## ⚠️ WICHTIG: Bot muss KOMPLETT gestoppt sein!

### 1️⃣ Bot stoppen

**Auf deinem Server:**
```bash
# Strg + C im Terminal wo der Bot läuft
# ODER
pm2 stop index
# ODER  
pkill -f "node index.js"
```

**Warte bis "Stopped" erscheint!**

---

### 2️⃣ BACKUP erstellen (Sicherheit!)

```bash
# Dein aktuelles Bot-Verzeichnis umbenennen
mv /pfad/zu/deinem/bot /pfad/zu/deinem/bot-BACKUP
```

Beispiel:
```bash
mv ~/discord-bot ~/discord-bot-BACKUP
```

---

### 3️⃣ Neue Dateien hochladen

1. **ZIP entpacken** auf deinem PC
2. **ALLE Dateien hochladen** zu deinem Server
3. In das neue Verzeichnis wechseln

```bash
cd /pfad/zu/deinem/neuen/bot
```

---

### 4️⃣ Umgebungsvariablen kopieren

```bash
# Kopiere .env aus dem Backup
cp /pfad/zu/deinem/bot-BACKUP/.env .
```

Oder erstelle neu:
```bash
nano .env
```

Inhalt:
```
TOKEN=dein_bot_token_hier
CLIENT_ID=deine_client_id_hier
SUPABASE_URL=deine_supabase_url
SUPABASE_KEY=dein_supabase_key
```

**Strg + X → Y → Enter** zum Speichern

---

### 5️⃣ Dependencies installieren

```bash
npm install
```

**Warte bis "added X packages" erscheint!**

---

### 6️⃣ Supabase - NEUE TABELLE erstellen

1. Gehe zu https://supabase.com
2. Öffne dein Projekt
3. Klicke **SQL Editor**
4. Kopiere DIESEN Code:

```sql
CREATE TABLE IF NOT EXISTS levels (
  user_id TEXT PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_levels_total_xp ON levels(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_levels_coins ON levels(coins DESC);
CREATE INDEX IF NOT EXISTS idx_levels_level ON levels(level DESC);
```

5. **RUN** klicken
6. Warte auf "Success"

---

### 7️⃣ Level-Rollen konfigurieren (OPTIONAL aber empfohlen)

Öffne `levels.js` und ändere Zeile 17-24:

**Vorher:**
```javascript
const LEVEL_ROLES = {
  5:  "ROLE_ID_LEVEL_5",
  10: "ROLE_ID_LEVEL_10",
  // ...
};
```

**Nachher (mit DEINEN Rollen-IDs):**
```javascript
const LEVEL_ROLES = {
  5:  "1234567890123456789",  // Deine Level 5 Rolle
  10: "1234567890123456789",  // Deine Level 10 Rolle
  25: "1234567890123456789",  // Deine Level 25 Rolle
  50: "1234567890123456789",  // Deine Level 50 Rolle
  75: "1234567890123456789",  // Deine Level 75 Rolle
  100: "1234567890123456789"  // Deine Level 100 Rolle
};
```

**Rollen-ID bekommen:**
- Discord Developer Mode aktivieren (Einstellungen → Erweitert)
- Rechtsklick auf Rolle → ID kopieren

**Wenn du KEINE Level-Rollen willst:**
Lösche einfach die Zeilen 17-24 und ersetze mit:
```javascript
const LEVEL_ROLES = {};
```

---

### 8️⃣ Bot starten

```bash
node index.js
```

**Du solltest sehen:**
```
Registriere Commands...
✅ 20 Commands registriert!
🚀 Online als BettingLab#9514
```

**KEIN Fehler!**

---

### 9️⃣ Testen

1. Schreibe eine Nachricht im Discord
2. Warte 1 Minute
3. Schreibe nochmal → **Du solltest XP bekommen!**
4. Teste `/betlabcoins` → Sollte deine Stats zeigen

---

## 🆘 Wenn es IMMER NOCH crasht:

### Check 1: Richtige Node Version?
```bash
node --version
```
**Sollte sein:** v16.x oder höher

### Check 2: Dependencies installiert?
```bash
ls node_modules/ | wc -l
```
**Sollte sein:** > 50

### Check 3: .env Datei vorhanden?
```bash
cat .env
```
**Sollte zeigen:** TOKEN, CLIENT_ID, SUPABASE_URL, SUPABASE_KEY

### Check 4: Supabase Verbindung?
```bash
node -e "const s = require('./db'); console.log('DB OK')"
```
**Sollte zeigen:** "DB OK"

---

## 📝 Wenn DU den Fehler siehst:

**Mache Screenshot vom KOMPLETTEN Fehler** und schick ihn mir!

---

## ✅ Erfolgs-Checkliste:

- [ ] Bot gestoppt
- [ ] Backup erstellt
- [ ] Neue Dateien hochgeladen
- [ ] .env kopiert/erstellt
- [ ] npm install ausgeführt
- [ ] Supabase Tabelle erstellt
- [ ] (Optional) Level-Rollen konfiguriert
- [ ] Bot gestartet
- [ ] Keine Fehler im Log
- [ ] Commands funktionieren

**Dann bist du fertig!** 🎉
