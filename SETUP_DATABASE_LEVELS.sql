-- ═══════════════════════════════════════════════════════════════════════════
-- BETLAB BOT - LEVEL SYSTEM DATABASE SETUP
-- ═══════════════════════════════════════════════════════════════════════════
-- Führe dieses SQL in Supabase SQL Editor aus!
-- https://supabase.com → Dein Projekt → SQL Editor → RUN
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabelle erstellen (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS levels (
  user_id TEXT PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_levels_total_xp ON levels(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_levels_coins ON levels(coins DESC);
CREATE INDEX IF NOT EXISTS idx_levels_level ON levels(level DESC);

-- Auto-Update Timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_levels_updated_at ON levels;
CREATE TRIGGER update_levels_updated_at
BEFORE UPDATE ON levels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Testdaten (optional - zum Testen)
-- INSERT INTO levels (user_id, xp, level, coins, total_xp) 
-- VALUES ('123456789', 50, 5, 10, 550) 
-- ON CONFLICT (user_id) DO NOTHING;

-- Fertig! ✅
SELECT 'Levels Tabelle erfolgreich erstellt!' as status;
