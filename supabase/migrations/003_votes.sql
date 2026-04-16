-- ── Votes ──────────────────────────────────────────────────────────────────────
-- One row per vote cast.
-- - Community totals = COUNT(*) by location (all time, cumulative)
-- - User lock       = UNIQUE(user_id, vote_date, meal_period) — DB-enforced,
--                     survives device/browser changes
CREATE TABLE IF NOT EXISTS votes (
  id          UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_date   DATE     NOT NULL DEFAULT CURRENT_DATE,
  meal_period TEXT     NOT NULL CHECK (meal_period IN ('breakfast', 'lunch', 'dinner')),
  location    TEXT     NOT NULL CHECK (location    IN ('steast', 'iv')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, vote_date, meal_period)
);

-- Required for Realtime DELETE events to carry the full old row
ALTER TABLE votes REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS votes_date_idx ON votes(vote_date);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Any logged-in user may read all votes (needed for community totals)
CREATE POLICY "Authenticated users view all votes"
  ON votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users may only insert their own vote rows
CREATE POLICY "Users insert own votes"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users may delete only their own vote rows (undo)
CREATE POLICY "Users delete own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);
