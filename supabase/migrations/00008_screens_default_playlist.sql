-- =============================================================================
-- Migration 00008: Add default_playlist_id to screens
-- Allows screens to have a fallback playlist when no schedule is active
-- =============================================================================

ALTER TABLE signage.screens
  ADD COLUMN IF NOT EXISTS default_playlist_id UUID REFERENCES signage.playlists(id) ON DELETE SET NULL;

-- Trigger to bump content_version when layout_zones change
CREATE OR REPLACE FUNCTION signage.bump_cv_on_zone_change()
RETURNS TRIGGER AS $$
DECLARE
  _screen_id UUID;
  _next_version INT;
BEGIN
  _screen_id := COALESCE(NEW.screen_id, OLD.screen_id);

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO _next_version
    FROM signage.content_versions
   WHERE screen_id = _screen_id;

  INSERT INTO signage.content_versions (screen_id, version_number, change_type, change_details)
  VALUES (_screen_id, _next_version, 'ZONE_UPDATE', jsonb_build_object('trigger', 'layout_zones'));

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER layout_zones_bump_cv
  AFTER INSERT OR UPDATE OR DELETE ON signage.layout_zones
  FOR EACH ROW EXECUTE FUNCTION signage.bump_cv_on_zone_change();
