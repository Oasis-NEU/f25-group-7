-- ── Nutrition Goals ─────────────────────────────────────────────────────────────
-- One row per user. Upserted on save so no duplicates.
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories_goal  INT  NOT NULL DEFAULT 2000,
  protein_goal   INT  NOT NULL DEFAULT 150,
  carbs_goal     INT  NOT NULL DEFAULT 250,
  fat_goal       INT  NOT NULL DEFAULT 65,
  fiber_goal     INT  NOT NULL DEFAULT 25,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── Food Logs ────────────────────────────────────────────────────────────────────
-- One row per logged food item per user per day.
CREATE TABLE IF NOT EXISTS food_logs (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at   DATE    NOT NULL DEFAULT CURRENT_DATE,
  meal_type   TEXT    NOT NULL DEFAULT 'other',   -- breakfast | lunch | dinner | snack | other
  food_name   TEXT    NOT NULL,
  calories    NUMERIC,
  protein_g   NUMERIC,
  carbs_g     NUMERIC,
  fat_g       NUMERIC,
  fiber_g     NUMERIC,
  sodium_mg   NUMERIC,
  sugar_g     NUMERIC,
  portion     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS food_logs_user_date ON food_logs(user_id, logged_at);

-- ── Row-Level Security ───────────────────────────────────────────────────────────
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals"
  ON nutrition_goals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own logs"
  ON food_logs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
