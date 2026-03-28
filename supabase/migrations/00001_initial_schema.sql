-- =============================================================================
-- ElevaSign Digital Signage - Initial Schema Migration
-- =============================================================================
-- Creates the "signage" schema with all core tables, indexes, RLS policies,
-- triggers, and helper functions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "moddatetime"; -- auto updated_at (Supabase built-in)

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS signage;

-- ---------------------------------------------------------------------------
-- 2. Helper: auto-update updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION signage.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2.1  profiles - Admin users linked to auth.users
-- ---------------------------------------------------------------------------
CREATE TABLE signage.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor'
              CHECK (role IN ('owner', 'editor', 'viewer')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.profiles IS 'Admin user profiles, one per auth.users row.';

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON signage.profiles
  FOR EACH ROW EXECUTE FUNCTION signage.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2.2  media_items - Uploaded media files
-- ---------------------------------------------------------------------------
CREATE TABLE signage.media_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_type        TEXT NOT NULL,          -- MIME type
  file_size_bytes  BIGINT NOT NULL,
  width            INT,
  height           INT,
  duration_seconds INT,
  sha256_hash      TEXT NOT NULL,
  thumbnail_path   TEXT,
  uploaded_by      UUID REFERENCES signage.profiles (id) ON DELETE SET NULL,
  tags             TEXT[],
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.media_items IS 'Uploaded images, videos, and HTML assets.';

CREATE TRIGGER media_items_updated_at
  BEFORE UPDATE ON signage.media_items
  FOR EACH ROW EXECUTE FUNCTION signage.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2.3  playlists - Content playlists
-- ---------------------------------------------------------------------------
CREATE TABLE signage.playlists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  transition_type       TEXT DEFAULT 'crossfade',
  transition_duration_ms INT DEFAULT 300,
  is_active             BOOLEAN DEFAULT true,
  created_by            UUID REFERENCES signage.profiles (id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.playlists IS 'Ordered collections of media for playback.';

CREATE TRIGGER playlists_updated_at
  BEFORE UPDATE ON signage.playlists
  FOR EACH ROW EXECUTE FUNCTION signage.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2.4  playlist_items - Many-to-many playlist <-> media with ordering
-- ---------------------------------------------------------------------------
CREATE TABLE signage.playlist_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id             UUID NOT NULL REFERENCES signage.playlists (id) ON DELETE CASCADE,
  media_item_id           UUID NOT NULL REFERENCES signage.media_items (id) ON DELETE CASCADE,
  sort_order              INT NOT NULL DEFAULT 0,
  display_duration_seconds INT NOT NULL DEFAULT 10,
  zone                    TEXT DEFAULT 'main',
  start_date              DATE,
  end_date                DATE,
  is_enabled              BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.playlist_items IS 'Junction table linking playlists to media with ordering and scheduling.';

-- ---------------------------------------------------------------------------
-- 2.5  screens - Physical display devices
-- ---------------------------------------------------------------------------
CREATE TABLE signage.screens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  pairing_code          TEXT UNIQUE,
  device_id             TEXT UNIQUE,
  fcm_token             TEXT,
  app_version           TEXT,
  os_version            TEXT,
  screen_resolution     TEXT,
  orientation           TEXT DEFAULT 'landscape',
  layout_template       TEXT DEFAULT 'fullscreen',
  content_manifest_hash TEXT,
  last_sync_at          TIMESTAMPTZ,
  last_heartbeat_at     TIMESTAMPTZ,
  is_online             BOOLEAN DEFAULT false,
  status                TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'offline', 'error')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.screens IS 'Registered physical display devices.';

CREATE TRIGGER screens_updated_at
  BEFORE UPDATE ON signage.screens
  FOR EACH ROW EXECUTE FUNCTION signage.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2.6  schedules - When playlists play on screens
-- ---------------------------------------------------------------------------
CREATE TABLE signage.schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id      UUID NOT NULL REFERENCES signage.screens (id) ON DELETE CASCADE,
  playlist_id    UUID NOT NULL REFERENCES signage.playlists (id) ON DELETE CASCADE,
  schedule_type  TEXT NOT NULL CHECK (schedule_type IN ('recurring', 'one_time')),
  priority       INT NOT NULL DEFAULT 0,
  days_of_week   INT[],         -- 0=Sun .. 6=Sat
  start_time     TIME,
  end_time       TIME,
  start_date     DATE,
  end_date       DATE,
  is_active      BOOLEAN DEFAULT true,
  name           TEXT,
  created_by     UUID REFERENCES signage.profiles (id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.schedules IS 'Rules determining when a playlist plays on a given screen.';

CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON signage.schedules
  FOR EACH ROW EXECUTE FUNCTION signage.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2.7  announcements - Emergency / overlay messages
-- ---------------------------------------------------------------------------
CREATE TABLE signage.announcements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  display_type   TEXT DEFAULT 'overlay'
                 CHECK (display_type IN ('overlay', 'fullscreen', 'ticker')),
  bg_color       TEXT DEFAULT '#DC2626',
  text_color     TEXT DEFAULT '#FFFFFF',
  priority       INT DEFAULT 100,
  target_screens UUID[],
  starts_at      TIMESTAMPTZ NOT NULL,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT true,
  created_by     UUID REFERENCES signage.profiles (id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.announcements IS 'Emergency or promotional overlay/fullscreen/ticker messages.';

-- ---------------------------------------------------------------------------
-- 2.8  layout_zones - Split screen zone definitions
-- ---------------------------------------------------------------------------
CREATE TABLE signage.layout_zones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id         UUID NOT NULL REFERENCES signage.screens (id) ON DELETE CASCADE,
  zone_name         TEXT NOT NULL,
  zone_type         TEXT NOT NULL CHECK (zone_type IN ('playlist', 'widget', 'html')),
  playlist_id       UUID REFERENCES signage.playlists (id) ON DELETE SET NULL,
  widget_config     JSONB,
  position_x_percent DECIMAL NOT NULL,
  position_y_percent DECIMAL NOT NULL,
  width_percent      DECIMAL NOT NULL,
  height_percent     DECIMAL NOT NULL,
  z_index           INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.layout_zones IS 'Split-screen zone definitions per screen.';

CREATE TRIGGER layout_zones_updated_at
  BEFORE UPDATE ON signage.layout_zones
  FOR EACH ROW EXECUTE FUNCTION signage.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2.9  device_heartbeats - Device health telemetry
-- ---------------------------------------------------------------------------
CREATE TABLE signage.device_heartbeats (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id          UUID NOT NULL REFERENCES signage.screens (id) ON DELETE CASCADE,
  wifi_signal_dbm    INT,
  free_storage_mb    INT,
  total_storage_mb   INT,
  current_playlist   TEXT,
  current_media_item TEXT,
  cpu_temp_celsius   DECIMAL,
  uptime_seconds     BIGINT,
  app_version        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.device_heartbeats IS 'Periodic health/telemetry pings from devices.';

-- ---------------------------------------------------------------------------
-- 2.10  device_commands - Remote command queue
-- ---------------------------------------------------------------------------
CREATE TABLE signage.device_commands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id     UUID NOT NULL REFERENCES signage.screens (id) ON DELETE CASCADE,
  command_type  TEXT NOT NULL
                CHECK (command_type IN (
                  'restart_app', 'reboot_device', 'update_app',
                  'take_screenshot', 'clear_cache', 'force_sync', 'set_volume'
                )),
  payload       JSONB,
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
  result        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at   TIMESTAMPTZ
);

COMMENT ON TABLE signage.device_commands IS 'Queue of remote commands sent to devices.';

-- ---------------------------------------------------------------------------
-- 2.11  content_versions - Delta sync versioning
-- ---------------------------------------------------------------------------
CREATE TABLE signage.content_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id       UUID NOT NULL REFERENCES signage.screens (id) ON DELETE CASCADE,
  version_number  BIGINT NOT NULL,
  change_type     TEXT NOT NULL,
  change_details  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE signage.content_versions IS 'Content change log used for delta sync on devices.';


-- =============================================================================
-- INDEXES
-- =============================================================================

-- profiles
CREATE INDEX idx_profiles_role ON signage.profiles (role);

-- media_items
CREATE INDEX idx_media_items_uploaded_by ON signage.media_items (uploaded_by);
CREATE INDEX idx_media_items_created_at  ON signage.media_items (created_at DESC);
CREATE INDEX idx_media_items_sha256      ON signage.media_items (sha256_hash);
CREATE INDEX idx_media_items_tags        ON signage.media_items USING GIN (tags);

-- playlists
CREATE INDEX idx_playlists_is_active   ON signage.playlists (is_active);
CREATE INDEX idx_playlists_created_by  ON signage.playlists (created_by);
CREATE INDEX idx_playlists_created_at  ON signage.playlists (created_at DESC);

-- playlist_items
CREATE INDEX idx_playlist_items_playlist_id   ON signage.playlist_items (playlist_id);
CREATE INDEX idx_playlist_items_media_item_id ON signage.playlist_items (media_item_id);
CREATE INDEX idx_playlist_items_sort_order    ON signage.playlist_items (playlist_id, sort_order);

-- screens
CREATE INDEX idx_screens_status       ON signage.screens (status);
CREATE INDEX idx_screens_is_online    ON signage.screens (is_online);
CREATE INDEX idx_screens_created_at   ON signage.screens (created_at DESC);

-- schedules
CREATE INDEX idx_schedules_screen_id    ON signage.schedules (screen_id);
CREATE INDEX idx_schedules_playlist_id  ON signage.schedules (playlist_id);
CREATE INDEX idx_schedules_is_active    ON signage.schedules (is_active);
CREATE INDEX idx_schedules_created_by   ON signage.schedules (created_by);

-- announcements
CREATE INDEX idx_announcements_is_active  ON signage.announcements (is_active);
CREATE INDEX idx_announcements_starts_at  ON signage.announcements (starts_at);
CREATE INDEX idx_announcements_created_by ON signage.announcements (created_by);

-- layout_zones
CREATE INDEX idx_layout_zones_screen_id   ON signage.layout_zones (screen_id);
CREATE INDEX idx_layout_zones_playlist_id ON signage.layout_zones (playlist_id);

-- device_heartbeats
CREATE INDEX idx_device_heartbeats_screen_id  ON signage.device_heartbeats (screen_id);
CREATE INDEX idx_device_heartbeats_created_at ON signage.device_heartbeats (created_at DESC);

-- device_commands
CREATE INDEX idx_device_commands_screen_id ON signage.device_commands (screen_id);
CREATE INDEX idx_device_commands_status    ON signage.device_commands (status);
CREATE INDEX idx_device_commands_created_at ON signage.device_commands (created_at DESC);

-- content_versions
CREATE INDEX idx_content_versions_screen_id      ON signage.content_versions (screen_id);
CREATE INDEX idx_content_versions_version_number ON signage.content_versions (screen_id, version_number DESC);
CREATE INDEX idx_content_versions_created_at     ON signage.content_versions (created_at DESC);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE signage.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.media_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.playlists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.playlist_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.screens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.announcements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.layout_zones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.device_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.device_commands   ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage.content_versions  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: check the current user's role in profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION signage.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM signage.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Policy: Service role bypass (for Edge Functions / server-side)
-- Supabase service_role key bypasses RLS by default, but explicit policies
-- ensure clarity.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Policy: Viewer role - SELECT only on all tables
-- ---------------------------------------------------------------------------
CREATE POLICY viewer_select_profiles          ON signage.profiles          FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_media_items       ON signage.media_items       FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_playlists         ON signage.playlists         FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_playlist_items    ON signage.playlist_items    FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_screens           ON signage.screens           FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_schedules         ON signage.schedules         FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_announcements     ON signage.announcements     FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_layout_zones      ON signage.layout_zones      FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_device_heartbeats ON signage.device_heartbeats FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_device_commands   ON signage.device_commands   FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));
CREATE POLICY viewer_select_content_versions  ON signage.content_versions  FOR SELECT USING (signage.current_user_role() IN ('owner', 'editor', 'viewer'));

-- ---------------------------------------------------------------------------
-- Policy: Admin (owner/editor) - INSERT, UPDATE, DELETE on all tables
-- ---------------------------------------------------------------------------

-- profiles
CREATE POLICY admin_insert_profiles ON signage.profiles FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor') OR auth.uid() = id);
CREATE POLICY admin_update_profiles ON signage.profiles FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor') OR auth.uid() = id);
CREATE POLICY admin_delete_profiles ON signage.profiles FOR DELETE USING  (signage.current_user_role() = 'owner');

-- media_items
CREATE POLICY admin_insert_media_items ON signage.media_items FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_media_items ON signage.media_items FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_media_items ON signage.media_items FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- playlists
CREATE POLICY admin_insert_playlists ON signage.playlists FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_playlists ON signage.playlists FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_playlists ON signage.playlists FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- playlist_items
CREATE POLICY admin_insert_playlist_items ON signage.playlist_items FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_playlist_items ON signage.playlist_items FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_playlist_items ON signage.playlist_items FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- screens
CREATE POLICY admin_insert_screens ON signage.screens FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_screens ON signage.screens FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_screens ON signage.screens FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- schedules
CREATE POLICY admin_insert_schedules ON signage.schedules FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_schedules ON signage.schedules FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_schedules ON signage.schedules FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- announcements
CREATE POLICY admin_insert_announcements ON signage.announcements FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_announcements ON signage.announcements FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_announcements ON signage.announcements FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- layout_zones
CREATE POLICY admin_insert_layout_zones ON signage.layout_zones FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_layout_zones ON signage.layout_zones FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_layout_zones ON signage.layout_zones FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- device_heartbeats
CREATE POLICY admin_insert_device_heartbeats ON signage.device_heartbeats FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_device_heartbeats ON signage.device_heartbeats FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_device_heartbeats ON signage.device_heartbeats FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- device_commands
CREATE POLICY admin_insert_device_commands ON signage.device_commands FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_device_commands ON signage.device_commands FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_device_commands ON signage.device_commands FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));

