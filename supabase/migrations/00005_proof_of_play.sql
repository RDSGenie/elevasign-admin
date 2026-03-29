-- =============================================================================
-- Migration 00005: Proof of play analytics
-- Logs every time a media item finishes playing on a screen.
-- The Android player calls player-log-play after each item completes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS signage.play_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id       UUID NOT NULL REFERENCES signage.screens (id) ON DELETE CASCADE,
  media_item_id   UUID REFERENCES signage.media_items (id) ON DELETE SET NULL,
  playlist_id     UUID REFERENCES signage.playlists (id) ON DELETE SET NULL,
  played_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms     INT,         -- actual play duration in ms
  completed       BOOLEAN NOT NULL DEFAULT TRUE  -- false if interrupted
);

COMMENT ON TABLE signage.play_logs IS 'Proof-of-play log: one row per media item played on a screen.';

CREATE INDEX idx_play_logs_screen_id   ON signage.play_logs (screen_id);
CREATE INDEX idx_play_logs_played_at   ON signage.play_logs (played_at DESC);
CREATE INDEX idx_play_logs_media_item  ON signage.play_logs (media_item_id);

-- RLS: players insert via service role (Edge Function), admins read only
ALTER TABLE signage.play_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "play_logs_select"
  ON signage.play_logs FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT policy for authenticated users -- inserts come via Edge Function with service role

-- pg_cron: prune play_logs older than 90 days (add to pg_cron_jobs.sql for manual apply)
-- SELECT cron.schedule('clean-old-play-logs', '0 5 * * *',
--   $$ DELETE FROM signage.play_logs WHERE played_at < NOW() - INTERVAL '90 days'; $$);
