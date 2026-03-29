-- =============================================================================
-- Migration 00004: Content version trigger + Building branding settings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. bump_content_version() – fires when playlist_items change
--    Inserts a content_versions row for every screen that has an active
--    schedule referencing the affected playlist.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION signage.bump_content_version()
RETURNS TRIGGER AS $$
DECLARE
  affected_playlist_id UUID;
  rec RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_playlist_id := OLD.playlist_id;
  ELSE
    affected_playlist_id := NEW.playlist_id;
  END IF;

  FOR rec IN
    SELECT DISTINCT screen_id
    FROM signage.schedules
    WHERE playlist_id = affected_playlist_id
      AND is_active = TRUE
  LOOP
    INSERT INTO signage.content_versions
      (screen_id, version_number, change_type, change_details)
    VALUES (
      rec.screen_id,
      COALESCE(
        (SELECT MAX(version_number) + 1
           FROM signage.content_versions
          WHERE screen_id = rec.screen_id),
        1
      ),
      TG_OP,
      jsonb_build_object(
        'playlist_id', affected_playlist_id,
        'source_table', TG_TABLE_NAME,
        'operation', TG_OP
      )
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS playlist_items_content_version ON signage.playlist_items;
CREATE TRIGGER playlist_items_content_version
  AFTER INSERT OR UPDATE OR DELETE ON signage.playlist_items
  FOR EACH ROW EXECUTE FUNCTION signage.bump_content_version();

-- ---------------------------------------------------------------------------
-- 2. bump_content_version_on_schedule() – fires when a schedule changes
--    so the screen knows to re-sync immediately when its playlist assignment
--    is updated.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION signage.bump_content_version_on_schedule()
RETURNS TRIGGER AS $$
DECLARE
  affected_screen_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_screen_id := OLD.screen_id;
  ELSE
    affected_screen_id := NEW.screen_id;
  END IF;

  INSERT INTO signage.content_versions
    (screen_id, version_number, change_type, change_details)
  VALUES (
    affected_screen_id,
    COALESCE(
      (SELECT MAX(version_number) + 1
         FROM signage.content_versions
        WHERE screen_id = affected_screen_id),
      1
    ),
    TG_OP,
    jsonb_build_object(
      'source_table', 'schedules',
      'operation', TG_OP,
      'playlist_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.playlist_id ELSE NEW.playlist_id END
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS schedules_content_version ON signage.schedules;
CREATE TRIGGER schedules_content_version
  AFTER INSERT OR UPDATE OR DELETE ON signage.schedules
  FOR EACH ROW EXECUTE FUNCTION signage.bump_content_version_on_schedule();

-- ---------------------------------------------------------------------------
-- 3. building_settings – singleton row for branding/config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signage.building_settings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_name  TEXT NOT NULL DEFAULT 'My Building',
  tagline        TEXT,
  logo_url       TEXT,
  primary_color  TEXT NOT NULL DEFAULT '#6366f1',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.building_settings IS 'Singleton row for building branding and global config.';

-- Enforce single row
CREATE UNIQUE INDEX IF NOT EXISTS building_settings_singleton
  ON signage.building_settings ((TRUE));

-- Seed default row if not present
INSERT INTO signage.building_settings (building_name)
VALUES ('My Building')
ON CONFLICT DO NOTHING;

-- updated_at trigger
DROP TRIGGER IF EXISTS building_settings_updated_at ON signage.building_settings;
CREATE TRIGGER building_settings_updated_at
  BEFORE UPDATE ON signage.building_settings
  FOR EACH ROW EXECUTE FUNCTION signage.set_updated_at();

-- RLS
ALTER TABLE signage.building_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "building_settings_select" ON signage.building_settings;
CREATE POLICY "building_settings_select"
  ON signage.building_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "building_settings_update" ON signage.building_settings;
CREATE POLICY "building_settings_update"
  ON signage.building_settings FOR UPDATE
  TO authenticated
  USING (signage.current_user_role() IN ('owner', 'editor'))
  WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