-- content_versions
CREATE POLICY admin_insert_content_versions ON signage.content_versions FOR INSERT WITH CHECK (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_update_content_versions ON signage.content_versions FOR UPDATE USING  (signage.current_user_role() IN ('owner', 'editor'));
CREATE POLICY admin_delete_content_versions ON signage.content_versions FOR DELETE USING  (signage.current_user_role() IN ('owner', 'editor'));


-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- =============================================================================
CREATE OR REPLACE FUNCTION signage.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO signage.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'editor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION signage.handle_new_user();


-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
-- Supabase storage buckets cannot be created via raw SQL. Create them via the
-- Supabase Dashboard (Storage section) or using the Management API / CLI:
--
--   1. "signage-media"   (public: false) - Original uploaded media files
--   2. "signage-thumbs"  (public: true)  - Generated thumbnails for admin UI
--
-- Example using supabase CLI in a seed script or via the JS client:
--
--   const { data, error } = await supabase.storage.createBucket('signage-media', {
--     public: false,
--     fileSizeLimit: 524288000,  -- 500 MB
--     allowedMimeTypes: ['image/*', 'video/*', 'text/html']
--   });
--
--   const { data, error } = await supabase.storage.createBucket('signage-thumbs', {
--     public: true,
--     fileSizeLimit: 5242880,    -- 5 MB
--     allowedMimeTypes: ['image/*']
--   });
--
-- After creating the buckets, add storage policies so authenticated users can
-- upload/download:
--
--   CREATE POLICY "Authenticated users can upload media"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'signage-media' AND auth.role() = 'authenticated');
--
--   CREATE POLICY "Authenticated users can read media"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'signage-media' AND auth.role() = 'authenticated');
--
--   CREATE POLICY "Public can read thumbnails"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'signage-thumbs');
-- =============================================================================

-- Done!
