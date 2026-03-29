-- =============================================================================
-- Migration 00003: RLS for layout_zones and device_commands
-- NOTE: pg_cron jobs must be applied separately in Supabase Dashboard → SQL
-- Editor after enabling the pg_cron extension (Extensions tab).
-- See: supabase/scripts/pg_cron_jobs.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS for layout_zones
-- ---------------------------------------------------------------------------
ALTER TABLE signage.layout_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "layout_zones_authenticated" ON signage.layout_zones;
CREATE POLICY "layout_zones_authenticated"
  ON signage.layout_zones
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Enable RLS for device_commands
-- ---------------------------------------------------------------------------
ALTER TABLE signage.device_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_commands_authenticated" ON signage.device_commands;
CREATE POLICY "device_commands_authenticated"
  ON signage.device_commands
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
