-- =============================================================================
-- pg_cron Jobs for ElevaSign
-- Run this in Supabase Dashboard → SQL Editor AFTER enabling the pg_cron
-- extension in: Dashboard → Database → Extensions → pg_cron
-- =============================================================================

-- Mark screens offline when no heartbeat for > 10 minutes (every 2 min)
SELECT cron.schedule(
  'mark-screens-offline',
  '*/2 * * * *',
  $$
    UPDATE signage.screens
    SET    is_online = FALSE
    WHERE  is_online = TRUE
      AND  (
             last_heartbeat_at IS NULL
             OR last_heartbeat_at < NOW() - INTERVAL '10 minutes'
           );
  $$
);

-- Clean heartbeat records older than 7 days (3 AM daily)
SELECT cron.schedule(
  'clean-old-heartbeats',
  '0 3 * * *',
  $$
    DELETE FROM signage.device_heartbeats
    WHERE created_at < NOW() - INTERVAL '7 days';
  $$
);

-- Deactivate expired announcements (every 5 minutes)
SELECT cron.schedule(
  'deactivate-expired-announcements',
  '*/5 * * * *',
  $$
    UPDATE signage.announcements
    SET    is_active = FALSE
    WHERE  is_active = TRUE
      AND  expires_at IS NOT NULL
      AND  expires_at < NOW();
  $$
);

-- Clean old completed/failed device commands (4 AM daily)
SELECT cron.schedule(
  'clean-old-commands',
  '0 4 * * *',
  $$
    DELETE FROM signage.device_commands
    WHERE  status IN ('completed', 'failed')
      AND  created_at < NOW() - INTERVAL '30 days';
  $$
);
