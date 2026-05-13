# 🎮 LEVEL SYSTEM - Komplettübersicht

## ✨ Neue Features v2.1

### 📊 Progressives XP-System
- **Level 1-10:** 100 XP pro Level
- **Level 11-25:** 150 XP pro Level  
- **Level 26-50:** 200 XP pro Level
- **Level 51-75:** 300 XP pro Level
- **Level 76-100:** 500 XP pro Level

**Wird immer schwieriger!** 💪

### 🪙 Variable Coin-Rewards
- **Normale Levels (1-4, 6-9, etc.):** 1 Coin
- **Jedes 5er Level (5, 10, 15, 20...):** 2 Coins
- **Milestone Levels (25, 50, 75):** 5 Coins Bonus!
- **Level 100:** 10 Coins Mega-Bonus! 🎊

### 🎯 XP-Quellen
1. **Nachrichten:** 15 XP pro Message (60s Cooldown)
2. **Coinflip Gewinn:** 5 XP pro gewonnenem Coin! 🎲

**Mehr kommen bald:** Voice-Chat, Reactions, Events!

### 📢 Level-Up Channel
Alle Level-Ups werden in diesem Channel gepostet:
**Channel ID:** 1504133135468728533

Mit:
- ✅ User-Mention
- ✅ Level-Anzeige
- ✅ Coins-Belohnung
- ✅ Bonus-Text bei Special Levels
- ✅ Schönes Embed

### 🎁 Automatische Rollen
**ALLE Levels haben eine Rolle (1-100)!**

Die Rollen sind FERTIG konfiguriert:
- Level 1-4: Einzelne Rollen
- Level 5, 10, 15, 20, 25... bis 100
- Level 100 = Maximale Rolle! 👑

Rollen werden **automatisch** vergeben + DM-Benachrichtigung

---

## 📋 Commands

### Für Alle:
- `/betlabcoins [user]` - Coins, Level, XP, Progress
- `/betlabxp [user]` - Detaillierte XP-Stats mit Progress Bar
- `/betlabcoinflip <anzahl>` - Glücksspiel mit BONUS XP bei Gewinn!
- `/betlabtop` - Top 10 Level Ranking
- `/betlabcointop` - Top 10 Coins Ranking

### Für Team:
- `/betlabeditcoins <user> <anzahl>` - Coins manuell setzen

---

## 🎲 Coinflip System

```
/betlabcoinflip 50
```

- **50/50 Chance**
- **Gewinn:** +50 Coins + **250 XP Bonus!** 🎁
- **Verlust:** -50 Coins
- Wird geloggt!

---

## 📈 Level-Beispiele

### Level 1 → 2
- Benötigt: 100 XP
- Bei 15 XP/Message: ~7 Nachrichten
- Reward: 1 Coin

### Level 5
- Benötigt: 100 XP (von Level 4)
- Reward: **2 Coins** (5er Milestone)
- **Neue Rolle!**

### Level 25
- Benötigt: 150 XP (von Level 24)
- Reward: **5 Coins Bonus!** 🎁
- **Neue Rolle!**

### Level 100
- Benötigt: 500 XP (von Level 99)
- Reward: **10 Coins Mega-Bonus!** 🎊👑
- **Maximale Rolle!**

---

## 🔧 Technische Details

### Datenbank
Tabelle: `levels`
- user_id (PRIMARY KEY)
- xp (aktuelle XP im Level)
- level (0-100)
- coins (Gesamt-Coins)
- total_xp (alle jemals erhaltenen XP)

### Performance
- XP-Cooldowns im RAM (kein DB-Spam)
- Effiziente XP-Berechnung
- Indexes für schnelle Rankings

### Logging
Alle Level-Ups werden geloggt mit:
- User
- Level-Wechsel
- Coins-Reward
- Timestamp

---

## 💡 Zukünftige Features (Ideen)

### Mehr XP-Quellen:
- 🎤 **Voice-Chat:** XP pro Minute in Voice
- 👍 **Reactions:** XP für Reactions auf eigene Posts
- 🎯 **Daily Quests:** Tägliche Challenges
- 🎪 **Events:** Spezial-Events mit Bonus-XP
- 🎁 **Giveaways:** Teilnahme gibt XP

### Mehr Gamble-Features:
- 🎰 **Slots:** 3-Reel Slot Machine
- 🃏 **Blackjack:** Gegen den Bot spielen
- 🎲 **Dice:** Würfelspiele
- 🏇 **Races:** Wetten auf Ergebnisse

### Coin-Shop:
- 🎨 **Custom Roles:** Coins für eigene Rolle
- 🏆 **Exklusive Rollen:** Spezielle Cosmetics
- 📝 **Custom Commands:** Eigene Commands kaufen
- 🎁 **Boosts:** XP-Boosts kaufen

---

**Version:** 2.1 PERFECT
**Status:** ✅ Ready to Deploy
**Alle Bugs:** GEFIXT!

Viel Spaß! 🚀🎮
