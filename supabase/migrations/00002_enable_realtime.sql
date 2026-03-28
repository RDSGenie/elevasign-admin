-- Enable Realtime for key signage tables
-- The player subscribes to changes on these tables via Supabase Realtime

-- First, create a publication if it doesn't exist
DO $$
BEGIN
  -- Add tables to the supabase_realtime publication
  -- Supabase uses this publication by default for Realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE signage.playlists;
  ALTER PUBLICATION supabase_realtime ADD TABLE signage.playlist_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE signage.schedules;
  ALTER PUBLICATION supabase_realtime ADD TABLE signage.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE signage.screens;
  ALTER PUBLICATION supabase_realtime ADD TABLE signage.layout_zones;
  ALTER PUBLICATION supabase_realtime ADD TABLE signage.device_commands;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Table already in publication';
END $$;

-- Enable pg_cron for automated maintenance jobs
-- Note: pg_cron extension must be enabled in Supabase dashboard first

-- Heartbeat timeout: Mark screens offline if no heartbeat in 5 minutes
-- This would run as a pg_cron job (configured in Supabase dashboard):
-- Schedule: */2 * * * * (every 2 minutes)
-- SQL: UPDATE signage.screens SET is_online = false WHERE last_heartbeat_at < now() - interval '5 minutes' AND is_online = true;

-- Heartbeat cleanup: Delete old heartbeats (>7 days)
-- Schedule: 0 3 * * * (daily at 3:00 AM)
-- SQL: DELETE FROM signage.device_heartbeats WHERE created_at < now() - interval '7 days';

-- Media orphan cleanup: Delete unreferenced media after 30 days
-- Schedule: 0 4 * * * (daily at 4:00 AM)  
-- SQL: DELETE FROM signage.media_items WHERE id NOT IN (SELECT DISTINCT media_item_id FROM signage.playlist_items) AND created_at < now() - interval '30 days';
