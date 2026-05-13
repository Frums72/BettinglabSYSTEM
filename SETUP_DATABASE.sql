-- ===================================================================
-- BETLAB BOT - DATABASE SETUP (Supabase)
-- Version 2.0 - Level & Economy System
-- ===================================================================

-- ─── 1. LEVELS TABELLE ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS levels (
  user_id TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  coins INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für Leaderboard Queries
CREATE INDEX IF NOT EXISTS idx_levels_ranking 
ON levels(level DESC, xp DESC);

-- Auto-Update Timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_levels_updated_at 
BEFORE UPDATE ON levels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. PRÜFEN OB ALTE TABELLEN EXISTIEREN ──────────────────────────

-- Falls du bereits invites & join_tracker hast, musst du nichts ändern!
-- Diese Queries erstellen sie nur wenn sie NICHT existieren:

CREATE TABLE IF NOT EXISTS invites (
  user_id TEXT PRIMARY KEY,
  normal INTEGER NOT NULL DEFAULT 0,
  betlab INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS join_tracker (
  member_id TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL,
  code TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- FERTIG! 🎉
-- ===================================================================

-- WICHTIG: Row Level Security (RLS) Settings
-- Falls du RLS aktiviert hast, erstelle Policies:

-- Beispiel Policy (passe sie an deine Bedürfnisse an):
-- ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON levels FOR ALL USING (true);

-- ===================================================================
-- TESTEN
-- ===================================================================

-- Teste ob alles funktioniert:
SELECT * FROM levels LIMIT 1;
SELECT * FROM invites LIMIT 1;
SELECT * FROM join_tracker LIMIT 1;

-- Wenn keine Fehler kommen: Alles bereit! ✅
