# 🚨 WICHTIG - ZUERST LESEN! 🚨

## ⚠️ Problem: XP wird nicht gespeichert?

**Grund:** Die Supabase `levels` Tabelle existiert noch nicht!

---

## ✅ LÖSUNG (5 Minuten):

### **Schritt 1: Supabase öffnen**
1. Gehe zu https://supabase.com
2. Melde dich an
3. Öffne dein Projekt

### **Schritt 2: SQL Editor öffnen**
1. Linke Sidebar → **SQL Editor** klicken
2. "New Query" klicken

### **Schritt 3: SQL ausführen**
1. Öffne die Datei `SETUP_DATABASE_LEVELS.sql`
2. **KOMPLETTEN Inhalt kopieren**
3. In den SQL Editor einfügen
4. **RUN** klicken (rechts oben)

**Du solltest sehen:**
```
✅ Levels Tabelle erfolgreich erstellt!
```

### **Schritt 4: Überprüfen**
1. Linke Sidebar → **Table Editor**
2. Du solltest jetzt die Tabelle **`levels`** sehen

---

## 🔧 Alle konfigurierten Einstellungen:

### ✅ Level-Rollen (ALLE 25 eingetragen!)
```
Level 1   → 1504125201074487396
Level 2   → 1504131694301544528
Level 3   → 1504131724802527443
Level 4   → 1504132011227349102
Level 5   → 1504126007559585823
Level 10  → 1504126112136167705
Level 15  → 1504126199092215999
Level 20  → 1504126254822195211
Level 25  → 1504126314183921896
Level 30  → 1504126377442545704
Level 35  → 1504126440306638930
Level 40  → 1504126510737658069
Level 45  → 1504126572645322912
Level 50  → 1504126622167601152
Level 55  → 1504126685161722049
Level 60  → 1504126752677560471
Level 65  → 1504126832210088126
Level 70  → 1504126884827496548
Level 75  → 1504126937969328138
Level 80  → 1504130945731657829
Level 85  → 1504130989457149979
Level 90  → 1504131013247242424
Level 95  → 1504131034894045305
Level 100 → 1504131068641677494
```

### ✅ Level-Up Channel
```
Channel ID: 1504133135468728533
```

### ✅ Coin-Rewards
```
Level 1-4, 6-9, etc.  → 1 Coin
Jedes 5er Level       → 2 Coins
Level 25, 50, 75      → 5 Coins
Level 100             → 10 Coins
```

### ✅ XP-System
```
Pro Nachricht: 15 XP
Cooldown: 60 Sekunden
Coinflip Bonus: 5 XP pro gewonnenem Coin
```

### ✅ Team-Rolle (für Admin Commands)
```
Rollen-ID: 963870711678640188
```

---

## 🧪 Testen nach SQL-Setup:

### **1. Nachricht schreiben**
```
Schreibe eine Nachricht im Discord
→ Warte 1 Minute
→ Schreibe nochmal
→ Check: /betlabxp
```

**Sollte zeigen:**
```
Level: 0
XP: 30 / 100
Total XP: 30
```

### **2. Edit Command testen**
```
/betlabeditxp @User 1000
```

**Sollte zeigen:**
```
✅ XP von User auf 1000 gesetzt.
Neues Level: 10
```

### **3. Check in Supabase**
1. Table Editor → `levels` Tabelle
2. Du solltest Einträge sehen

---

## ❌ Falls es IMMER NOCH nicht funktioniert:

### **Check 1: Ist die Tabelle da?**
```sql
SELECT * FROM levels LIMIT 1;
```
Im SQL Editor ausführen.

**Fehler "relation levels does not exist"?**
→ SQL nochmal ausführen!

### **Check 2: Supabase Keys korrekt?**
Öffne `.env`:
```
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_KEY=dein_anon_key_hier
```

**Keys holen:**
1. Supabase → Project Settings
2. API
3. Kopiere "URL" und "anon/public" Key

### **Check 3: Bot Logs checken**
```bash
node index.js
```

Wenn du Fehler siehst wie:
```
relation "levels" does not exist
```
→ SQL nicht ausgeführt!

---

## 📋 Nach dem SQL-Setup sollte alles funktionieren:

✅ XP wird gespeichert
✅ Level-Ups werden erkannt
✅ Coins werden vergeben
✅ Rollen werden automatisch gegeben
✅ Rankings funktionieren

---

**Führe das SQL aus und teste dann!** 🚀

Bei Problemen: Screenshot vom Fehler schicken!
