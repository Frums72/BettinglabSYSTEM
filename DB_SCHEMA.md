# 📊 Supabase Datenbank Schema

## Neue Tabelle: `levels`

Diese Tabelle muss in Supabase erstellt werden!

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

-- Index für schnelle Queries
CREATE INDEX idx_levels_total_xp ON levels(total_xp DESC);
CREATE INDEX idx_levels_coins ON levels(coins DESC);
CREATE INDEX idx_levels_level ON levels(level DESC);
```

## Bestehende Tabellen

### `invites` (bereits vorhanden)
```sql
user_id TEXT PRIMARY KEY
normal INTEGER DEFAULT 0
betlab INTEGER DEFAULT 0
```

### `join_tracker` (bereits vorhanden)
```sql
member_id TEXT PRIMARY KEY
inviter_id TEXT
code TEXT
joined_at TIMESTAMPTZ
```

## Installation

1. Gehe zu deinem Supabase Projekt
2. Öffne den SQL Editor
3. Kopiere das SQL für die `levels` Tabelle
4. Führe es aus
5. Fertig!

## Level Rollen Config

In `levels.js` Zeile 17-24 findest du:

```javascript
const LEVEL_ROLES = {
  5:  "ROLE_ID_LEVEL_5",
  10: "ROLE_ID_LEVEL_10",
  25: "ROLE_ID_LEVEL_25",
  50: "ROLE_ID_LEVEL_50",
  75: "ROLE_ID_LEVEL_75",
  100: "ROLE_ID_LEVEL_100"
};
```

**Ersetze die IDs mit deinen echten Discord Rollen-IDs!**

Um Rollen-IDs zu bekommen:
1. Discord Developer Mode aktivieren
2. Rechtsklick auf Rolle → ID kopieren
3. In die Config eintragen
